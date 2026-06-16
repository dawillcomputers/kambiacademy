import { getAuthUser } from '../_shared/auth';
import { isSuperAdminRole } from '../_shared/bootcamp';

interface Env {
  DB: D1Database;
}

interface PopupBody {
  id?: number;
  title?: string;
  media_type?: 'image' | 'video' | 'html';
  media_url?: string;
  html?: string;
  link_url?: string;
  cta_label?: string;
  frequency?: 'once' | 'daily' | 'always';
  audience?: 'all' | 'bootcamp';
  bootcamp_id?: number | null;
  active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
}

// GET /api/popups               -> public: active campaigns to display (audience = all)
// GET /api/popups?bootcamp=ID    -> public: active campaigns for a bootcamp + global
// GET /api/popups?scope=admin    -> superadmin: every campaign
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);

  if (url.searchParams.get('scope') === 'admin') {
    const user = await getAuthUser(request, env.DB);
    if (!isSuperAdminRole(user)) return Response.json({ error: 'Unauthorized' }, { status: 403 });
    const { results } = await env.DB.prepare('SELECT * FROM popup_campaigns ORDER BY created_at DESC').all();
    return Response.json({ campaigns: results });
  }

  const bootcampId = Number(url.searchParams.get('bootcamp')) || null;
  const now = new Date().toISOString();
  const { results } = await env.DB.prepare(
    `SELECT id, title, media_type, media_url, html, link_url, cta_label, frequency, audience, bootcamp_id
     FROM popup_campaigns
     WHERE active = 1
       AND (starts_at IS NULL OR starts_at <= ?)
       AND (ends_at IS NULL OR ends_at >= ?)
       AND (audience = 'all' OR (audience = 'bootcamp' AND bootcamp_id = ?))
     ORDER BY created_at DESC`,
  ).bind(now, now, bootcampId).all();

  return Response.json({ campaigns: results }, { headers: { 'Cache-Control': 'public, max-age=30' } });
};

// POST /api/popups — superadmin creates a campaign.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!isSuperAdminRole(user)) return Response.json({ error: 'Unauthorized' }, { status: 403 });

  const body = await request.json<PopupBody>();
  const mediaType = ['image', 'video', 'html'].includes(body.media_type || '') ? body.media_type! : 'image';
  const frequency = ['once', 'daily', 'always'].includes(body.frequency || '') ? body.frequency! : 'once';
  const audience = body.audience === 'bootcamp' ? 'bootcamp' : 'all';

  const result = await env.DB.prepare(
    `INSERT INTO popup_campaigns (title, media_type, media_url, html, link_url, cta_label, frequency, audience, bootcamp_id, active, starts_at, ends_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    body.title || '', mediaType, body.media_url || '', body.html || '', body.link_url || '', body.cta_label || '',
    frequency, audience, audience === 'bootcamp' ? (body.bootcamp_id ?? null) : null,
    body.active === false ? 0 : 1, body.starts_at || null, body.ends_at || null, user!.id,
  ).run();

  return Response.json({ message: 'Campaign created.', id: result.meta.last_row_id }, { status: 201 });
};

// PATCH /api/popups — superadmin toggles/edits a campaign.
export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!isSuperAdminRole(user)) return Response.json({ error: 'Unauthorized' }, { status: 403 });

  const body = await request.json<PopupBody>();
  if (!body.id) return Response.json({ error: 'A campaign id is required.' }, { status: 400 });

  const updates: string[] = [];
  const binds: unknown[] = [];
  const set = (col: string, val: unknown) => { updates.push(`${col} = ?`); binds.push(val); };
  if (body.active !== undefined) set('active', body.active ? 1 : 0);
  if (body.title !== undefined) set('title', body.title);
  if (body.media_url !== undefined) set('media_url', body.media_url);
  if (body.link_url !== undefined) set('link_url', body.link_url);
  if (body.cta_label !== undefined) set('cta_label', body.cta_label);
  if (body.frequency !== undefined) set('frequency', body.frequency);
  if (updates.length === 0) return Response.json({ message: 'Nothing to update.' });
  binds.push(body.id);
  await env.DB.prepare(`UPDATE popup_campaigns SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run();
  return Response.json({ message: 'Campaign updated.' });
};

// DELETE /api/popups?id=
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!isSuperAdminRole(user)) return Response.json({ error: 'Unauthorized' }, { status: 403 });
  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id'));
  if (!id) return Response.json({ error: 'A campaign id is required.' }, { status: 400 });
  await env.DB.prepare('DELETE FROM popup_campaigns WHERE id = ?').bind(id).run();
  return Response.json({ message: 'Campaign deleted.' });
};
