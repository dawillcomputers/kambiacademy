import { hashPassword, generateToken } from '../../_shared/auth';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json<{
    name?: string;
    email?: string;
    password?: string;
  }>();

  const { name, email, password } = body;

  if (!name || !email || !password) {
    return Response.json({ error: 'name, email, and password are required.' }, { status: 400 });
  }

  if (password.length < 6) {
    return Response.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
  }

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) {
    return Response.json({ error: 'An account with this email already exists.' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const result = await env.DB.prepare(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
  )
    .bind(name, email, passwordHash, 'student')
    .run();

  const userId = result.meta.last_row_id;
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await env.DB.prepare(
    'INSERT INTO user_sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
  )
    .bind(token, userId, expiresAt)
    .run();

  return Response.json(
    { token, user: { id: userId, name, email, role: 'student' } },
    { status: 201 },
  );
};
