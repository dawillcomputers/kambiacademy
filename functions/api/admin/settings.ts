import { getAuthUser } from '../../_shared/auth';

interface Env {
  DB: D1Database;
}

// GET: list all settings (admin only)
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await getAuthUser(request, env.DB);
  if (!admin || admin.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { results } = await env.DB.prepare('SELECT key, value FROM platform_settings').all();
  const settings: Record<string, string> = {};
  for (const row of results as Array<{ key: string; value: string }>) {
    settings[row.key] = row.value;
  }

  return Response.json({ settings });
};

// PATCH: update a setting
export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await getAuthUser(request, env.DB);
  if (!admin || admin.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json<{ key: string; value: string }>();
  if (!body.key || body.value === undefined) {
    return Response.json({ error: 'key and value are required.' }, { status: 400 });
  }

  await env.DB.prepare(
    'INSERT INTO platform_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  )
    .bind(body.key, body.value)
    .run();

  return Response.json({ message: 'Setting updated.' });
};
