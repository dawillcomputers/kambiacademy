import { verifyPassword, generateToken } from '../../_shared/auth';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json<{ email?: string; password?: string }>();
  const { email, password } = body;

  if (!email || !password) {
    return Response.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  const user = await env.DB.prepare(
    'SELECT id, name, email, password_hash, role FROM users WHERE email = ?',
  )
    .bind(email)
    .first<{ id: number; name: string; email: string; password_hash: string; role: string }>();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return Response.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await env.DB.prepare(
    'INSERT INTO user_sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
  )
    .bind(token, user.id, expiresAt)
    .run();

  return Response.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
};
