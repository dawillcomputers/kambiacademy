interface Env {
  DB: D1Database;
}

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
    'INSERT INTO contact_submissions (name, email, company, topic, message) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(name, email, body.company ?? '', body.topic ?? '', message)
    .run();

  return Response.json(
    {
      id: String(result.meta.last_row_id),
      message: 'Thank you for reaching out. We will respond within 24 hours.',
    },
    { status: 201 },
  );
};
