import { getAuthUser } from '../../_shared/auth';

interface Env {
  DB: D1Database;
}

// GET: get invite info
export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const code = params.code as string;

  const cls = await env.DB.prepare(`
    SELECT pc.id, pc.title, pc.description, pc.max_students, u.name as tutor_name,
      (SELECT COUNT(*) FROM private_class_members WHERE class_id = pc.id) as member_count
    FROM private_classes pc JOIN users u ON pc.tutor_id = u.id
    WHERE pc.invite_code = ?
  `).bind(code).first();

  if (!cls) return Response.json({ error: 'Invalid invite code.' }, { status: 404 });

  return Response.json({ class: cls });
};

// POST: join private class
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const code = params.code as string;
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'You must be logged in to join a class.' }, { status: 401 });

  const cls = await env.DB.prepare(
    'SELECT id, max_students FROM private_classes WHERE invite_code = ?',
  ).bind(code).first<{ id: number; max_students: number }>();

  if (!cls) return Response.json({ error: 'Invalid invite code.' }, { status: 404 });

  const memberCount = await env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM private_class_members WHERE class_id = ?',
  ).bind(cls.id).first<{ cnt: number }>();

  if (memberCount && memberCount.cnt >= cls.max_students) {
    return Response.json({ error: 'This class is full.' }, { status: 400 });
  }

  try {
    await env.DB.prepare(
      'INSERT INTO private_class_members (class_id, user_id) VALUES (?, ?)',
    ).bind(cls.id, user.id).run();
  } catch {
    return Response.json({ error: 'You are already a member of this class.' }, { status: 409 });
  }

  return Response.json({ message: 'Joined class successfully.' });
};
