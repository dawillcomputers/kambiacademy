import { getAuthUser } from '../../_shared/auth';
import { canManageBootcamp, canViewBootcamp } from '../../_shared/bootcamp';
import { recordActivity } from '../../_shared/activity';

interface Env {
  DB: D1Database;
}

interface LiveBody {
  id?: number;
  bootcamp_id?: number;
  title?: string;
  description?: string;
  provider?: 'zoom' | 'meet' | 'teams' | 'other';
  url?: string;
  meeting_id?: string;
  passcode?: string;
  starts_at?: string;
  duration_minutes?: number;
  status?: 'scheduled' | 'live' | 'ended';
}

const PROVIDERS = ['zoom', 'meet', 'teams', 'other'];

// GET /api/bootcamps/live-sessions?bootcamp=ID — upcoming + past sessions for participants/managers.
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
    `SELECT * FROM bootcamp_live_sessions WHERE bootcamp_id = ?
     ORDER BY (starts_at IS NULL), starts_at ASC, created_at DESC`,
  ).bind(bootcampId).all();

  return Response.json({ sessions: results });
};

// POST /api/bootcamps/live-sessions — manager/super admin schedules a session.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json<LiveBody>();
  if (!body.bootcamp_id || !body.title?.trim()) {
    return Response.json({ error: 'bootcamp_id and title are required.' }, { status: 400 });
  }
  if (!(await canManageBootcamp(env.DB, user, body.bootcamp_id))) {
    return Response.json({ error: 'You cannot manage this bootcamp.' }, { status: 403 });
  }

  const provider = PROVIDERS.includes(body.provider || '') ? body.provider! : 'zoom';
  const result = await env.DB.prepare(
    `INSERT INTO bootcamp_live_sessions (bootcamp_id, title, description, provider, url, meeting_id, passcode, starts_at, duration_minutes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    body.bootcamp_id, body.title.trim(), body.description || '', provider, body.url || '',
    body.meeting_id || '', body.passcode || '', body.starts_at || null, Number(body.duration_minutes || 60), user.id,
  ).run();

  const id = Number(result.meta.last_row_id);
  await recordActivity(env.DB, {
    bootcampId: body.bootcamp_id,
    type: 'live',
    title: `Live session scheduled: ${body.title.trim()}`,
    body: body.starts_at ? `Starts ${new Date(body.starts_at).toLocaleString()}` : 'Check the Live tab to join.',
    link: '#live',
    refId: id,
    createdBy: user.id,
  });

  return Response.json({ message: 'Live session scheduled.', id }, { status: 201 });
};

// PATCH /api/bootcamps/live-sessions — update details or status.
export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json<LiveBody>();
  if (!body.id) return Response.json({ error: 'A session id is required.' }, { status: 400 });

  const session = await env.DB.prepare('SELECT bootcamp_id FROM bootcamp_live_sessions WHERE id = ?').bind(body.id).first<{ bootcamp_id: number }>();
  if (!session) return Response.json({ error: 'Session not found.' }, { status: 404 });
  if (!(await canManageBootcamp(env.DB, user, session.bootcamp_id))) {
    return Response.json({ error: 'You cannot manage this bootcamp.' }, { status: 403 });
  }

  const updates: string[] = [];
  const binds: unknown[] = [];
  const set = (col: string, val: unknown) => { updates.push(`${col} = ?`); binds.push(val); };
  if (body.title !== undefined) set('title', body.title);
  if (body.description !== undefined) set('description', body.description);
  if (body.provider !== undefined) set('provider', PROVIDERS.includes(body.provider) ? body.provider : 'zoom');
  if (body.url !== undefined) set('url', body.url);
  if (body.meeting_id !== undefined) set('meeting_id', body.meeting_id);
  if (body.passcode !== undefined) set('passcode', body.passcode);
  if (body.starts_at !== undefined) set('starts_at', body.starts_at || null);
  if (body.duration_minutes !== undefined) set('duration_minutes', Number(body.duration_minutes));
  if (body.status !== undefined) set('status', body.status);

  if (updates.length === 0) return Response.json({ message: 'Nothing to update.' });
  binds.push(body.id);
  await env.DB.prepare(`UPDATE bootcamp_live_sessions SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run();
  return Response.json({ message: 'Session updated.' });
};

// DELETE /api/bootcamps/live-sessions?id=
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id'));
  if (!id) return Response.json({ error: 'A session id is required.' }, { status: 400 });

  const session = await env.DB.prepare('SELECT bootcamp_id FROM bootcamp_live_sessions WHERE id = ?').bind(id).first<{ bootcamp_id: number }>();
  if (!session) return Response.json({ error: 'Session not found.' }, { status: 404 });
  if (!(await canManageBootcamp(env.DB, user, session.bootcamp_id))) {
    return Response.json({ error: 'You cannot manage this bootcamp.' }, { status: 403 });
  }

  await env.DB.prepare('DELETE FROM bootcamp_live_sessions WHERE id = ?').bind(id).run();
  return Response.json({ message: 'Session removed.' });
};
