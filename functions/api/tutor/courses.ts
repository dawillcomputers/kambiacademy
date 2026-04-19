import { getAuthUser, requireSubscription } from '../../_shared/auth';

interface Env {
  DB: D1Database;
}

const slugify = (value: string) => {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return normalized || 'course';
};

async function generateUniqueCourseSlug(db: D1Database, title: string) {
  const base = slugify(title);
  let candidate = base;
  let suffix = 1;

  while (true) {
    const existing = await db.prepare('SELECT id FROM tutor_courses WHERE slug = ?').bind(candidate).first();
    if (!existing) {
      return candidate;
    }

    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
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

  const slug = await generateUniqueCourseSlug(env.DB, body.title);

  const result = await env.DB.prepare(
    `INSERT INTO tutor_courses (tutor_id, slug, title, description, level, price, duration_label, category)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      user.id,
      slug,
      body.title,
      body.description,
      body.level || 'Foundation',
      body.price || 0,
      body.duration_label || '8 weeks',
      body.category || 'General',
    )
    .run();

  return Response.json({ message: 'Course submitted for review.', id: result.meta.last_row_id, slug }, { status: 201 });
};

// PATCH: update a tutor-owned course draft/details
export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || user.role !== 'teacher') {
    return Response.json({ error: 'Only tutors can update courses.' }, { status: 403 });
  }

  const subscriptionError = await requireSubscription(request, env.DB);
  if (subscriptionError) {
    return subscriptionError;
  }

  const body = await request.json<{
    courseId?: number;
    title?: string;
    description?: string;
    level?: string;
    price?: number;
    duration_label?: string;
    category?: string;
  }>();

  if (!body.courseId) {
    return Response.json({ error: 'courseId is required.' }, { status: 400 });
  }

  const existing = await env.DB.prepare('SELECT id FROM tutor_courses WHERE id = ? AND tutor_id = ?').bind(body.courseId, user.id).first();
  if (!existing) {
    return Response.json({ error: 'Course not found.' }, { status: 404 });
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.title !== undefined) {
    updates.push('title = ?');
    values.push(body.title);
  }
  if (body.description !== undefined) {
    updates.push('description = ?');
    values.push(body.description);
  }
  if (body.level !== undefined) {
    updates.push('level = ?');
    values.push(body.level);
  }
  if (body.price !== undefined) {
    updates.push('price = ?');
    values.push(body.price);
  }
  if (body.duration_label !== undefined) {
    updates.push('duration_label = ?');
    values.push(body.duration_label);
  }
  if (body.category !== undefined) {
    updates.push('category = ?');
    values.push(body.category);
  }

  if (!updates.length) {
    return Response.json({ error: 'No course fields were provided.' }, { status: 400 });
  }

  values.push(body.courseId, user.id);

  await env.DB.prepare(`UPDATE tutor_courses SET ${updates.join(', ')} WHERE id = ? AND tutor_id = ?`).bind(...values).run();

  return Response.json({ message: 'Course updated.' });
};
