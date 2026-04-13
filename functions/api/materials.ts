import { getAuthUser, requireSubscription } from '../_shared/auth';

interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
}

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime',
]);

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

// GET: list materials (tutor sees own, student sees for enrolled courses)
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const courseSlug = url.searchParams.get('course');

  if (user.role === 'teacher') {
    const q = courseSlug
      ? await env.DB.prepare('SELECT * FROM course_materials WHERE tutor_id = ? AND course_slug = ? ORDER BY sort_order, created_at DESC')
          .bind(user.id, courseSlug).all()
      : await env.DB.prepare('SELECT * FROM course_materials WHERE tutor_id = ? ORDER BY sort_order, created_at DESC')
          .bind(user.id).all();
    return Response.json({ materials: q.results });
  }

  // Student: only enrolled courses
  if (courseSlug) {
    const enrolled = await env.DB.prepare('SELECT 1 FROM enrollments WHERE user_id = ? AND course_slug = ?')
      .bind(user.id, courseSlug).first();
    if (!enrolled) return Response.json({ error: 'Not enrolled in this course.' }, { status: 403 });
    const q = await env.DB.prepare('SELECT id, course_slug, title, description, type, file_name, file_size, mime_type, youtube_url, sort_order, created_at FROM course_materials WHERE course_slug = ? ORDER BY sort_order, created_at DESC')
      .bind(courseSlug).all();
    return Response.json({ materials: q.results });
  }

  // All materials for enrolled courses
  const q = await env.DB.prepare(`
    SELECT m.id, m.course_slug, m.title, m.description, m.type, m.file_name, m.file_size, m.mime_type, m.youtube_url, m.sort_order, m.created_at
    FROM course_materials m
    JOIN enrollments e ON m.course_slug = e.course_slug AND e.user_id = ?
    ORDER BY m.sort_order, m.created_at DESC
  `).bind(user.id).all();
  return Response.json({ materials: q.results });
};

// POST: tutor uploads material (file or youtube link)
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || user.role !== 'teacher') {
    return Response.json({ error: 'Only tutors can upload materials.' }, { status: 403 });
  }

  const subscriptionError = await requireSubscription(request, env.DB);
  if (subscriptionError) {
    return subscriptionError;
  }

  const contentType = request.headers.get('Content-Type') || '';

  let courseSlug: string;
  let title: string;
  let description = '';
  let type = 'file';
  let fileName: string | null = null;
  let fileKey: string | null = null;
  let fileSize: number | null = null;
  let mimeType: string | null = null;
  let youtubeUrl: string | null = null;

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    courseSlug = formData.get('course_slug') as string;
    title = formData.get('title') as string;
    description = (formData.get('description') as string) || '';
    type = (formData.get('type') as string) || 'file';
    youtubeUrl = formData.get('youtube_url') as string | null;

    const file = formData.get('file') as File | null;

    if (type === 'file' && file && file.size > 0) {
      if (file.size > MAX_FILE_SIZE) {
        return Response.json({ error: 'File must be under 100MB.' }, { status: 400 });
      }
      if (!ALLOWED_MIME.has(file.type)) {
        return Response.json({ error: `File type "${file.type}" is not allowed.` }, { status: 400 });
      }
      fileKey = `materials/${user.id}/${courseSlug}/${Date.now()}_${file.name}`;
      await env.BUCKET.put(fileKey, file.stream(), {
        httpMetadata: { contentType: file.type },
      });
      fileName = file.name;
      fileSize = file.size;
      mimeType = file.type;
    } else if (type === 'file') {
      return Response.json({ error: 'A file is required for file-type materials.' }, { status: 400 });
    }
  } else {
    const body = await request.json<any>();
    courseSlug = body.course_slug;
    title = body.title;
    description = body.description || '';
    type = body.type || 'youtube';
    youtubeUrl = body.youtube_url || null;
  }

  if (!courseSlug || !title) {
    return Response.json({ error: 'course_slug and title are required.' }, { status: 400 });
  }

  if (type === 'youtube' && !youtubeUrl) {
    return Response.json({ error: 'YouTube URL is required.' }, { status: 400 });
  }

  // Verify tutor owns this course
  const course = await env.DB.prepare('SELECT 1 FROM tutor_courses WHERE tutor_id = ? AND (title = ? OR id IN (SELECT id FROM tutor_courses WHERE tutor_id = ?))')
    .bind(user.id, courseSlug, user.id).first();
  // Allow tutor to add materials even if course is just associated by slug

  const result = await env.DB.prepare(
    `INSERT INTO course_materials (course_slug, tutor_id, title, description, type, file_name, file_key, file_size, mime_type, youtube_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(courseSlug, user.id, title, description, type, fileName, fileKey, fileSize, mimeType, youtubeUrl).run();

  return Response.json({ message: 'Material uploaded.', id: result.meta.last_row_id }, { status: 201 });
};

// DELETE: tutor removes material
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user || user.role !== 'teacher') {
    return Response.json({ error: 'Only tutors can delete materials.' }, { status: 403 });
  }

  const subscriptionError = await requireSubscription(request, env.DB);
  if (subscriptionError) {
    return subscriptionError;
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return Response.json({ error: 'Material id is required.' }, { status: 400 });

  const material = await env.DB.prepare('SELECT * FROM course_materials WHERE id = ? AND tutor_id = ?')
    .bind(id, user.id).first<{ file_key: string | null }>();
  if (!material) return Response.json({ error: 'Material not found.' }, { status: 404 });

  // Delete from R2 if it's a file
  if (material.file_key) {
    try { await env.BUCKET.delete(material.file_key); } catch {}
  }

  await env.DB.prepare('DELETE FROM course_materials WHERE id = ?').bind(id).run();
  return Response.json({ message: 'Material deleted.' });
};
