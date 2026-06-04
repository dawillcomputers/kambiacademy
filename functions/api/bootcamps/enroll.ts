import { getAuthUser } from '../../_shared/auth';

interface Env {
  DB: D1Database;
}

// GET /api/bootcamps/enroll — list the bootcamps the current user is enrolled in.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { results } = await env.DB.prepare(
    `SELECT b.id, b.slug, b.title, b.tagline, b.description, b.cover_image_url, b.category, b.status,
            b.start_date, b.end_date, e.created_at AS enrolled_at, e.status AS enrollment_status
     FROM bootcamp_enrollments e
     JOIN bootcamps b ON e.bootcamp_id = b.id
     WHERE e.user_id = ? AND e.status = 'active'
     ORDER BY e.created_at DESC`,
  ).bind(user.id).all();

  return Response.json({ bootcamps: results });
};

// POST /api/bootcamps/enroll — register the current user for a bootcamp.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role !== 'student') {
    return Response.json(
      { error: 'Only learner accounts can register for a bootcamp. Sign up as a student to join.' },
      { status: 403 },
    );
  }

  const body = await request.json<{ slug?: string; bootcampId?: number }>();

  const bootcamp = body.bootcampId
    ? await env.DB.prepare('SELECT id, slug, title, status FROM bootcamps WHERE id = ?').bind(body.bootcampId).first<any>()
    : body.slug
      ? await env.DB.prepare('SELECT id, slug, title, status FROM bootcamps WHERE slug = ?').bind(body.slug).first<any>()
      : null;

  if (!bootcamp) {
    return Response.json({ error: 'Bootcamp not found.' }, { status: 404 });
  }

  if (bootcamp.status !== 'open') {
    return Response.json({ error: 'Registration for this bootcamp is closed.' }, { status: 400 });
  }

  await env.DB.prepare(
    "INSERT OR IGNORE INTO bootcamp_enrollments (bootcamp_id, user_id, status) VALUES (?, ?, 'active')",
  ).bind(bootcamp.id, user.id).run();

  // Re-activate a previously withdrawn enrollment.
  await env.DB.prepare(
    "UPDATE bootcamp_enrollments SET status = 'active' WHERE bootcamp_id = ? AND user_id = ?",
  ).bind(bootcamp.id, user.id).run();

  return Response.json({ message: `You're registered for ${bootcamp.title}.`, slug: bootcamp.slug, id: bootcamp.id }, { status: 201 });
};
