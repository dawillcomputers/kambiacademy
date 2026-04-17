import { getAuthUser } from '../../_shared/auth';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Only super_admin can use AI commands
  if (user.role !== 'super_admin') {
    return Response.json({ error: 'Only super admins can use AI commands' }, { status: 403 });
  }

  const body = await request.json<{ command?: string }>();
  const cmd = (body.command || '').toLowerCase().trim();

  if (!cmd) {
    return Response.json({ error: 'Command cannot be empty' }, { status: 400 });
  }

  try {
    // PRICE OPTIMIZER
    if (cmd.includes('increase') && cmd.includes('price')) {
      const result = await optimizePrices(env);
      return Response.json(result);
    }

    // COURSE PAUSER - pause low performing courses
    if (cmd.includes('pause') && (cmd.includes('low') || cmd.includes('course'))) {
      const result = await pauseLowCourses(env);
      return Response.json(result);
    }

    // TUTOR RISK FLAGGING
    if (cmd.includes('flag') || cmd.includes('ban')) {
      const result = await flagRiskyTutors(env);
      return Response.json(result);
    }

    // REVENUE REPORT
    if (cmd.includes('revenue') || cmd.includes('report')) {
      const result = await getRevenueReport(env);
      return Response.json(result);
    }

    // FRAUD ALERTS
    if (cmd.includes('fraud') || cmd.includes('alert')) {
      const result = await getFraudAlerts(env);
      return Response.json(result);
    }

    // SYSTEM STATUS
    if (cmd.includes('status') || cmd.includes('health')) {
      const result = await getSystemStatus(env);
      return Response.json(result);
    }

    return Response.json({
      message: 'Command not recognized',
      suggestions: [
        'Try: "increase prices"',
        'Try: "pause low courses"',
        'Try: "flag tutors"',
        'Try: "revenue report"',
        'Try: "fraud alerts"',
        'Try: "system status"'
      ]
    });

  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
};

async function optimizePrices(env: Env) {
  const lowEnrollmentCourses = await env.DB.prepare(`
    SELECT id, price FROM courses WHERE enrollments < 5
  `).all();

  let updated = 0;
  for (const course of lowEnrollmentCourses.results || []) {
    await env.DB.prepare(`
      UPDATE courses SET price = price * 1.1 WHERE id = ?
    `).bind(course.id).run();
    updated++;
  }

  return {
    action: 'price_increased',
    affected_courses: updated,
    result: `✅ Increased prices for ${updated} low-enrollment courses by 10%`
  };
}

async function pauseLowCourses(env: Env) {
  const result = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM courses WHERE rating < 2.5 AND status = 'approved'
  `).first<{ count: number }>();

  const count = result?.count || 0;

  if (count > 0) {
    await env.DB.prepare(`
      UPDATE courses SET status = 'paused' WHERE rating < 2.5 AND status = 'approved'
    `).run();
  }

  return {
    action: 'courses_paused',
    paused_count: count,
    result: `⏸️ Paused ${count} courses with rating below 2.5`
  };
}

async function flagRiskyTutors(env: Env) {
  const riskyTutors = await env.DB.prepare(`
    SELECT u.id, u.name, u.email, COUNT(DISTINCT c.id) as course_count, AVG(c.rating) as avg_rating
    FROM users u
    LEFT JOIN courses c ON c.tutor_id = u.id
    WHERE u.role = 'teacher'
    GROUP BY u.id
    HAVING avg_rating < 2.5 OR course_count = 0
  `).all();

  const tutors = riskyTutors.results || [];

  for (const t of tutors) {
    await env.DB.prepare(`
      UPDATE users SET status = 'flagged' WHERE id = ?
    `).bind(t.id).run();
  }

  return {
    action: 'tutors_flagged',
    flagged_count: tutors.length,
    result: `🚩 Flagged ${tutors.length} tutors with low performance`
  };
}

async function getRevenueReport(env: Env) {
  const stats = await env.DB.prepare(`
    SELECT 
      COUNT(DISTINCT u.id) as total_users,
      COUNT(DISTINCT e.id) as total_enrollments,
      COALESCE(SUM(e.amount_paid), 0) as total_revenue
    FROM users u
    LEFT JOIN enrollments e ON e.user_id = u.id
  `).first<any>();

  return {
    action: 'revenue_report',
    data: stats,
    result: `💰 Revenue Report:\n- Users: ${stats?.total_users || 0}\n- Enrollments: ${stats?.total_enrollments || 0}\n- Total Revenue: ₦${(stats?.total_revenue || 0).toLocaleString()}`
  };
}

async function getFraudAlerts(env: Env) {
  const fraudUsers = await env.DB.prepare(`
    SELECT id, name, email FROM users WHERE status = 'fraud_flagged' LIMIT 10
  `).all();

  const users = fraudUsers.results || [];

  return {
    action: 'fraud_alerts',
    alert_count: users.length,
    users: users,
    result: `🚨 Fraud Alerts: ${users.length} users flagged for suspicious activity`
  };
}

async function getSystemStatus(env: Env) {
  const users = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>();
  const courses = await env.DB.prepare('SELECT COUNT(*) as count FROM courses').first<{ count: number }>();
  const enrollments = await env.DB.prepare('SELECT COUNT(*) as count FROM enrollments').first<{ count: number }>();

  return {
    action: 'system_status',
    status: 'OPERATIONAL',
    metrics: {
      users: users?.count || 0,
      courses: courses?.count || 0,
      enrollments: enrollments?.count || 0,
      timestamp: new Date().toISOString()
    },
    result: `✅ System Status: OPERATIONAL\n- Users: ${users?.count || 0}\n- Courses: ${courses?.count || 0}\n- Enrollments: ${enrollments?.count || 0}`
  };
}
