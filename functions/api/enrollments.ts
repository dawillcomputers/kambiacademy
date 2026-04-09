import { getAuthUser } from '../_shared/auth';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { results } = await env.DB.prepare(
    'SELECT course_slug, amount_paid, created_at FROM enrollments WHERE user_id = ?',
  )
    .bind(user.id)
    .all<{ course_slug: string; amount_paid: number; created_at: string }>();

  return Response.json({ enrollments: results });
};
