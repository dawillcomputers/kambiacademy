import { getAuthUser } from '../../_shared/auth';
import { canManageBootcamp, canViewBootcamp } from '../../_shared/bootcamp';

interface Env {
  DB: D1Database;
}

// GET /api/bootcamps/live-class?bootcampId=123
// Returns the active in-app live session for a bootcamp (if any) + the viewer's role.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const bootcampId = Number(new URL(request.url).searchParams.get('bootcampId'));
  if (!bootcampId) return Response.json({ error: 'bootcampId is required' }, { status: 400 });

  if (!(await canViewBootcamp(env.DB, user, bootcampId))) {
    return Response.json({ error: 'You are not part of this bootcamp' }, { status: 403 });
  }

  const session = await env.DB.prepare(
    "SELECT id, title, started_at FROM live_sessions WHERE bootcamp_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1",
  ).bind(bootcampId).first<{ id: number; title: string; started_at: string }>();

  return Response.json({
    canManage: await canManageBootcamp(env.DB, user, bootcampId),
    session: session || null,
  });
};

// POST /api/bootcamps/live-class
//   { bootcampId, title }            -> start a live class (managers/super admins)
//   { action: 'end', sessionId }     -> end the live class (managers/super admins)
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json<{ bootcampId?: number; title?: string; action?: string; sessionId?: number }>().catch(() => null);
  if (!body) return Response.json({ error: 'Invalid request body' }, { status: 400 });

  if (body.action === 'end') {
    const sessionId = Number(body.sessionId);
    if (!sessionId) return Response.json({ error: 'sessionId is required' }, { status: 400 });
    const row = await env.DB.prepare('SELECT id, bootcamp_id FROM live_sessions WHERE id = ?').bind(sessionId).first<{ id: number; bootcamp_id: number | null }>();
    if (!row || !row.bootcamp_id) return Response.json({ error: 'Session not found' }, { status: 404 });
    if (!(await canManageBootcamp(env.DB, user, row.bootcamp_id))) {
      return Response.json({ error: 'Only the bootcamp manager can end the live class' }, { status: 403 });
    }
    await env.DB.prepare("UPDATE live_sessions SET status = 'ended', ended_at = datetime('now') WHERE id = ?").bind(sessionId).run();
    return Response.json({ success: true });
  }

  const bootcampId = Number(body.bootcampId);
  if (!bootcampId) return Response.json({ error: 'bootcampId is required' }, { status: 400 });
  if (!(await canManageBootcamp(env.DB, user, bootcampId))) {
    return Response.json({ error: 'Only the bootcamp manager can start a live class' }, { status: 403 });
  }

  // Reuse an already-active session rather than stacking duplicates.
  const existing = await env.DB.prepare(
    "SELECT id FROM live_sessions WHERE bootcamp_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1",
  ).bind(bootcampId).first<{ id: number }>();
  if (existing) return Response.json({ id: existing.id, reused: true });

  const title = (body.title || 'Bootcamp Live Class').slice(0, 200);
  // class_id is NOT NULL in the schema; bootcamp sessions use 0 as a sentinel.
  const result = await env.DB.prepare(
    "INSERT INTO live_sessions (class_id, tutor_id, title, status, bootcamp_id) VALUES (0, ?, ?, 'active', ?)",
  ).bind(user.id, title, bootcampId).run();

  return Response.json({ id: result.meta.last_row_id }, { status: 201 });
};
