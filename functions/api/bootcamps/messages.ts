import { getAuthUser } from '../../_shared/auth';
import { canViewBootcamp, canManageBootcamp } from '../../_shared/bootcamp';

interface Env {
  DB: D1Database;
}

// GET /api/bootcamps/messages?bootcamp=ID&after=ID — group chat for the cohort.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const bootcampId = Number(url.searchParams.get('bootcamp'));
  const after = Number(url.searchParams.get('after')) || 0;
  if (!bootcampId) return Response.json({ error: 'A bootcamp id is required.' }, { status: 400 });
  if (!(await canViewBootcamp(env.DB, user, bootcampId))) {
    return Response.json({ error: 'You are not enrolled in this bootcamp.' }, { status: 403 });
  }

  const { results } = await env.DB.prepare(
    `SELECT id, user_id, user_name, user_role, body, created_at
     FROM bootcamp_messages WHERE bootcamp_id = ? AND id > ?
     ORDER BY id ASC LIMIT 200`,
  ).bind(bootcampId, after).all();

  return Response.json({ messages: results, me: user.id });
};

// POST /api/bootcamps/messages — send a message to the cohort chat.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json<{ bootcamp_id?: number; body?: string }>();
  if (!body.bootcamp_id || !body.body?.trim()) {
    return Response.json({ error: 'A message is required.' }, { status: 400 });
  }
  if (!(await canViewBootcamp(env.DB, user, body.bootcamp_id))) {
    return Response.json({ error: 'You are not enrolled in this bootcamp.' }, { status: 403 });
  }

  const text = body.body.trim().slice(0, 2000);
  const role = (await canManageBootcamp(env.DB, user, body.bootcamp_id)) ? 'manager' : (user.role || 'student');
  const result = await env.DB.prepare(
    'INSERT INTO bootcamp_messages (bootcamp_id, user_id, user_name, user_role, body) VALUES (?, ?, ?, ?, ?)',
  ).bind(body.bootcamp_id, user.id, user.name || '', role, text).run();

  return Response.json({ id: result.meta.last_row_id }, { status: 201 });
};
