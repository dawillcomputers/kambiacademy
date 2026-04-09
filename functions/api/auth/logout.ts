interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    await env.DB.prepare('DELETE FROM user_sessions WHERE token = ?').bind(token).run();
  }
  return Response.json({ message: 'Logged out.' });
};
