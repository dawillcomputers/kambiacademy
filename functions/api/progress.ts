import { getAuthUser } from '../_shared/auth';

interface Env {
  DB: D1Database;
}

// GET: load progress for a course (or all courses)
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');

  if (slug) {
    const row = await env.DB.prepare(
      'SELECT * FROM course_progress WHERE user_id = ? AND course_slug = ?',
    ).bind(user.id, slug).first();
    return Response.json({ progress: row || null });
  }

  const q = await env.DB.prepare(
    'SELECT * FROM course_progress WHERE user_id = ?',
  ).bind(user.id).all();
  return Response.json({ progress: q.results });
};

// POST: save progress
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json<{
    course_slug?: string;
    module_index?: number;
    section_id?: string;
    progress_pct?: number;
  }>();

  if (!body.course_slug) {
    return Response.json({ error: 'course_slug is required.' }, { status: 400 });
  }

  await env.DB.prepare(
    `INSERT INTO course_progress (user_id, course_slug, module_index, section_id, progress_pct, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, course_slug) DO UPDATE SET
       module_index = excluded.module_index,
       section_id = excluded.section_id,
       progress_pct = excluded.progress_pct,
       updated_at = datetime('now')`,
  )
    .bind(
      user.id,
      body.course_slug,
      body.module_index ?? 0,
      body.section_id || null,
      body.progress_pct ?? 0,
    )
    .run();

  return Response.json({ message: 'Progress saved.' });
};
