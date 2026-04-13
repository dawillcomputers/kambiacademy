import { hashPassword, generateToken } from '../../_shared/auth';

interface Env {
  DB: D1Database;
}

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/~`])/;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json<{
    name?: string;
    email?: string;
    password?: string;
    role?: string;
  }>();

  const { name, email, password } = body;
  const role = body.role === 'teacher' ? 'teacher' : body.role === 'admin' ? 'admin' : 'student';

  if (!name || !email || !password) {
    return Response.json({ error: 'name, email, and password are required.' }, { status: 400 });
  }

  if (password.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  if (!PASSWORD_REGEX.test(password)) {
    return Response.json({
      error: 'Password must include uppercase, lowercase, number, and special character.',
    }, { status: 400 });
  }

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) {
    return Response.json({ error: 'An account with this email already exists.' }, { status: 409 });
  }

  const status = role === 'teacher' ? 'pending' : 'active';
  const mustChangePassword = role === 'admin' ? 1 : 0; // Superadmin must change password on first login
  const passwordHash = await hashPassword(password);
  const result = await env.DB.prepare(
    'INSERT INTO users (name, email, password_hash, role, status, must_change_password) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(name, email, passwordHash, role, status, mustChangePassword)
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
    { token, user: { id: userId, name, email, role, status, mustChangePassword: !!mustChangePassword } },
    { status: 201 },
  );
};
