import { getAuthUser, generateTempPassword, hashPassword } from '../../_shared/auth';
import { isSuperAdminRole, canManageBootcamp } from '../../_shared/bootcamp';

interface Env {
  DB: D1Database;
}

// GET /api/bootcamps/registrations?bootcamp=ID
//   Super admin: all registrants (optionally filtered by bootcamp).
//   Bootcamp manager: registrants for a bootcamp they manage.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const bootcampParam = url.searchParams.get('bootcamp');
  const bootcampId = bootcampParam ? Number(bootcampParam) : null;

  if (bootcampId) {
    if (!(await canManageBootcamp(env.DB, user, bootcampId))) {
      return Response.json({ error: 'You cannot manage this bootcamp.' }, { status: 403 });
    }
  } else if (!isSuperAdminRole(user)) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const query = bootcampId
    ? env.DB.prepare(
        `SELECT r.*, b.title AS bootcamp_title, u.role AS user_role, u.must_change_password AS must_change_password
         FROM bootcamp_registrations r
         LEFT JOIN bootcamps b ON r.bootcamp_id = b.id
         LEFT JOIN users u ON r.user_id = u.id
         WHERE r.bootcamp_id = ?
         ORDER BY r.created_at DESC`,
      ).bind(bootcampId)
    : env.DB.prepare(
        `SELECT r.*, b.title AS bootcamp_title, u.role AS user_role, u.must_change_password AS must_change_password
         FROM bootcamp_registrations r
         LEFT JOIN bootcamps b ON r.bootcamp_id = b.id
         LEFT JOIN users u ON r.user_id = u.id
         ORDER BY r.created_at DESC`,
      );

  const { results } = await query.all();
  return Response.json({ registrations: results });
};

// POST /api/bootcamps/registrations — super admin appoints a registrant as manager.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!isSuperAdminRole(user)) {
    return Response.json({ error: 'Only a super admin can appoint managers.' }, { status: 403 });
  }

  const body = await request.json<{ action?: string; bootcampId?: number; userId?: number }>();

  // Reset a participant's password to a fresh temporary one.
  if (body.action === 'reset_password') {
    if (!body.userId) {
      return Response.json({ error: 'userId is required.' }, { status: 400 });
    }
    const target = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(body.userId).first<{ id: number }>();
    if (!target) {
      return Response.json({ error: 'User not found.' }, { status: 404 });
    }

    const tempPassword = generateTempPassword();
    const hash = await hashPassword(tempPassword);
    await env.DB.prepare('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?').bind(hash, body.userId).run();
    // Force re-login and record the new temp password on the participant's registrations.
    await env.DB.prepare('DELETE FROM user_sessions WHERE user_id = ?').bind(body.userId).run();
    await env.DB.prepare('UPDATE bootcamp_registrations SET temp_password = ?, updated_at = datetime(\'now\') WHERE user_id = ?').bind(tempPassword, body.userId).run();

    return Response.json({ message: 'Password reset.', tempPassword });
  }

  if (body.action !== 'appoint_manager' || !body.bootcampId || !body.userId) {
    return Response.json({ error: 'action, bootcampId and userId are required.' }, { status: 400 });
  }

  const target = await env.DB.prepare('SELECT id, role FROM users WHERE id = ?').bind(body.userId).first<{ id: number; role: string }>();
  if (!target) {
    return Response.json({ error: 'User not found.' }, { status: 404 });
  }

  // Promote to bootcamp_manager (unless already a higher admin role) and assign the bootcamp.
  if (target.role !== 'super_admin' && target.role !== 'SOU' && target.role !== 'admin') {
    await env.DB.prepare("UPDATE users SET role = 'bootcamp_manager', status = 'active' WHERE id = ?").bind(body.userId).run();
  }
  await env.DB.prepare("UPDATE bootcamps SET manager_id = ?, updated_at = datetime('now') WHERE id = ?").bind(body.userId, body.bootcampId).run();

  return Response.json({ message: 'Manager appointed.' });
};
