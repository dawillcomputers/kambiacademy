import { getAuthUser, requireSubscription } from '../../_shared/auth';

interface Env {
  DB: D1Database;
}

// GET: list role change audit log
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await getAuthUser(request, env.DB);
  if (!admin || admin.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Check subscription for admin access (enforce after one week of non-payment)
  const subscriptionError = await requireSubscription(request, env.DB);
  if (subscriptionError) {
    return subscriptionError;
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get('user_id');

  let q;
  if (userId) {
    q = await env.DB.prepare(`
      SELECT r.*, u.name as user_name, u.email as user_email, a.name as changed_by_name
      FROM role_change_log r
      JOIN users u ON r.user_id = u.id
      JOIN users a ON r.changed_by = a.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `).bind(userId).all();
  } else {
    q = await env.DB.prepare(`
      SELECT r.*, u.name as user_name, u.email as user_email, a.name as changed_by_name
      FROM role_change_log r
      JOIN users u ON r.user_id = u.id
      JOIN users a ON r.changed_by = a.id
      ORDER BY r.created_at DESC
      LIMIT 50
    `).all();
  }

  return Response.json({ log: q.results });
};
