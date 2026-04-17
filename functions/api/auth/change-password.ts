import { getAuthUser, hashPassword, verifyPassword, generateToken } from '../../_shared/auth';

interface Env {
  DB: D1Database;
}

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/~`])/;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json<{ currentPassword?: string; newPassword?: string }>();

  if (!body.currentPassword || !body.newPassword) {
    return Response.json({ error: 'Current and new passwords are required.' }, { status: 400 });
  }

  if (body.newPassword.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  if (!PASSWORD_REGEX.test(body.newPassword)) {
    return Response.json({
      error: 'Password must include uppercase, lowercase, number, and special character.',
    }, { status: 400 });
  }

  // Verify current password
  const row = await env.DB.prepare('SELECT password_hash, name, email, role, status FROM users WHERE id = ?').bind(user.id).first<{ password_hash: string; name: string; email: string; role: string; status: string }>();
  if (!row) return Response.json({ error: 'User not found.' }, { status: 404 });

  const valid = await verifyPassword(body.currentPassword, row.password_hash);
  if (!valid) return Response.json({ error: 'Current password is incorrect.' }, { status: 400 });

  // Hash new password and update
  const newHash = await hashPassword(body.newPassword);
  await env.DB.prepare(
    'UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?',
  ).bind(newHash, user.id).run();

  // Generate new session token for auto-login
  const newToken = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare(
    'INSERT INTO user_sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
  )
    .bind(newToken, user.id, expiresAt)
    .run();

  return Response.json({
    message: 'Password changed successfully.',
    token: newToken,
    user: {
      id: user.id,
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.status,
    },
  });
};
