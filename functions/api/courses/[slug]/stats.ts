import { getAuthUser } from '../../../_shared/auth';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, params, env }) => {
  const slug = params.slug as string;

  const stats = (await env.DB.prepare(
    'SELECT views, likes FROM course_stats WHERE course_slug = ?',
  )
    .bind(slug)
    .first<{ views: number; likes: number }>()) ?? { views: 0, likes: 0 };

  let userLiked = false;
  const user = await getAuthUser(request, env.DB);
  if (user) {
    const like = await env.DB.prepare(
      'SELECT rowid FROM course_likes WHERE user_id = ? AND course_slug = ?',
    )
      .bind(user.id, slug)
      .first();
    userLiked = !!like;
  }

  return Response.json({ ...stats, userLiked });
};
