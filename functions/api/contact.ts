import { sendEmail, EmailEnv, textToHtml } from '../_shared/email';

interface Env extends EmailEnv {
  DB: D1Database;
  SUPPORT_INBOX_EMAIL?: string;
}

const SUPPORT_FALLBACK = 'support@kambiacademy.com';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json<{
    name?: string;
    email?: string;
    company?: string;
    topic?: string;
    message?: string;
  }>();

  const { name, email, message } = body;

  if (!name || !email || !message) {
    return Response.json(
      { error: 'name, email, and message are required.' },
      { status: 400 },
    );
  }

  const result = await env.DB.prepare(
    "INSERT INTO contact_submissions (name, email, company, topic, message, status) VALUES (?, ?, ?, ?, ?, 'new')",
  )
    .bind(name, email, body.company ?? '', body.topic ?? '', message)
    .run();

  // Best-effort: drop a copy in the support mailbox so staff are notified even
  // before they open the dashboard inbox. Never blocks the user's submission.
  const supportInbox = env.SUPPORT_INBOX_EMAIL || SUPPORT_FALLBACK;
  const summary = `New contact message from ${name} <${email}>\n${body.topic ? `Topic: ${body.topic}\n` : ''}${body.company ? `Company: ${body.company}\n` : ''}\n${message}`;
  try {
    await sendEmail(env, {
      to: supportInbox,
      replyTo: email,
      subject: `New contact message from ${name}`,
      text: summary,
      html: textToHtml(summary),
    });
  } catch {
    // ignore — submission is already saved
  }

  return Response.json(
    {
      id: String(result.meta.last_row_id),
      message: 'Thank you for reaching out. We will respond within 24 hours.',
    },
    { status: 201 },
  );
};
