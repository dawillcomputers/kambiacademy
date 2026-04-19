import { getAuthUser, requireSubscription } from '../_shared/auth';

interface Env {
  DB: D1Database;
}

// GET: list quizzes (tutor sees own, student sees enrolled courses')
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const courseSlug = url.searchParams.get('course');
  const quizId = url.searchParams.get('id');

  // Single quiz with questions (for taking it)
  if (quizId) {
    const quiz = await env.DB.prepare('SELECT * FROM quizzes WHERE id = ?').bind(quizId).first();
    if (!quiz) return Response.json({ error: 'Quiz not found.' }, { status: 404 });

    const questions = await env.DB.prepare(
      'SELECT id, question_text, option_a, option_b, option_c, option_d, points, sort_order FROM quiz_questions WHERE quiz_id = ? ORDER BY sort_order',
    ).bind(quizId).all();

    // Include correct answers only for the tutor who owns it
    if (user.role === 'teacher' && (quiz as any).tutor_id === user.id) {
      const fullQuestions = await env.DB.prepare(
        'SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY sort_order',
      ).bind(quizId).all();
      return Response.json({ quiz, questions: fullQuestions.results });
    }

    return Response.json({ quiz, questions: questions.results });
  }

  if (user.role === 'teacher') {
    const q = courseSlug
      ? await env.DB.prepare('SELECT * FROM quizzes WHERE tutor_id = ? AND course_slug = ? ORDER BY created_at DESC')
          .bind(user.id, courseSlug).all()
      : await env.DB.prepare('SELECT * FROM quizzes WHERE tutor_id = ? ORDER BY created_at DESC')
          .bind(user.id).all();
    return Response.json({ quizzes: q.results });
  }

  // Student: quizzes for enrolled courses
  if (courseSlug) {
    const enrolled = await env.DB.prepare('SELECT 1 FROM enrollments WHERE user_id = ? AND course_slug = ?')
      .bind(user.id, courseSlug).first();
    if (!enrolled) return Response.json({ error: 'Not enrolled.' }, { status: 403 });
    const q = await env.DB.prepare('SELECT * FROM quizzes WHERE course_slug = ? ORDER BY created_at DESC')
      .bind(courseSlug).all();
    return Response.json({ quizzes: q.results });
  }

  const q = await env.DB.prepare(`
    SELECT qz.* FROM quizzes qz
    JOIN enrollments e ON qz.course_slug = e.course_slug
    WHERE e.user_id = ?
    ORDER BY qz.created_at DESC
  `).bind(user.id).all();
  return Response.json({ quizzes: q.results });
};

// POST: tutor creates a quiz with questions
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || user.role !== 'teacher') {
    return Response.json({ error: 'Only tutors can create quizzes.' }, { status: 403 });
  }

  const subscriptionError = await requireSubscription(request, env.DB);
  if (subscriptionError) {
    return subscriptionError;
  }

  const body = await request.json<{
    course_slug?: string;
    title?: string;
    description?: string;
    time_limit_minutes?: number;
    questions?: Array<{
      question_text: string;
      option_a: string;
      option_b: string;
      option_c?: string;
      option_d?: string;
      correct_option: string;
      points?: number;
    }>;
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

  if (!body.questions || body.questions.length === 0) {
    return Response.json({ error: 'At least one question is required.' }, { status: 400 });
  }

  // Validate questions
  const validOptions = ['a', 'b', 'c', 'd'];
  for (const q of body.questions) {
    if (!q.question_text || !q.option_a || !q.option_b || !q.correct_option) {
      return Response.json({ error: 'Each question needs text, option_a, option_b, and correct_option.' }, { status: 400 });
    }
    if (!validOptions.includes(q.correct_option.toLowerCase())) {
      return Response.json({ error: 'correct_option must be a, b, c, or d.' }, { status: 400 });
    }
  }

  const quizResult = await env.DB.prepare(
    `INSERT INTO quizzes (course_slug, tutor_id, title, description, time_limit_minutes)
     VALUES (?, ?, ?, ?, ?)`,
  ).bind(body.course_slug, user.id, body.title, body.description || '', body.time_limit_minutes || null).run();

  const quizId = quizResult.meta.last_row_id;

  // Insert questions
  for (let i = 0; i < body.questions.length; i++) {
    const q = body.questions[i];
    await env.DB.prepare(
      `INSERT INTO quiz_questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option, points, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      quizId, q.question_text, q.option_a, q.option_b,
      q.option_c || null, q.option_d || null,
      q.correct_option.toLowerCase(), q.points ?? 1, i,
    ).run();
  }

  return Response.json({ message: 'Quiz created.', id: quizId }, { status: 201 });
};
