import { getAuthUser, isFullAdmin } from '../../_shared/auth';

interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
}

// GET /api/books/file?cover=<key>  -> public cover image
// GET /api/books/file?id=<bookId>  -> the book file (auth + access checked)
//
// The SPA fetches the file with its bearer token and turns it into a blob URL
// for the in-browser reader / download, so access control lives here.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const coverKey = url.searchParams.get('cover');

  if (coverKey) {
    if (!coverKey.startsWith('library/covers/')) return new Response('Not found', { status: 404 });
    const object = await env.BUCKET.get(coverKey);
    if (!object) return new Response('Not found', { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    return new Response(object.body, { headers });
  }

  const id = Number(url.searchParams.get('id'));
  if (!id) return new Response('Bad request', { status: 400 });

  const book = await env.DB.prepare('SELECT * FROM books WHERE id = ? AND published = 1').bind(id).first<any>();
  if (!book) return new Response('Not found', { status: 404 });

  const user = await getAuthUser(request, env.DB);
  if (!user) return new Response('Not authenticated', { status: 401 });

  const isFree = Number(book.price) <= 0;
  if (!isFree && !isFullAdmin(user)) {
    const purchase = await env.DB.prepare(
      "SELECT id FROM book_purchases WHERE book_id = ? AND user_id = ? AND status = 'success' LIMIT 1",
    ).bind(id, user.id).first();
    if (!purchase) return new Response('Payment required', { status: 402 });
  }

  const object = await env.BUCKET.get(book.file_key);
  if (!object) return new Response('File missing', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  if (book.file_type) headers.set('Content-Type', book.file_type);
  // Download books get an attachment disposition; read-online books are inline.
  const disposition = book.access_type === 'download' ? 'attachment' : 'inline';
  const safeName = (book.file_name || `${book.title}`).replace(/[^a-zA-Z0-9._ -]/g, '_');
  headers.set('Content-Disposition', `${disposition}; filename="${safeName}"`);
  headers.set('Cache-Control', 'private, no-store');
  return new Response(object.body, { headers });
};
