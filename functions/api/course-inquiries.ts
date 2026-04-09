interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json<{
    name?: string;
    email?: string;
    organization?: string;
    courseSlug?: string;
    goals?: string;
    startWindow?: string;
  }>();

  const { name, email, courseSlug } = body;

  if (!name || !email || !courseSlug) {
    return Response.json(
      { error: 'name, email, and courseSlug are required.' },
      { status: 400 },
    );
  }

  const result = await env.DB.prepare(
    'INSERT INTO course_inquiries (name, email, organization, course_slug, goals, start_window) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(
      name,
      email,
      body.organization ?? '',
      courseSlug,
      body.goals ?? '',
      body.startWindow ?? '',
    )
    .run();

  return Response.json(
    {
      id: String(result.meta.last_row_id),
      message: 'Your inquiry has been received. Our admissions team will be in touch shortly.',
    },
    { status: 201 },
  );
};
