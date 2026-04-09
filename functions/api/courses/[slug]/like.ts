import { getAuthUser } from '../../../_shared/auth';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, params, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const slug = params.slug as string;

  const existing = await env.DB.prepare(
    'SELECT rowid FROM course_likes WHERE user_id = ? AND course_slug = ?',
  )
    .bind(user.id, slug)
    .first();

  if (existing) {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM course_likes WHERE user_id = ? AND course_slug = ?').bind(user.id, slug),
      env.DB.prepare('UPDATE course_stats SET likes = MAX(0, likes - 1) WHERE course_slug = ?').bind(slug),
    ]);
    return Response.json({ liked: false });
  } else {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO course_likes (user_id, course_slug) VALUES (?, ?)').bind(user.id, slug),
      env.DB.prepare(
        `INSERT INTO course_stats (course_slug, views, likes) VALUES (?, 0, 1)
         ON CONFLICT(course_slug) DO UPDATE SET likes = likes + 1`,
      ).bind(slug),
    ]);
    return Response.json({ liked: true });
  }
};
