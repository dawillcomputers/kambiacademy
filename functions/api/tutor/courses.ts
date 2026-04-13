import { getAuthUser, requireSubscription } from '../../_shared/auth';

interface Env {
  DB: D1Database;
}

// GET: tutor's own courses
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || user.role !== 'teacher') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Check subscription for teachers
  const subscriptionError = await requireSubscription(request, env.DB);
  if (subscriptionError) {
    return subscriptionError;
  }

  const q = await env.DB.prepare(
    'SELECT * FROM tutor_courses WHERE tutor_id = ? ORDER BY created_at DESC',
  ).bind(user.id).all();

  return Response.json({ courses: q.results });
};

// POST: create a new course (submitted for admin approval)
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || user.role !== 'teacher') {
    return Response.json({ error: 'Only tutors can create courses.' }, { status: 403 });
  }

  // Check subscription for teachers
  const subscriptionError = await requireSubscription(request, env.DB);
  if (subscriptionError) {
    return subscriptionError;
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
