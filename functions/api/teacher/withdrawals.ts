import { getAuthUser } from '../../_shared/auth';

interface Env {
  DB: D1Database;
}

// POST: request a withdrawal
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || user.role !== 'teacher') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json<{
    amount: number;
    payment_method: string;
    account_details: string;
  }>();

  if (!body.amount || body.amount <= 0) {
    return Response.json({ error: 'Invalid amount' }, { status: 400 });
  }

  try {
    // Check available balance
    const earningsResult = await env.DB.prepare(
      `SELECT available_balance FROM teacher_earnings WHERE teacher_id = ?`
    ).bind(user.id).first<{ available_balance: number }>();

    if (!earningsResult || earningsResult.available_balance < body.amount) {
      return Response.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Create withdrawal request
    const withdrawalResult = await env.DB.prepare(
      `INSERT INTO teacher_withdrawals
       (teacher_id, amount, payment_method, account_details, status)
       VALUES (?, ?, ?, ?, 'pending')`
    ).bind(
      user.id,
      body.amount,
      body.payment_method,
      body.account_details
    ).run();

    // Update available balance (hold the amount)
    await env.DB.prepare(
      `UPDATE teacher_earnings
       SET available_balance = available_balance - ?
       WHERE teacher_id = ?`
    ).bind(body.amount, user.id).run();

    return Response.json(
      {
        success: true,
        withdrawal_id: withdrawalResult.meta.last_row_id,
        message: 'Withdrawal request submitted successfully'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating withdrawal request:', error);
    return Response.json({ error: 'Failed to create withdrawal request' }, { status: 500 });
  }
};

// GET: retrieve withdrawal history
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || user.role !== 'teacher') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const withdrawalsResult = await env.DB.prepare(
      `SELECT id, amount, payment_method, status, created_at, processed_at
       FROM teacher_withdrawals
       WHERE teacher_id = ?
       ORDER BY created_at DESC`
    ).bind(user.id).all();

    return Response.json({
      withdrawals: withdrawalsResult.results
    });
  } catch (error) {
    console.error('Error fetching withdrawal history:', error);
    return Response.json({ error: 'Failed to fetch withdrawal history' }, { status: 500 });
  }
};