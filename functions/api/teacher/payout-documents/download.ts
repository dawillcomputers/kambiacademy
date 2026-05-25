import { getAuthUser } from '../../../_shared/auth';

interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
}

async function getUser(request: Request, db: D1Database) {
  const user = await getAuthUser(request, db);
  if (user) {
    return user;
  }

  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token) {
    return null;
  }

  return db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.status, u.must_change_password, u.created_at
    FROM users u
    JOIN user_sessions s ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).bind(token).first<any>();
}

const isSuperAdminConsoleUser = (role?: string) => role === 'super_admin' || role === 'SOU';
const isTeacherUser = (role?: string) => role === 'teacher' || role === 'tutor';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getUser(request, env.DB);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return Response.json({ error: 'Document id is required.' }, { status: 400 });
  }

  const document = await env.DB.prepare(`
    SELECT id, teacher_id, file_name, file_key, mime_type
    FROM teacher_verification_documents
    WHERE id = ?
  `).bind(id).first<{ id: number; teacher_id: number; file_name: string; file_key: string; mime_type: string | null }>();

  if (!document) {
    return Response.json({ error: 'Document not found.' }, { status: 404 });
  }

  if (!isSuperAdminConsoleUser(user.role) && !(isTeacherUser(user.role) && user.id === document.teacher_id)) {
    return Response.json({ error: 'Access denied.' }, { status: 403 });
  }

  const object = await env.BUCKET.get(document.file_key);
  if (!object) {
    return Response.json({ error: 'Document file not found.' }, { status: 404 });
  }

  const headers = new Headers();
  headers.set('Content-Type', document.mime_type || 'application/octet-stream');
  headers.set('Content-Disposition', `inline; filename="${document.file_name}"`);

  return new Response(object.body, { headers });
};