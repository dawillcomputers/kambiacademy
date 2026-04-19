import { getAuthUser, requireSubscription } from '../_shared/auth';

interface Env {
  DB: D1Database;
}

// GET: list assignments for a course (or all for student)
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const courseSlug = url.searchParams.get('course');

  if (user.role === 'teacher') {
    // Tutor sees their own assignments
    const q = courseSlug
      ? await env.DB.prepare('SELECT * FROM assignments WHERE tutor_id = ? AND course_slug = ? ORDER BY created_at DESC')
          .bind(user.id, courseSlug).all()
      : await env.DB.prepare('SELECT * FROM assignments WHERE tutor_id = ? ORDER BY created_at DESC')
          .bind(user.id).all();
    return Response.json({ assignments: q.results });
  }

  // Student: see assignments for courses they're enrolled in
  if (courseSlug) {
    const enrolled = await env.DB.prepare('SELECT 1 FROM enrollments WHERE user_id = ? AND course_slug = ?')
      .bind(user.id, courseSlug).first();
    if (!enrolled) return Response.json({ error: 'Not enrolled in this course.' }, { status: 403 });

    const q = await env.DB.prepare('SELECT * FROM assignments WHERE course_slug = ? ORDER BY created_at DESC')
      .bind(courseSlug).all();
    return Response.json({ assignments: q.results });
  }

  // All assignments for all enrolled courses
  const q = await env.DB.prepare(`
    SELECT a.* FROM assignments a
    JOIN enrollments e ON a.course_slug = e.course_slug
    WHERE e.user_id = ?
    ORDER BY a.created_at DESC
  `).bind(user.id).all();

  return Response.json({ assignments: q.results });
};

// POST: tutor creates an assignment
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || user.role !== 'teacher') {
    return Response.json({ error: 'Only tutors can create assignments.' }, { status: 403 });
  }

  const subscriptionError = await requireSubscription(request, env.DB);
  if (subscriptionError) {
    return subscriptionError;
  }

  const body = await request.json<{
    course_slug?: string;
    title?: string;
    description?: string;
    type?: string;
    due_date?: string;
    max_score?: number;
  }>();

  if (!body.course_slug || !body.title) {
    return Response.json({ error: 'course_slug and title are required.' }, { status: 400 });
  }

  const course = await env.DB.prepare(
    'SELECT id FROM tutor_courses WHERE tutor_id = ? AND (slug = ? OR title = ?)',
  ).bind(user.id, body.course_slug, body.course_slug).first();

  if (!course) {
    return Response.json({ error: 'Course not found for this teacher.' }, { status: 404 });
  }

  const result = await env.DB.prepare(
    `INSERT INTO assignments (course_slug, tutor_id, title, description, type, due_date, max_score)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      body.course_slug, user.id, body.title,
      body.description || '', body.type || 'file',
      body.due_date || null, body.max_score ?? 100,
    )
    .run();

  return Response.json({ message: 'Assignment created.', id: result.meta.last_row_id }, { status: 201 });
};
