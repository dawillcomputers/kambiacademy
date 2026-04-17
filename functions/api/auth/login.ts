import { verifyPassword, generateToken } from '../../_shared/auth';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await request.json<{ email?: string; password?: string }>();
    const { email, password } = body;

    if (!email || !password) {
      return Response.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const user = await env.DB.prepare(
      'SELECT id, name, email, password_hash, role, status, must_change_password FROM users WHERE email = ?',
    )
      .bind(email)
      .first<{ id: number; name: string; email: string; password_hash: string; role: string; status: string; must_change_password: number }>();

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return Response.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    if (user.status === 'suspended') {
      return Response.json({ error: 'Your account has been suspended. Contact support.' }, { status: 403 });
    }

    if (user.status === 'pending') {
      return Response.json({ error: 'Your account is pending approval.' }, { status: 403 });
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
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        status: user.status, mustChangePassword: !!user.must_change_password,
      },
    });
  } catch (error) {
    console.error('Error in /api/auth/login:', error);
    return Response.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
};
