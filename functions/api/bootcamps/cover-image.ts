import { getAuthUser } from '../../_shared/auth';
import { isSuperAdminRole, isBootcampManagerRole } from '../../_shared/bootcamp';

interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
}

const MAX_BYTES = 6 * 1024 * 1024; // 6MB

// POST /api/bootcamps/cover-image — super admin / manager uploads a cover image.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!isSuperAdminRole(user) && !isBootcampManagerRole(user)) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) return Response.json({ error: 'No file provided.' }, { status: 400 });
  if (!file.type.startsWith('image/')) return Response.json({ error: 'Please upload an image file.' }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: 'Image must be 6MB or smaller.' }, { status: 400 });

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const key = `bootcamp-covers/${crypto.randomUUID()}.${ext}`;
  await env.BUCKET.put(key, file.stream(), { httpMetadata: { contentType: file.type } });

  return Response.json({ url: `/api/bootcamps/cover-image?key=${encodeURIComponent(key)}` }, { status: 201 });
};

// GET /api/bootcamps/cover-image?key=… — public serve.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  if (!key || !key.startsWith('bootcamp-covers/')) {
    return new Response('Not found', { status: 404 });
  }
  const object = await env.BUCKET.get(key);
  if (!object) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  return new Response(object.body, { headers });
};
