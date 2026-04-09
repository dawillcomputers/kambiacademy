import { getAuthUser } from '../../_shared/auth';

interface Env {
  DB: D1Database;
}

// GET: list all users (admin only)
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await getAuthUser(request, env.DB);
  if (!admin || admin.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { results } = await env.DB.prepare(
    'SELECT id, name, email, role, status, must_change_password, created_at FROM users ORDER BY created_at DESC',
  ).all();

  return Response.json({ users: results });
};

// PATCH: update user (role, status, reset password)
export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await getAuthUser(request, env.DB);
  if (!admin || admin.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json<{
    userId: number;
    action: 'approve_tutor' | 'suspend' | 'activate' | 'reset_password' | 'change_role';
    role?: string;
    newPassword?: string;
  }>();

  const { userId, action } = body;
  if (!userId || !action) {
    return Response.json({ error: 'userId and action are required.' }, { status: 400 });
  }

  // Don't let admin modify themselves for dangerous actions
  if (userId === admin.id && (action === 'suspend' || action === 'change_role')) {
    return Response.json({ error: 'Cannot modify your own account this way.' }, { status: 400 });
  }

  switch (action) {
    case 'approve_tutor':
      await env.DB.prepare('UPDATE users SET role = ?, status = ? WHERE id = ?')
        .bind('teacher', 'active', userId)
        .run();
      break;

    case 'suspend':
      await env.DB.prepare('UPDATE users SET status = ? WHERE id = ?')
        .bind('suspended', userId)
        .run();
      // Invalidate their sessions
      await env.DB.prepare('DELETE FROM user_sessions WHERE user_id = ?').bind(userId).run();
      break;

    case 'activate':
      await env.DB.prepare('UPDATE users SET status = ? WHERE id = ?')
        .bind('active', userId)
        .run();
      break;

    case 'reset_password': {
      const { hashPassword } = await import('../../_shared/auth');
      const tempPassword = 'Kambi@' + Math.random().toString(36).slice(2, 8) + '1!';
      const hash = await hashPassword(tempPassword);
      await env.DB.prepare('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?')
        .bind(hash, userId)
        .run();
      // Invalidate their sessions
      await env.DB.prepare('DELETE FROM user_sessions WHERE user_id = ?').bind(userId).run();
      return Response.json({ message: 'Password reset.', tempPassword });
    }

    case 'change_role': {
      const role = body.role;
      if (!role || !['student', 'teacher', 'admin'].includes(role)) {
        return Response.json({ error: 'Invalid role.' }, { status: 400 });
      }
      await env.DB.prepare('UPDATE users SET role = ? WHERE id = ?')
        .bind(role, userId)
        .run();
      break;
    }

    default:
      return Response.json({ error: 'Unknown action.' }, { status: 400 });
  }

  return Response.json({ message: `Action "${action}" applied successfully.` });
};
