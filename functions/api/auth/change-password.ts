/// <reference types="@cloudflare/workers-types" />

import { getAuthUser, verifyPassword, hashPassword, generateToken } from '../../_shared/auth.js';

interface Env {
  DB: D1Database;
}

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/~`])/;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const user = await getAuthUser(request, env.DB);

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let body: {
      currentPassword?: string;
      newPassword?: string;
      old_password?: string;
      new_password?: string;
    };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const currentPassword = body.currentPassword ?? body.old_password;
    const newPassword = body.newPassword ?? body.new_password;

    if (!currentPassword || !newPassword) {
      return Response.json({ error: 'Current and new passwords are required.' }, { status: 400 });
    }

    const userRow = await env.DB
      .prepare('SELECT name, email, role, status, password_hash FROM users WHERE id = ?')
      .bind(user.id)
      .first<{ name: string; email: string; role: string; status: string; password_hash: string }>();

    if (!userRow || !userRow.password_hash) {
      return Response.json({ error: 'User not found or password not set.' }, { status: 404 });
    }

    const valid = await verifyPassword(currentPassword, userRow.password_hash);

    if (!valid) {
      return Response.json({ error: 'Current password is incorrect.' }, { status: 400 });
    }

    if (newPassword.length < 8 || !PASSWORD_REGEX.test(newPassword)) {
      return Response.json({
        error: 'Password must include uppercase, lowercase, number, and special character.',
      }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword);

    await env.DB
      .prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?')
      .bind(newHash, user.id)
      .run();

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await env.DB
      .prepare('INSERT INTO user_sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
      .bind(token, user.id, expiresAt)
      .run();

    return Response.json({
      message: 'Password changed successfully.',
      token,
      user: {
        id: user.id,
        name: userRow.name,
        email: userRow.email,
        role: userRow.role,
        status: userRow.status,
      },
    });

  } catch (err) {
    console.error('CHANGE PASSWORD ERROR:', err);

    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};