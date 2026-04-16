import { getAuthUser } from '../../_shared/auth';

interface Env {
  DB: D1Database;
}

// GET: retrieve teacher earnings summary
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || user.role !== 'teacher') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const earningsResult = await env.DB.prepare(
      `SELECT total_earned, total_withdrawn, available_balance FROM teacher_earnings WHERE teacher_id = ?`
    ).bind(user.id).first<{
      total_earned: number;
      total_withdrawn: number;
      available_balance: number;
    }>();

    if (!earningsResult) {
      return Response.json({
        total_earned: 0,
        total_withdrawn: 0,
        available_balance: 0,
        recent_transactions: []
      });
    }

    // Get recent transactions
    const transactionsResult = await env.DB.prepare(
      `SELECT rt.created_at, rt.final_amount, rt.teacher_payout, c.title as course_title
       FROM revenue_transactions rt
       JOIN courses c ON rt.course_id = c.id
       WHERE rt.teacher_id = ?
       ORDER BY rt.created_at DESC
       LIMIT 10`
    ).bind(user.id).all<{
      created_at: string;
      final_amount: number;
      teacher_payout: number;
      course_title: string;
    }>();

    return Response.json({
      total_earned: earningsResult.total_earned,
      total_withdrawn: earningsResult.total_withdrawn,
      available_balance: earningsResult.available_balance,
      recent_transactions: transactionsResult.results
    });
  } catch (error) {
    console.error('Error fetching teacher earnings:', error);
    return Response.json({ error: 'Failed to fetch earnings' }, { status: 500 });
  }
};