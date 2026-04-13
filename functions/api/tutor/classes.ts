import { getAuthUser, requireSubscription } from '../../_shared/auth';

interface Env {
  DB: D1Database;
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  for (const b of arr) code += chars[b % chars.length];
  return code;
}

// GET: list my private classes
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || user.role !== 'teacher') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const subscriptionError = await requireSubscription(request, env.DB);
  if (subscriptionError) {
    return subscriptionError;
  }

  const q = await env.DB.prepare(`
    SELECT pc.*, (SELECT COUNT(*) FROM private_class_members WHERE class_id = pc.id) as member_count
    FROM private_classes pc WHERE pc.tutor_id = ? ORDER BY pc.created_at DESC
  `).bind(user.id).all();

  return Response.json({ classes: q.results });
};

// POST: create a private class
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || user.role !== 'teacher') {
    return Response.json({ error: 'Only tutors can create private classes.' }, { status: 403 });
  }

  const subscriptionError = await requireSubscription(request, env.DB);
  if (subscriptionError) {
    return subscriptionError;
  }

  const body = await request.json<{
    title?: string;
    description?: string;
    max_students?: number;
  }>();

  if (!body.title) {
    return Response.json({ error: 'Title is required.' }, { status: 400 });
  }

  const invite_code = generateInviteCode();

  const result = await env.DB.prepare(
    `INSERT INTO private_classes (tutor_id, title, description, invite_code, max_students)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(user.id, body.title, body.description || '', invite_code, body.max_students || 30)
    .run();

  return Response.json({
    message: 'Private class created.',
    id: result.meta.last_row_id,
    invite_code,
  }, { status: 201 });
};
