import { getAuthUser } from '../../_shared/auth';

interface Env {
  DB: D1Database;
}

// POST: record a revenue transaction when student enrolls/pays for a course
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || user.role !== 'student') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json<{
    course_id: string;
    teacher_id: number;
    base_amount: number;
    location_markup_percentage?: number;
    student_country?: string;
  }>();

  if (!body.course_id || !body.teacher_id || !body.base_amount) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const locationMarkup = body.location_markup_percentage || 0;
  const finalAmount = body.base_amount * (1 + locationMarkup / 100);
  const platformFee = finalAmount * 0.80; // Platform gets 80%
  const teacherPayout = finalAmount * 0.20; // Teacher gets 20%

  try {
    // Record transaction
    const txResult = await env.DB.prepare(
      `INSERT INTO revenue_transactions 
       (student_id, course_id, teacher_id, base_amount, location_markup_percentage, final_amount, platform_fee, teacher_payout, student_country)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      user.id,
      body.course_id,
      body.teacher_id,
      body.base_amount,
      locationMarkup,
      finalAmount,
      platformFee,
      teacherPayout,
      body.student_country || null
    ).run();

    // Update teacher earnings
    await env.DB.prepare(
      `INSERT INTO teacher_earnings (teacher_id, total_earned, available_balance)
       VALUES (?, ?, ?)
       ON CONFLICT(teacher_id) DO UPDATE SET
       total_earned = total_earned + ?,
       available_balance = available_balance + ?`
    ).bind(
      body.teacher_id,
      teacherPayout,
      teacherPayout,
      teacherPayout,
      teacherPayout
    ).run();

    return Response.json(
      { 
        success: true, 
        transaction_id: txResult.meta.last_row_id,
        final_amount: finalAmount,
        platform_fee: platformFee,
        teacher_payout: teacherPayout
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error recording revenue:', error);
    return Response.json({ error: 'Failed to record transaction' }, { status: 500 });
  }
};

// GET: retrieve teacher earnings and withdrawal history
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || user.role !== 'teacher') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get earnings summary
    const earningsResult = await env.DB.prepare(
      `SELECT total_earned, total_withdrawn, available_balance FROM teacher_earnings WHERE teacher_id = ?`
    ).bind(user.id).first<{
      total_earned: number;
      total_withdrawn: number;
      available_balance: number;
    }>();

    // Get recent transactions
    const transactionsResult = await env.DB.prepare(
      `SELECT rt.* FROM revenue_transactions rt
       WHERE rt.teacher_id = ? 
       ORDER BY rt.created_at DESC LIMIT 100`
    ).bind(user.id).all();

    // Get withdrawal history
    const withdrawalsResult = await env.DB.prepare(
      `SELECT * FROM teacher_withdrawals WHERE teacher_id = ? ORDER BY requested_at DESC`
    ).bind(user.id).all();

    return Response.json({
      earnings: earningsResult || { total_earned: 0, total_withdrawn: 0, available_balance: 0 },
      transactions: transactionsResult?.results || [],
      withdrawals: withdrawalsResult?.results || []
    });
  } catch (error) {
    console.error('Error fetching earnings:', error);
    return Response.json({ error: 'Failed to fetch earnings' }, { status: 500 });
  }
};
