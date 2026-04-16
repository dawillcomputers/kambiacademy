import { getAuthUser } from '../_shared/auth';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { results } = await env.DB.prepare(
    'SELECT course_slug, amount_paid, created_at FROM enrollments WHERE user_id = ?',
  )
    .bind(user.id)
    .all<{ course_slug: string; amount_paid: number; created_at: string }>();

  return Response.json({ enrollments: results });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const body = await request.json<{
    course_slug: string;
    action: 'complete';
  }>();

  if (!body.course_slug || body.action !== 'complete') {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  try {
    // Mark enrollment as completed
    const now = new Date().toISOString();
    await env.DB.prepare(
      'UPDATE enrollments SET completed_at = ? WHERE user_id = ? AND course_slug = ?'
    ).bind(now, user.id, body.course_slug).run();

    // Check if this is the first completion for the course
    const { results: completions } = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM enrollments WHERE course_slug = ? AND completed_at IS NOT NULL'
    ).bind(body.course_slug).all<{ count: number }>();

    if (completions[0].count === 1) {
      // First completion, unlock held funds
      const courseResult = await env.DB.prepare(
        'SELECT teacher_id FROM courses WHERE slug = ?'
      ).bind(body.course_slug).first<{ teacher_id: number }>();

      if (courseResult) {
        await env.DB.prepare(
          `UPDATE course_earnings 
           SET is_unlocked = TRUE, first_completion_at = ?, available_balance = available_balance + held_balance, held_balance = 0
           WHERE teacher_id = ? AND course_slug = ? AND is_unlocked = FALSE`
        ).bind(now, courseResult.teacher_id, body.course_slug).run();

        // Update overall teacher earnings
        const heldResult = await env.DB.prepare(
          'SELECT held_balance FROM course_earnings WHERE teacher_id = ? AND course_slug = ?'
        ).bind(courseResult.teacher_id, body.course_slug).first<{ held_balance: number }>();

        if (heldResult && heldResult.held_balance > 0) {
          await env.DB.prepare(
            'UPDATE teacher_earnings SET available_balance = available_balance + ? WHERE teacher_id = ?'
          ).bind(heldResult.held_balance, courseResult.teacher_id).run();
        }
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error completing course:', error);
    return Response.json({ error: 'Failed to complete course' }, { status: 500 });
  }
};
