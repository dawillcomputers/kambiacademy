import { getAuthUser, isFullAdmin } from '../_shared/auth';

interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
}

const MAX_FILE_BYTES = 80 * 1024 * 1024; // 80MB per book
const MAX_COVER_BYTES = 6 * 1024 * 1024;

const safeExt = (name: string, fallback: string) =>
  (name.split('.').pop() || fallback).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || fallback;

const coverUrl = (key?: string | null) => (key ? `/api/books/file?cover=${encodeURIComponent(key)}` : null);

const publicBook = (row: any, owned: boolean) => ({
  id: row.id,
  title: row.title,
  author: row.author,
  description: row.description,
  category: row.category,
  price: Number(row.price) || 0,
  isFree: Number(row.price) <= 0,
  access_type: row.access_type,
  file_type: row.file_type,
  cover_url: coverUrl(row.cover_key),
  published: Number(row.published),
  created_at: row.created_at,
  owned,
});

async function ownedBookIds(db: D1Database, userId: number): Promise<Set<number>> {
  const { results } = await db
    .prepare("SELECT DISTINCT book_id FROM book_purchases WHERE user_id = ? AND status = 'success'")
    .bind(userId)
    .all<{ book_id: number }>();
  return new Set((results || []).map((r) => r.book_id));
}

// GET /api/books            -> published catalog (owned flag if authed)
// GET /api/books?id=123     -> single book
// GET /api/books?mine=1     -> the signed-in user's library (free + purchased)
// GET /api/books?admin=1    -> full list for admins (incl. unpublished)
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const user = await getAuthUser(request, env.DB);

  if (url.searchParams.get('admin') === '1') {
    if (!user || !isFullAdmin(user)) return Response.json({ error: 'Unauthorized' }, { status: 403 });
    const { results } = await env.DB.prepare('SELECT * FROM books ORDER BY created_at DESC').all<any>();
    return Response.json({ books: (results || []).map((b) => publicBook(b, true)) });
  }

  const idParam = url.searchParams.get('id');
  if (idParam) {
    const row = await env.DB.prepare('SELECT * FROM books WHERE id = ? AND published = 1').bind(Number(idParam)).first<any>();
    if (!row) return Response.json({ error: 'Book not found' }, { status: 404 });
    const owned = user ? (await ownedBookIds(env.DB, user.id)).has(row.id) : false;
    return Response.json({ book: publicBook(row, owned || Number(row.price) <= 0) });
  }

  if (url.searchParams.get('mine') === '1') {
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });
    const owned = await ownedBookIds(env.DB, user.id);
    const { results } = await env.DB.prepare('SELECT * FROM books WHERE published = 1 ORDER BY created_at DESC').all<any>();
    const mine = (results || []).filter((b) => Number(b.price) <= 0 || owned.has(b.id)).map((b) => publicBook(b, true));
    return Response.json({ books: mine });
  }

  const { results } = await env.DB.prepare('SELECT * FROM books WHERE published = 1 ORDER BY created_at DESC').all<any>();
  const owned = user ? await ownedBookIds(env.DB, user.id) : new Set<number>();
  return Response.json({ books: (results || []).map((b) => publicBook(b, owned.has(b.id) || Number(b.price) <= 0)) });
};

// POST /api/books — admin uploads a book (multipart: file, [cover], title, ...).
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || !isFullAdmin(user)) return Response.json({ error: 'Unauthorized' }, { status: 403 });

  const form = await request.formData();
  const file = form.get('file') as File | null;
  const cover = form.get('cover') as File | null;
  const title = String(form.get('title') || '').trim();

  if (!title) return Response.json({ error: 'Title is required.' }, { status: 400 });
  if (!file) return Response.json({ error: 'A book file is required.' }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) return Response.json({ error: 'Book file must be 80MB or smaller.' }, { status: 400 });

  const price = Math.max(0, Number(form.get('price') || 0) || 0);
  const accessType = String(form.get('access_type') || 'read') === 'download' ? 'download' : 'read';

  const fileKey = `library/files/${crypto.randomUUID()}.${safeExt(file.name, 'pdf')}`;
  await env.BUCKET.put(fileKey, file.stream(), { httpMetadata: { contentType: file.type || 'application/octet-stream' } });

  let coverKey: string | null = null;
  if (cover && cover.size > 0) {
    if (!cover.type.startsWith('image/')) return Response.json({ error: 'Cover must be an image.' }, { status: 400 });
    if (cover.size > MAX_COVER_BYTES) return Response.json({ error: 'Cover image must be 6MB or smaller.' }, { status: 400 });
    coverKey = `library/covers/${crypto.randomUUID()}.${safeExt(cover.name, 'jpg')}`;
    await env.BUCKET.put(coverKey, cover.stream(), { httpMetadata: { contentType: cover.type } });
  }

  const result = await env.DB.prepare(
    `INSERT INTO books (title, author, description, category, cover_key, file_key, file_name, file_type, file_size, price, access_type, published, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).bind(
    title,
    String(form.get('author') || ''),
    String(form.get('description') || ''),
    String(form.get('category') || ''),
    coverKey,
    fileKey,
    file.name,
    file.type || 'application/octet-stream',
    file.size,
    price,
    accessType,
    form.get('published') === '0' ? 0 : 1,
    user.id,
  ).run();

  return Response.json({ id: result.meta.last_row_id, message: 'Book added.' }, { status: 201 });
};

// PATCH /api/books — admin updates metadata (not the file).
export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || !isFullAdmin(user)) return Response.json({ error: 'Unauthorized' }, { status: 403 });

  const body = await request.json<any>().catch(() => null);
  const id = Number(body?.id);
  if (!id) return Response.json({ error: 'Book id is required.' }, { status: 400 });

  const fields: string[] = [];
  const binds: any[] = [];
  for (const key of ['title', 'author', 'description', 'category'] as const) {
    if (typeof body[key] === 'string') { fields.push(`${key} = ?`); binds.push(body[key]); }
  }
  if (body.price !== undefined) { fields.push('price = ?'); binds.push(Math.max(0, Number(body.price) || 0)); }
  if (body.access_type !== undefined) { fields.push('access_type = ?'); binds.push(body.access_type === 'download' ? 'download' : 'read'); }
  if (body.published !== undefined) { fields.push('published = ?'); binds.push(body.published ? 1 : 0); }
  if (!fields.length) return Response.json({ error: 'No changes provided.' }, { status: 400 });

  fields.push("updated_at = datetime('now')");
  binds.push(id);
  await env.DB.prepare(`UPDATE books SET ${fields.join(', ')} WHERE id = ?`).bind(...binds).run();
  return Response.json({ message: 'Book updated.' });
};

// DELETE /api/books — admin deletes a book + its R2 objects.
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || !isFullAdmin(user)) return Response.json({ error: 'Unauthorized' }, { status: 403 });

  const body = await request.json<{ id?: number }>().catch(() => null);
  const id = Number(body?.id);
  if (!id) return Response.json({ error: 'Book id is required.' }, { status: 400 });

  const row = await env.DB.prepare('SELECT file_key, cover_key FROM books WHERE id = ?').bind(id).first<any>();
  if (row) {
    try { if (row.file_key) await env.BUCKET.delete(row.file_key); } catch { /* ignore */ }
    try { if (row.cover_key) await env.BUCKET.delete(row.cover_key); } catch { /* ignore */ }
  }
  await env.DB.prepare('DELETE FROM books WHERE id = ?').bind(id).run();
  return Response.json({ message: 'Book deleted.' });
};
