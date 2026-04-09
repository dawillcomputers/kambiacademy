import { getAuthUser } from '../../_shared/auth';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) {
    return Response.json({ error: 'Not authenticated.' }, { status: 401 });
  }
  return Response.json({ user });
};
