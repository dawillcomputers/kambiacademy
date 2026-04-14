import { getAuthUser } from '../_shared/auth';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { results } = await env.DB.prepare(
    "SELECT key, value FROM platform_settings WHERE key IN ('student_materials_enabled')"
  ).all();

  const settings: Record<string, string> = {};
  for (const row of results as Array<{ key: string; value: string }>) {
    settings[row.key] = row.value;
  }

  return Response.json({ settings });
};
