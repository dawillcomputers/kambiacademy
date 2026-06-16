import { getAuthUser } from '../../_shared/auth';
import { canManageBootcamp, canViewBootcamp } from '../../_shared/bootcamp';
import { recordActivity } from '../../_shared/activity';

interface Env {
  DB: D1Database;
}

interface ActivityBody {
  action?: 'announce' | 'react';
  bootcamp_id?: number;
  // announce
  title?: string;
  body?: string;
  link?: string;
  // react
  activity_id?: number;
  kind?: 'like' | 'save';
}

// GET /api/bootcamps/activity?bootcamp=ID — community feed with reaction counts.
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
    `SELECT a.id, a.type, a.title, a.body, a.link, a.icon, a.created_at,
            u.name AS author_name,
            (SELECT COUNT(*) FROM bootcamp_activity_reactions r WHERE r.activity_id = a.id AND r.kind = 'like') AS like_count,
            (SELECT COUNT(*) FROM bootcamp_activity_reactions r WHERE r.activity_id = a.id AND r.kind = 'save') AS save_count,
            EXISTS(SELECT 1 FROM bootcamp_activity_reactions r WHERE r.activity_id = a.id AND r.kind = 'like' AND r.user_id = ?) AS liked,
            EXISTS(SELECT 1 FROM bootcamp_activity_reactions r WHERE r.activity_id = a.id AND r.kind = 'save' AND r.user_id = ?) AS saved
     FROM bootcamp_activity a LEFT JOIN users u ON u.id = a.created_by
     WHERE a.bootcamp_id = ?
     ORDER BY a.created_at DESC LIMIT 100`,
  ).bind(user.id, user.id, bootcampId).all<any>();

  const items = (results || []).map((r) => ({
    ...r,
    like_count: Number(r.like_count || 0),
    save_count: Number(r.save_count || 0),
    liked: !!r.liked,
    saved: !!r.saved,
  }));

  return Response.json({ activity: items });
};

// POST /api/bootcamps/activity
//   { action: 'announce', bootcamp_id, title, body } -> manager posts an announcement
//   { action: 'react', activity_id, kind }           -> participant likes/saves a post
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json<ActivityBody>();

  if (body.action === 'react') {
    if (!body.activity_id) return Response.json({ error: 'activity_id is required.' }, { status: 400 });
    const kind = body.kind === 'save' ? 'save' : 'like';
    const post = await env.DB.prepare('SELECT bootcamp_id FROM bootcamp_activity WHERE id = ?').bind(body.activity_id).first<{ bootcamp_id: number }>();
    if (!post) return Response.json({ error: 'Post not found.' }, { status: 404 });
    if (!(await canViewBootcamp(env.DB, user, post.bootcamp_id))) {
      return Response.json({ error: 'You are not enrolled in this bootcamp.' }, { status: 403 });
    }

    const existing = await env.DB.prepare(
      'SELECT id FROM bootcamp_activity_reactions WHERE activity_id = ? AND user_id = ? AND kind = ?',
    ).bind(body.activity_id, user.id, kind).first();

    if (existing) {
      await env.DB.prepare('DELETE FROM bootcamp_activity_reactions WHERE id = ?').bind((existing as any).id).run();
      return Response.json({ message: 'removed', active: false });
    }
    await env.DB.prepare(
      'INSERT OR IGNORE INTO bootcamp_activity_reactions (activity_id, user_id, kind) VALUES (?, ?, ?)',
    ).bind(body.activity_id, user.id, kind).run();
    return Response.json({ message: 'added', active: true });
  }

  // Announcement (manager/super admin only).
  if (!body.bootcamp_id || !body.title?.trim()) {
    return Response.json({ error: 'bootcamp_id and title are required.' }, { status: 400 });
  }
  if (!(await canManageBootcamp(env.DB, user, body.bootcamp_id))) {
    return Response.json({ error: 'You cannot manage this bootcamp.' }, { status: 403 });
  }
  await recordActivity(env.DB, {
    bootcampId: body.bootcamp_id,
    type: 'announcement',
    title: body.title.trim(),
    body: body.body || '',
    link: body.link || '',
    createdBy: user.id,
  });
  return Response.json({ message: 'Announcement posted.' }, { status: 201 });
};
