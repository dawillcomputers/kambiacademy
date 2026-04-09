import { getAuthUser } from '../_shared/auth';

interface Env {
  DB: D1Database;
}

// GET: student sees own quiz responses, tutor sees all for their quizzes
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role === 'teacher') {
    const q = await env.DB.prepare(`
      SELECT qr.*, u.name as student_name, qz.title as quiz_title, qz.course_slug
      FROM quiz_responses qr
      JOIN users u ON qr.student_id = u.id
      JOIN quizzes qz ON qr.quiz_id = qz.id
      WHERE qz.tutor_id = ?
      ORDER BY qr.submitted_at DESC
    `).bind(user.id).all();
    return Response.json({ responses: q.results });
  }

  // Student
  const q = await env.DB.prepare(`
    SELECT qr.*, qz.title as quiz_title, qz.course_slug
    FROM quiz_responses qr
    JOIN quizzes qz ON qr.quiz_id = qz.id
    WHERE qr.student_id = ?
    ORDER BY qr.submitted_at DESC
  `).bind(user.id).all();
  return Response.json({ responses: q.results });
};

// POST: student submits quiz answers (auto-graded)
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json<{
    quiz_id?: number;
    answers?: Array<{ question_id: number; selected_option: string }>;
  }>();

  if (!body.quiz_id || !body.answers || body.answers.length === 0) {
    return Response.json({ error: 'quiz_id and answers are required.' }, { status: 400 });
  }

  // Verify quiz exists and student is enrolled
  const quiz = await env.DB.prepare('SELECT course_slug FROM quizzes WHERE id = ?')
    .bind(body.quiz_id).first<{ course_slug: string }>();
  if (!quiz) return Response.json({ error: 'Quiz not found.' }, { status: 404 });

  const enrolled = await env.DB.prepare('SELECT 1 FROM enrollments WHERE user_id = ? AND course_slug = ?')
    .bind(user.id, quiz.course_slug).first();
  if (!enrolled) return Response.json({ error: 'Not enrolled in this course.' }, { status: 403 });

  // Fetch all questions with correct answers
  const questions = await env.DB.prepare(
    'SELECT id, correct_option, points FROM quiz_questions WHERE quiz_id = ?',
  ).bind(body.quiz_id).all<{ id: number; correct_option: string; points: number }>();

  const questionMap = new Map(questions.results.map((q) => [q.id, q]));

  let score = 0;
  let maxScore = 0;
  for (const q of questions.results) {
    maxScore += q.points;
  }

  for (const answer of body.answers) {
    const question = questionMap.get(answer.question_id);
    if (question && answer.selected_option.toLowerCase() === question.correct_option) {
      score += question.points;
    }
  }

  try {
    await env.DB.prepare(
      `INSERT INTO quiz_responses (quiz_id, student_id, answers, score, max_score)
       VALUES (?, ?, ?, ?, ?)`,
    ).bind(body.quiz_id, user.id, JSON.stringify(body.answers), score, maxScore).run();
  } catch {
    return Response.json({ error: 'You have already taken this quiz.' }, { status: 409 });
  }

  return Response.json({
    message: 'Quiz submitted.',
    score,
    max_score: maxScore,
    percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
  }, { status: 201 });
};
