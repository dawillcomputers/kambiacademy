import { getAuthUser, requireSubscription } from '../_shared/auth';

interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
}

// GET: list submissions (tutor sees all for their assignments, student sees own)
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const assignmentId = url.searchParams.get('assignment_id');

  if (user.role === 'teacher') {
    if (assignmentId) {
      // Verify tutor owns this assignment
      const a = await env.DB.prepare('SELECT 1 FROM assignments WHERE id = ? AND tutor_id = ?')
        .bind(assignmentId, user.id).first();
      if (!a) return Response.json({ error: 'Assignment not found.' }, { status: 404 });

      const q = await env.DB.prepare(`
        SELECT s.*, u.name as student_name, u.email as student_email
        FROM submissions s JOIN users u ON s.student_id = u.id
        WHERE s.assignment_id = ? ORDER BY s.submitted_at DESC
      `).bind(assignmentId).all();
      return Response.json({ submissions: q.results });
    }
    // All submissions across tutor's assignments
    const q = await env.DB.prepare(`
      SELECT s.*, u.name as student_name, u.email as student_email, a.title as assignment_title, a.course_slug
      FROM submissions s
      JOIN users u ON s.student_id = u.id
      JOIN assignments a ON s.assignment_id = a.id
      WHERE a.tutor_id = ?
      ORDER BY s.submitted_at DESC
    `).bind(user.id).all();
    return Response.json({ submissions: q.results });
  }

  // Student: own submissions
  const q = await env.DB.prepare(`
    SELECT s.*, a.title as assignment_title, a.course_slug, a.max_score
    FROM submissions s JOIN assignments a ON s.assignment_id = a.id
    WHERE s.student_id = ?
    ORDER BY s.submitted_at DESC
  `).bind(user.id).all();
  return Response.json({ submissions: q.results });
};

// POST: student submits assignment (text or file)
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const contentType = request.headers.get('Content-Type') || '';

  let assignmentId: number;
  let content: string | null = null;
  let fileName: string | null = null;
  let fileKey: string | null = null;

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    assignmentId = parseInt(formData.get('assignment_id') as string);
    content = formData.get('content') as string | null;
    const file = formData.get('file') as File | null;

    if (file && file.size > 0) {
      if (file.size > 10 * 1024 * 1024) {
        return Response.json({ error: 'File must be under 10MB.' }, { status: 400 });
      }
      fileKey = `submissions/${user.id}/${assignmentId}/${file.name}`;
      await env.BUCKET.put(fileKey, file.stream(), {
        httpMetadata: { contentType: file.type },
      });
      fileName = file.name;
    }
  } else {
    const body = await request.json<{ assignment_id?: number; content?: string }>();
    assignmentId = body.assignment_id!;
    content = body.content || null;
  }

  if (!assignmentId) {
    return Response.json({ error: 'assignment_id is required.' }, { status: 400 });
  }

  // Verify assignment exists and student is enrolled
  const assignment = await env.DB.prepare('SELECT course_slug FROM assignments WHERE id = ?')
    .bind(assignmentId).first<{ course_slug: string }>();
  if (!assignment) return Response.json({ error: 'Assignment not found.' }, { status: 404 });

  const enrolled = await env.DB.prepare('SELECT 1 FROM enrollments WHERE user_id = ? AND course_slug = ?')
    .bind(user.id, assignment.course_slug).first();
  if (!enrolled) return Response.json({ error: 'Not enrolled in this course.' }, { status: 403 });

  try {
    await env.DB.prepare(
      `INSERT INTO submissions (assignment_id, student_id, content, file_name, file_key)
       VALUES (?, ?, ?, ?, ?)`,
    ).bind(assignmentId, user.id, content, fileName, fileKey).run();
  } catch {
    return Response.json({ error: 'You have already submitted this assignment.' }, { status: 409 });
  }

  return Response.json({ message: 'Submission received.' }, { status: 201 });
};

// PATCH: tutor grades a submission
export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || user.role !== 'teacher') {
    return Response.json({ error: 'Only tutors can grade submissions.' }, { status: 403 });
  }

  const subscriptionError = await requireSubscription(request, env.DB);
  if (subscriptionError) {
    return subscriptionError;
  }

  const body = await request.json<{ submission_id?: number; score?: number; feedback?: string }>();
  if (!body.submission_id || body.score === undefined) {
    return Response.json({ error: 'submission_id and score are required.' }, { status: 400 });
  }

  // Verify tutor owns the assignment behind this submission
  const row = await env.DB.prepare(`
    SELECT a.tutor_id FROM submissions s JOIN assignments a ON s.assignment_id = a.id WHERE s.id = ?
  `).bind(body.submission_id).first<{ tutor_id: number }>();
  if (!row || row.tutor_id !== user.id) {
    return Response.json({ error: 'Submission not found.' }, { status: 404 });
  }

  await env.DB.prepare(
    `UPDATE submissions SET score = ?, feedback = ?, status = 'graded', graded_at = datetime('now') WHERE id = ?`,
  ).bind(body.score, body.feedback || null, body.submission_id).run();

  return Response.json({ message: 'Submission graded.' });
};
