import { getAuthUser } from '../../_shared/auth';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || user.role !== 'super_admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Get flagged users with risk scores
  const fraudUsers = await env.DB.prepare(`
    SELECT id, name, email, role, status, created_at
    FROM users
    WHERE status = 'fraud_flagged'
    ORDER BY created_at DESC
    LIMIT 50
  `).all();

  // Scan for risky transactions
  const suspiciousTransactions = await env.DB.prepare(`
    SELECT 
      u.id, u.name, u.email,
      COUNT(*) as transaction_count,
      SUM(CASE WHEN type='credit' THEN amount ELSE 0 END) as total_credits,
      SUM(CASE WHEN type='debit' THEN amount ELSE 0 END) as total_debits
    FROM wallet_transactions wt
    JOIN users u ON wt.user_id = u.id
    WHERE wt.created_at > datetime('now', '-7 days')
    GROUP BY u.id
    HAVING transaction_count > 20 OR total_debits > total_credits * 2
    ORDER BY transaction_count DESC
  `).all();

  // High-risk tutors (low rating, many refunds)
  const riskTutors = await env.DB.prepare(`
    SELECT 
      u.id, u.name, u.email, 
      COUNT(DISTINCT c.id) as course_count,
      AVG(c.rating) as avg_rating,
      COUNT(CASE WHEN e.refund_status='completed' THEN 1 END) as refund_count
    FROM users u
    LEFT JOIN courses c ON c.tutor_id = u.id
    LEFT JOIN enrollments e ON c.id = e.course_id
    WHERE u.role = 'teacher'
    GROUP BY u.id
    HAVING avg_rating < 2.5 OR refund_count > 3
    ORDER BY avg_rating ASC
  `).all();

  return Response.json({
    flagged_users_count: fraudUsers.results?.length || 0,
    suspicious_transactions_count: suspiciousTransactions.results?.length || 0,
    high_risk_tutors_count: riskTutors.results?.length || 0,
    flagged_users: fraudUsers.results || [],
    suspicious_transactions: suspiciousTransactions.results || [],
    high_risk_tutors: riskTutors.results || []
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || user.role !== 'super_admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json<{ action?: string; target_user_id?: number; reason?: string }>();

  if (body.action === 'flag') {
    return await flagUserForFraud(env, body.target_user_id || 0, body.reason);
  }

  if (body.action === 'unflag') {
    return await unflagUser(env, body.target_user_id || 0);
  }

  if (body.action === 'scan_all') {
    return await scanAllUsers(env);
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
};

async function calculateRiskScore(env: Env, userId: number): Promise<number> {
  let score = 0;

  // Low rating check
  const tutorData = await env.DB.prepare(`
    SELECT AVG(rating) as avg_rating FROM courses WHERE tutor_id = ?
  `).bind(userId).first<{ avg_rating: number }>();

  if ((tutorData?.avg_rating || 0) < 2.5) score += 30;
  if ((tutorData?.avg_rating || 0) < 2.0) score += 20;

  // Refund abuse
  const refunds = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM enrollments 
    WHERE user_id = ? AND refund_status = 'completed'
  `).bind(userId).first<{ count: number }>();

  if ((refunds?.count || 0) > 3) score += 25;
  if ((refunds?.count || 0) > 5) score += 10;

  // Unusual transaction patterns
  const txData = await env.DB.prepare(`
    SELECT 
      COUNT(*) as tx_count,
      SUM(CASE WHEN type='credit' THEN amount ELSE 0 END) as credits,
      SUM(CASE WHEN type='debit' THEN amount ELSE 0 END) as debits
    FROM wallet_transactions
    WHERE user_id = ? AND created_at > datetime('now', '-7 days')
  `).bind(userId).first<{ tx_count: number; credits: number; debits: number }>();

  if ((txData?.tx_count || 0) > 20) score += 15;
  if ((txData?.debits || 0) > (txData?.credits || 0) * 2) score += 20;

  // Multiple rapid transactions
  const rapidTx = await env.DB.prepare(`
    SELECT COUNT(*) as count 
    FROM wallet_transactions
    WHERE user_id = ? AND created_at > datetime('now', '-1 hour')
  `).bind(userId).first<{ count: number }>();

  if ((rapidTx?.count || 0) > 5) score += 15;

  return Math.min(100, score);
}

async function flagUserForFraud(env: Env, targetUserId: number, reason?: string) {
  const riskScore = await calculateRiskScore(env, targetUserId);

  // Update user status
  await env.DB.prepare(`
    UPDATE users SET status = 'fraud_flagged' WHERE id = ?
  `).bind(targetUserId).run();

  // Log fraud incident
  await env.DB.prepare(`
    INSERT INTO fraud_logs (user_id, type, severity, reason, created_at)
    VALUES (?, 'admin_flag', 'high', ?, datetime('now'))
  `).bind(targetUserId, reason || 'Manual admin flag').run();

  return Response.json({
    success: true,
    user_id: targetUserId,
    risk_score: riskScore,
    message: `User flagged for fraud. Risk score: ${riskScore}/100`,
    action_taken: 'user_suspended'
  });
}

async function unflagUser(env: Env, targetUserId: number) {
  await env.DB.prepare(`
    UPDATE users SET status = 'active' WHERE id = ?
  `).bind(targetUserId).run();

  return Response.json({
    success: true,
    user_id: targetUserId,
    message: 'User fraud flag removed'
  });
}

async function scanAllUsers(env: Env) {
  const users = await env.DB.prepare(`
    SELECT id FROM users
  `).all<{ id: number }>();

  let flaggedCount = 0;

  for (const u of users.results || []) {
    const score = await calculateRiskScore(env, u.id);

    if (score > 70) {
      await env.DB.prepare(`
        UPDATE users SET status = 'fraud_flagged' WHERE id = ?
      `).bind(u.id).run();

      await env.DB.prepare(`
        INSERT INTO fraud_logs (user_id, type, severity, reason, created_at)
        VALUES (?, 'auto_flag', 'high', ?, datetime('now'))
      `).bind(u.id, `Automatic fraud scan - Risk score: ${score}/100`).run();

      flaggedCount++;
    }
  }

  return Response.json({
    success: true,
    total_scanned: users.results?.length || 0,
    flagged_count: flaggedCount,
    message: `Fraud scan completed. ${flaggedCount} users flagged.`
  });
}
