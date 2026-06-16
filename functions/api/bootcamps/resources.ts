import { getAuthUser } from '../../_shared/auth';
import { canManageBootcamp, canViewBootcamp } from '../../_shared/bootcamp';
import { recordActivity } from '../../_shared/activity';

interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
}

// GET /api/bootcamps/resources?bootcamp=ID — hub content for enrolled participants and managers.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const bootcampId = Number(url.searchParams.get('bootcamp'));
  if (!bootcampId) return Response.json({ error: 'A bootcamp id is required.' }, { status: 400 });

  if (!(await canViewBootcamp(env.DB, user, bootcampId))) {
    return Response.json({ error: 'You are not enrolled in this bootcamp.' }, { status: 403 });
  }

  const { results } = await env.DB.prepare(
    `SELECT id, bootcamp_id, title, description, type, url, content, category,
            file_key, file_name, file_size, mime_type, download_count, created_at
     FROM bootcamp_resources WHERE bootcamp_id = ? ORDER BY created_at DESC`,
  ).bind(bootcampId).all();

  return Response.json({ resources: results });
};

// POST /api/bootcamps/resources — manager/super admin adds hub content.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json<{
    bootcamp_id?: number;
    title?: string;
    description?: string;
    type?: 'link' | 'text' | 'announcement' | 'file';
    url?: string;
    content?: string;
    category?: string;
    file_key?: string;
    file_name?: string;
    file_size?: number;
    mime_type?: string;
  }>();

  if (!body.bootcamp_id || !body.title) {
    return Response.json({ error: 'bootcamp_id and title are required.' }, { status: 400 });
  }

  if (!(await canManageBootcamp(env.DB, user, body.bootcamp_id))) {
    return Response.json({ error: 'You cannot manage this bootcamp.' }, { status: 403 });
  }

  const type = ['text', 'announcement', 'file'].includes(body.type || '') ? body.type! : 'link';

  const result = await env.DB.prepare(
    `INSERT INTO bootcamp_resources (bootcamp_id, title, description, type, url, content, category, file_key, file_name, file_size, mime_type, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      body.bootcamp_id, body.title, body.description || '', type, body.url || '', body.content || '',
      body.category || 'General', body.file_key || '', body.file_name || '', Number(body.file_size || 0), body.mime_type || '',
      user.id,
    )
    .run();

  await recordActivity(env.DB, {
    bootcampId: body.bootcamp_id,
    type: type === 'announcement' ? 'announcement' : 'material',
    title: type === 'announcement' ? body.title : `New material: ${body.title}`,
    body: body.description || '',
    link: body.url || '#materials',
    refId: Number(result.meta.last_row_id),
    createdBy: user.id,
  });

  return Response.json({ message: 'Resource added.', id: result.meta.last_row_id }, { status: 201 });
};

// DELETE /api/bootcamps/resources?id= — manager/super admin removes hub content.
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id'));
  if (!id) return Response.json({ error: 'A resource id is required.' }, { status: 400 });

  const resource = await env.DB.prepare('SELECT bootcamp_id, file_key FROM bootcamp_resources WHERE id = ?').bind(id).first<{ bootcamp_id: number; file_key: string }>();
  if (!resource) return Response.json({ error: 'Resource not found.' }, { status: 404 });

  if (!(await canManageBootcamp(env.DB, user, resource.bootcamp_id))) {
    return Response.json({ error: 'You cannot manage this bootcamp.' }, { status: 403 });
  }

  if (resource.file_key) {
    await env.BUCKET.delete(resource.file_key).catch(() => undefined);
  }
  await env.DB.prepare('DELETE FROM bootcamp_resources WHERE id = ?').bind(id).run();
  return Response.json({ message: 'Resource removed.' });
};
