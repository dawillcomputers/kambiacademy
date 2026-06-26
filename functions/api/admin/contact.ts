import { getAuthUser, isFullAdmin } from '../../_shared/auth';
import { sendEmail, EmailEnv, textToHtml } from '../../_shared/email';

interface Env extends EmailEnv {
  DB: D1Database;
}

// GET /api/admin/contact — list contact submissions with their reply threads.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || !isFullAdmin(user)) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { results: submissions } = await env.DB.prepare(
    `SELECT id, name, email, company, topic, message, status, created_at, replied_at
     FROM contact_submissions
     ORDER BY (status = 'new') DESC, created_at DESC
     LIMIT 200`,
  ).all<any>();

  const ids = (submissions || []).map((s: any) => s.id);
  let repliesBySubmission: Record<number, any[]> = {};
  if (ids.length) {
    const placeholders = ids.map(() => '?').join(',');
    const { results: replies } = await env.DB.prepare(
      `SELECT id, submission_id, body, emailed, email_error, created_by, created_at
       FROM contact_replies
       WHERE submission_id IN (${placeholders})
       ORDER BY created_at ASC`,
    ).bind(...ids).all<any>();

    repliesBySubmission = (replies || []).reduce((acc: Record<number, any[]>, reply: any) => {
      (acc[reply.submission_id] ||= []).push(reply);
      return acc;
    }, {});
  }

  const counts = await env.DB.prepare(
    `SELECT
       COALESCE(SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END), 0) AS newCount,
       COUNT(*) AS total
     FROM contact_submissions`,
  ).first<{ newCount: number; total: number }>();

  return Response.json({
    submissions: (submissions || []).map((s: any) => ({
      ...s,
      replies: repliesBySubmission[s.id] || [],
    })),
    stats: { newCount: Number(counts?.newCount || 0), total: Number(counts?.total || 0) },
  });
};

// POST /api/admin/contact — reply to a submission (saves thread + emails sender).
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || !isFullAdmin(user)) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json<{ submission_id?: number; message?: string }>().catch(() => null);
  const submissionId = Number(body?.submission_id);
  const replyText = (body?.message || '').trim();

  if (!submissionId || !replyText) {
    return Response.json({ error: 'submission_id and message are required.' }, { status: 400 });
  }

  const submission = await env.DB.prepare(
    'SELECT id, name, email, topic FROM contact_submissions WHERE id = ?',
  ).bind(submissionId).first<{ id: number; name: string; email: string; topic: string }>();

  if (!submission) {
    return Response.json({ error: 'Submission not found.' }, { status: 404 });
  }

  // Send the email (best-effort — the reply is recorded regardless).
  const emailResult = await sendEmail(env, {
    to: submission.email,
    replyTo: env.CONTACT_FROM_EMAIL || 'support@kambiacademy.com',
    subject: `Re: ${submission.topic ? submission.topic : 'Your message to Kambi Academy'}`,
    text: `Hi ${submission.name},\n\n${replyText}\n\n— Kambi Academy Support`,
    html: textToHtml(`Hi ${submission.name},\n\n${replyText}\n\n— Kambi Academy Support`),
  });

  const now = new Date().toISOString();
  const inserted = await env.DB.prepare(
    `INSERT INTO contact_replies (submission_id, body, emailed, email_error, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(submissionId, replyText, emailResult.sent ? 1 : 0, emailResult.error ?? null, user.email, now)
    .run();

  await env.DB.prepare(
    "UPDATE contact_submissions SET status = 'replied', replied_at = ? WHERE id = ?",
  ).bind(now, submissionId).run();

  return Response.json({
    success: true,
    reply: {
      id: inserted.meta.last_row_id,
      submission_id: submissionId,
      body: replyText,
      emailed: emailResult.sent ? 1 : 0,
      email_error: emailResult.error ?? null,
      created_by: user.email,
      created_at: now,
    },
    emailSent: emailResult.sent,
    emailError: emailResult.error ?? null,
  });
};

// PATCH /api/admin/contact — change a submission's status (e.g. resolve / reopen).
export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || !isFullAdmin(user)) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json<{ submission_id?: number; status?: string }>().catch(() => null);
  const submissionId = Number(body?.submission_id);
  const status = body?.status;

  if (!submissionId || !status || !['new', 'replied', 'resolved'].includes(status)) {
    return Response.json({ error: 'submission_id and a valid status are required.' }, { status: 400 });
  }

  await env.DB.prepare('UPDATE contact_submissions SET status = ? WHERE id = ?')
    .bind(status, submissionId).run();

  return Response.json({ success: true });
};
