import { getAuthUser } from '../_shared/auth';

interface Env {
  DB: D1Database;
}

// GET: get user profile
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { results } = await env.DB.prepare(
    'SELECT name, email, bio, avatar_url FROM users WHERE id = ?'
  ).bind(user.id).all();

  if (results.length === 0) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  const profile = results[0] as { name: string; email: string; bio?: string; avatar_url?: string };

  return Response.json({ profile });
};

// PATCH: update user profile
export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json<{ name?: string; bio?: string; avatar_url?: string }>();

  const updates: string[] = [];
  const values: any[] = [];

  if (body.name !== undefined) {
    updates.push('name = ?');
    values.push(body.name);
  }
  if (body.bio !== undefined) {
    updates.push('bio = ?');
    values.push(body.bio);
  }
  if (body.avatar_url !== undefined) {
    updates.push('avatar_url = ?');
    values.push(body.avatar_url);
  }

  if (updates.length === 0) {
    return Response.json({ error: 'No fields to update' }, { status: 400 });
  }

  values.push(user.id);

  await env.DB.prepare(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...values).run();

  return Response.json({ success: true });
};