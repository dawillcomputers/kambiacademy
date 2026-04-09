import { getAuthUser } from '../_shared/auth';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const body = await request.json<{ courseSlug?: string }>();
  if (!body.courseSlug) {
    return Response.json({ error: 'courseSlug is required.' }, { status: 400 });
  }

  const existing = await env.DB.prepare(
    'SELECT id FROM enrollments WHERE user_id = ? AND course_slug = ?',
  )
    .bind(user.id, body.courseSlug)
    .first();

  if (existing) {
    return Response.json({ message: 'Already enrolled.' });
  }

  await env.DB.prepare(
    'INSERT INTO enrollments (user_id, course_slug, amount_paid) VALUES (?, ?, 0)',
  )
    .bind(user.id, body.courseSlug)
    .run();

  return Response.json({ message: 'Enrolled successfully.' }, { status: 201 });
};
