interface Env {
  BUCKET: R2Bucket;
}

const MAX_BYTES = 4 * 1024 * 1024; // 4MB

// POST /api/bootcamps/registration-photo — public upload of a registrant photo.
// Returns a URL that the GET handler below serves from R2.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return Response.json({ error: 'No file provided.' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return Response.json({ error: 'Please upload an image file.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: 'Image must be 4MB or smaller.' }, { status: 400 });
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const key = `bootcamp-registrations/${crypto.randomUUID()}.${ext}`;
  await env.BUCKET.put(key, file.stream(), { httpMetadata: { contentType: file.type } });

  return Response.json({ url: `/api/bootcamps/registration-photo?key=${encodeURIComponent(key)}` }, { status: 201 });
};

// GET /api/bootcamps/registration-photo?key=… — public serve of an uploaded photo.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  if (!key || !key.startsWith('bootcamp-registrations/')) {
    return new Response('Not found', { status: 404 });
  }

  const object = await env.BUCKET.get(key);
  if (!object) {
    return new Response('Not found', { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  return new Response(object.body, { headers });
};
