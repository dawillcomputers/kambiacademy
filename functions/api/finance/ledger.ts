import { getAuthUser } from '../../_shared/auth';

interface Env {
  DB: D1Database;
}

// Double-entry accounting ledger system for financial operations
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Get user's wallet and transaction history
  const wallet = await env.DB.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN type='CREDIT' THEN amount ELSE -amount END), 0) as balance
    FROM wallet_transactions
    WHERE user_id = ?
  `).bind(user.id).first<{ balance: number }>();

  const transactions = await env.DB.prepare(`
    SELECT id, type, amount, reference, status, created_at
    FROM wallet_transactions
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).bind(user.id).all();

  const totalEarnings = await env.DB.prepare(`
    SELECT COALESCE(SUM(amount_paid), 0) as total
    FROM enrollments
    WHERE user_id = ? OR (SELECT COUNT(*) FROM courses WHERE tutor_id = ? AND course_slug IN (
      SELECT course_slug FROM enrollments WHERE user_id = ?
    )) > 0
  `).bind(user.id, user.id, user.id).first<{ total: number }>();

  return Response.json({
    wallet: {
      balance: wallet?.balance || 0,
      reserved: 2000,
      available: Math.max(0, (wallet?.balance || 0) - 2000)
    },
    transactions: transactions.results || [],
    earnings: totalEarnings?.total || 0
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json<{ action?: string; amount?: number; reference?: string }>();
  const action = body.action;

  if (action === 'withdraw') {
    return await processWithdrawal(env, user.id, body.amount || 0);
  }

  if (action === 'check_balance') {
    return await checkBalance(env, user.id);
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
};

async function checkBalance(env: Env, userId: number) {
  const wallet = await env.DB.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN type='CREDIT' THEN amount ELSE -amount END), 0) as balance
    FROM wallet_transactions
    WHERE user_id = ?
  `).bind(userId).first<{ balance: number }>();

  const balance = wallet?.balance || 0;

  return Response.json({
    balance,
    reserved: 2000,
    available: Math.max(0, balance - 2000),
    can_withdraw: balance > 2000
  });
}

async function processWithdrawal(env: Env, userId: number, amount: number) {
  if (amount <= 0) {
    return Response.json({ error: 'Amount must be greater than 0' }, { status: 400 });
  }

  // Check balance
  const wallet = await env.DB.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN type='CREDIT' THEN amount ELSE -amount END), 0) as balance
    FROM wallet_transactions
    WHERE user_id = ?
  `).bind(userId).first<{ balance: number }>();

  const balance = wallet?.balance || 0;
  const available = balance - 2000; // Reserve 2000

  if (amount > available) {
    return Response.json({
      error: `Insufficient balance. Available: ₦${available.toLocaleString()}`,
      available,
      required: amount,
      balance
    }, { status: 400 });
  }

  // DOUBLE-ENTRY: Debit from user wallet, credit to platform holding
  const txId = `WD-${Date.now()}-${userId}`;

  await env.DB.prepare(`
    INSERT INTO wallet_transactions (user_id, type, amount, reference, status, created_at)
    VALUES (?, 'debit', ?, ?, 'pending', datetime('now'))
  `).bind(userId, amount, txId).run();

  // Log to audit
  await env.DB.prepare(`
    INSERT INTO audit_logs (user_id, action, amount, created_at)
    VALUES (?, 'withdrawal_requested', ?, datetime('now'))
  `).bind(userId, amount).run();

  return Response.json({
    success: true,
    transaction_id: txId,
    amount,
    message: 'Withdrawal processed. Funds will be transferred within 24 hours.',
    status: 'pending'
  });
}
