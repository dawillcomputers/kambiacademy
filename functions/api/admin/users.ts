import { getAuthUser, requireSubscription, checkSubscription, isFullAdmin } from '../../_shared/auth';

interface Env {
  DB: D1Database;
}

// GET: list all users (admin only)
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await getAuthUser(request, env.DB);
  if (!admin || !isFullAdmin(admin)) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Super admin and SOU bypass subscription check
  if (admin.role !== 'super_admin' && admin.role !== 'SOU') {
    // Check subscription for admin
    const hasSubscription = await checkSubscription(admin, env.DB);
    if (!hasSubscription) {
      const accountAge = Date.now() - new Date(admin.created_at).getTime();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (accountAge > sevenDays) {
        return Response.json({ error: 'Subscription required. Please pay to continue accessing admin console.', requiresPayment: true }, { status: 402 });
      }
    }

    // Check subscription for admin access (enforce after one week of non-payment)
    const subscriptionError = await requireSubscription(request, env.DB);
    if (subscriptionError) {
      return subscriptionError;
    }
  }

  // Get all users except hidden ones (is_hidden column may not exist)
  let results;
  try {
    const q = await env.DB.prepare(
      'SELECT id, name, email, role, status, must_change_password, created_at FROM users WHERE COALESCE(is_hidden, 0) = 0 ORDER BY created_at DESC',
    ).all();
    results = q.results;
  } catch {
    const q = await env.DB.prepare(
      'SELECT id, name, email, role, status, must_change_password, created_at FROM users ORDER BY created_at DESC',
    ).all();
    results = q.results;
  }

  return Response.json({ users: results });
};

// PATCH: update user (role, status, reset password)
export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await getAuthUser(request, env.DB);
  if (!admin || !isFullAdmin(admin)) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Super admin and SOU bypass subscription check
  if (admin.role !== 'super_admin' && admin.role !== 'SOU') {
    // Check subscription for admin
    const hasSubscription = await checkSubscription(admin, env.DB);
    if (!hasSubscription) {
      const accountAge = Date.now() - new Date(admin.created_at).getTime();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (accountAge > sevenDays) {
        return Response.json({ error: 'Subscription required. Please pay to continue accessing admin console.', requiresPayment: true }, { status: 402 });
      }
    }

    // Check subscription for admin access (enforce after one week of non-payment)
    const subscriptionError = await requireSubscription(request, env.DB);
    if (subscriptionError) {
      return subscriptionError;
    }
  }

  const body = await request.json<{
    userId: number;
    action: 'approve_tutor' | 'suspend' | 'activate' | 'reset_password' | 'change_role';
    role?: string;
    reason?: string;
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
      await env.DB.prepare(
        `INSERT INTO role_change_log (user_id, changed_by, old_role, new_role, reason) VALUES (?, ?, ?, ?, ?)`,
      ).bind(userId, admin.id, 'teacher', 'teacher', 'Tutor application approved').run();
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
      const newPassword = body.newPassword || 'Kambi@' + Math.random().toString(36).slice(2, 8) + '1!';
      const hash = await hashPassword(newPassword);
      await env.DB.prepare('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?')
        .bind(hash, userId)
        .run();
      // Invalidate their sessions
      await env.DB.prepare('DELETE FROM user_sessions WHERE user_id = ?').bind(userId).run();
      return Response.json({ message: 'Password reset.', tempPassword: newPassword });
    }

    case 'change_role': {
      const role = body.role;
      if (!role || !['student', 'teacher', 'admin'].includes(role)) {
        return Response.json({ error: 'Invalid role.' }, { status: 400 });
      }
      // Get current role for audit log
      const currentUser = await env.DB.prepare('SELECT role FROM users WHERE id = ?')
        .bind(userId).first<{ role: string }>();
      if (!currentUser) {
        return Response.json({ error: 'User not found.' }, { status: 404 });
      }
      if (currentUser.role === role) {
        return Response.json({ error: `User is already a ${role}.` }, { status: 400 });
      }
      await env.DB.prepare('UPDATE users SET role = ?, status = ? WHERE id = ?')
        .bind(role, 'active', userId)
        .run();
      // Write audit log
      await env.DB.prepare(
        `INSERT INTO role_change_log (user_id, changed_by, old_role, new_role, reason) VALUES (?, ?, ?, ?, ?)`,
      ).bind(userId, admin.id, currentUser.role, role, body.reason || null).run();
      return Response.json({ message: `Role changed from ${currentUser.role} to ${role}.` });
    }

    default:
      return Response.json({ error: 'Unknown action.' }, { status: 400 });
  }

  return Response.json({ message: `Action "${action}" applied successfully.` });
};
