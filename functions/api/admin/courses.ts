import { getAuthUser, requireSubscription, isFullAdmin } from '../../_shared/auth';

interface Env {
  DB: D1Database;
}

// GET: list tutor courses (admin sees all, tutor sees own)
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role === 'admin') {
    // Check subscription for admin access (enforce after one week of non-payment)
    const subscriptionError = await requireSubscription(request, env.DB);
    if (subscriptionError) {
      return subscriptionError;
    }
  }

  let results;
  if (isFullAdmin(user)) {
    const q = await env.DB.prepare(`
      SELECT tc.*, u.name as tutor_name, u.email as tutor_email
      FROM tutor_courses tc JOIN users u ON tc.tutor_id = u.id
      ORDER BY tc.created_at DESC
    `).all();
    results = q.results;
  } else if (user.role === 'teacher') {
    const q = await env.DB.prepare(
      'SELECT * FROM tutor_courses WHERE tutor_id = ? ORDER BY created_at DESC',
    ).bind(user.id).all();
    results = q.results;
  } else {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  return Response.json({ courses: results });
};

// POST: tutor submits a course for approval
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || user.role !== 'teacher') {
    return Response.json({ error: 'Only tutors can submit courses.' }, { status: 403 });
  }

  const body = await request.json<{
    title?: string;
    description?: string;
    level?: string;
    price?: number;
    duration_label?: string;
    category?: string;
  }>();

  if (!body.title || !body.description) {
    return Response.json({ error: 'Title and description are required.' }, { status: 400 });
  }

  const result = await env.DB.prepare(
    `INSERT INTO tutor_courses (tutor_id, title, description, level, price, duration_label, category)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      user.id,
      body.title,
      body.description,
      body.level || 'Foundation',
      body.price || 0,
      body.duration_label || '8 weeks',
      body.category || 'General',
    )
    .run();

  return Response.json({ message: 'Course submitted for review.', id: result.meta.last_row_id }, { status: 201 });
};

// DELETE: remove a course (admin/super_admin)
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await getAuthUser(request, env.DB);
  if (!admin || !isFullAdmin(admin)) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json<{ courseId: number }>();
  if (!body.courseId) {
    return Response.json({ error: 'courseId is required.' }, { status: 400 });
  }

  await env.DB.prepare('DELETE FROM tutor_courses WHERE id = ?').bind(body.courseId).run();
  return Response.json({ message: 'Course removed.' });
};

// PATCH: admin approves / rejects a course
export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await getAuthUser(request, env.DB);
  if (!admin || !isFullAdmin(admin)) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Check subscription for admin access (enforce after one week of non-payment)
  const subscriptionError = await requireSubscription(request, env.DB);
  if (subscriptionError) {
    return subscriptionError;
  }

  const body = await request.json<{ courseId: number; status: 'approved' | 'rejected'; notes?: string }>();
  if (!body.courseId || !body.status) {
    return Response.json({ error: 'courseId and status are required.' }, { status: 400 });
  }

  await env.DB.prepare(
    `UPDATE tutor_courses SET status = ?, admin_notes = ?, approved_at = CASE WHEN ? = 'approved' THEN datetime('now') ELSE NULL END
     WHERE id = ?`,
  )
    .bind(body.status, body.notes || null, body.status, body.courseId)
    .run();

  return Response.json({ message: `Course ${body.status}.` });
};
