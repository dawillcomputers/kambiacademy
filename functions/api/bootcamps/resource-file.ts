import { getAuthUser } from '../../_shared/auth';
import { canManageBootcamp, canViewBootcamp } from '../../_shared/bootcamp';

interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
}

const MAX_BYTES = 50 * 1024 * 1024; // 50MB

// POST /api/bootcamps/resource-file — manager uploads a learning-material file to R2.
// Returns the stored object metadata; the caller then creates the resource row.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const bootcampId = Number(formData.get('bootcamp_id'));
  if (!file) return Response.json({ error: 'No file provided.' }, { status: 400 });
  if (!bootcampId) return Response.json({ error: 'A bootcamp id is required.' }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: 'File must be 50MB or smaller.' }, { status: 400 });
  if (!(await canManageBootcamp(env.DB, user, bootcampId))) {
    return Response.json({ error: 'You cannot manage this bootcamp.' }, { status: 403 });
  }

  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
  const key = `bootcamp-resources/${bootcampId}/${crypto.randomUUID()}.${ext}`;
  await env.BUCKET.put(key, file.stream(), { httpMetadata: { contentType: file.type || 'application/octet-stream' } });

  return Response.json({
    file_key: key,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type || 'application/octet-stream',
  }, { status: 201 });
};

// GET /api/bootcamps/resource-file?id=RESOURCE_ID — enrolled participant/manager downloads
// a material; bumps the download counter.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  // Browser downloads can't set an Authorization header, so accept a ?token= fallback.
  let user = await getAuthUser(request, env.DB);
  if (!user) {
    const qToken = url.searchParams.get('token');
    if (qToken) {
      user = await getAuthUser(new Request(request.url, { headers: { Authorization: `Bearer ${qToken}` } }), env.DB);
    }
  }
  if (!user) return new Response('Unauthorized', { status: 401 });

  const id = Number(url.searchParams.get('id'));
  if (!id) return new Response('Bad request', { status: 400 });

  const resource = await env.DB.prepare(
    'SELECT bootcamp_id, file_key, file_name, mime_type FROM bootcamp_resources WHERE id = ?',
  ).bind(id).first<{ bootcamp_id: number; file_key: string; file_name: string; mime_type: string }>();
  if (!resource || !resource.file_key) return new Response('Not found', { status: 404 });

  if (!(await canViewBootcamp(env.DB, user, resource.bootcamp_id))) {
    return new Response('Forbidden', { status: 403 });
  }

  const object = await env.BUCKET.get(resource.file_key);
  if (!object) return new Response('Not found', { status: 404 });

  await env.DB.prepare('UPDATE bootcamp_resources SET download_count = download_count + 1 WHERE id = ?').bind(id).run();

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Content-Type', resource.mime_type || 'application/octet-stream');
  headers.set('Content-Disposition', `attachment; filename="${(resource.file_name || 'download').replace(/"/g, '')}"`);
  headers.set('Cache-Control', 'private, max-age=0, must-revalidate');
  return new Response(object.body, { headers });
};
