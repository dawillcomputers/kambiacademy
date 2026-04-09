import { getAuthUser } from '../../_shared/auth';

interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
}

async function getUser(request: Request, db: D1Database) {
  // Try normal auth header first
  const user = await getAuthUser(request, db);
  if (user) return user;

  // Fallback: token in query param (for img/video/anchor browser requests)
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token) return null;

  return db.prepare(
    `SELECT u.id, u.name, u.email, u.role, u.status, u.must_change_password FROM users u
     JOIN user_sessions s ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > datetime('now')`,
  ).bind(token).first<{ id: number; name: string; email: string; role: string; status: string; must_change_password: number }>();
}

// GET /api/materials/download?id=123
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return Response.json({ error: 'Material id is required.' }, { status: 400 });

  const material = await env.DB.prepare(
    'SELECT * FROM course_materials WHERE id = ?'
  ).bind(id).first<{ id: number; course_slug: string; tutor_id: number; file_key: string | null; file_name: string | null; mime_type: string | null; type: string }>();

  if (!material || !material.file_key) {
    return Response.json({ error: 'Material not found.' }, { status: 404 });
  }

  // Verify access: tutor owns it, or student is enrolled
  if (user.role === 'teacher') {
    if (material.tutor_id !== user.id) {
      return Response.json({ error: 'Access denied.' }, { status: 403 });
    }
  } else {
    const enrolled = await env.DB.prepare('SELECT 1 FROM enrollments WHERE user_id = ? AND course_slug = ?')
      .bind(user.id, material.course_slug).first();
    if (!enrolled) return Response.json({ error: 'Not enrolled in this course.' }, { status: 403 });
  }

  const obj = await env.BUCKET.get(material.file_key);
  if (!obj) return Response.json({ error: 'File not found in storage.' }, { status: 404 });

  const headers = new Headers();
  headers.set('Content-Type', material.mime_type || 'application/octet-stream');
  if (material.file_name) {
    headers.set('Content-Disposition', `inline; filename="${material.file_name}"`);
  }

  return new Response(obj.body, { headers });
};
