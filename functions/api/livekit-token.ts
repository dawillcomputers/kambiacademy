import { getAuthUser } from '../_shared/auth';
import { createLiveKitToken } from '../_shared/livekit-token';

interface Env {
  DB: D1Database;
  LIVEKIT_API_KEY: string;
  LIVEKIT_API_SECRET: string;
  LIVEKIT_URL?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { session_id?: number } | null;
  if (!body?.session_id) {
    return Response.json({ error: 'session_id is required' }, { status: 400 });
  }

  const session = await env.DB.prepare(
    `SELECT id, class_id, tutor_id, status
     FROM live_sessions
     WHERE id = ?`,
  ).bind(body.session_id).first<{ id: number; class_id: number; tutor_id: number; status: string }>();

  if (!session || session.status !== 'active') {
    return Response.json({ error: 'Active session not found' }, { status: 404 });
  }

  const isTutor = session.tutor_id === user.id;
  const isMember = await env.DB.prepare(
    `SELECT 1 FROM private_class_members WHERE class_id = ? AND user_id = ?`,
  ).bind(session.class_id, user.id).first();

  if (!isTutor && !isMember) {
    return Response.json({ error: 'You are not a member of this live class' }, { status: 403 });
  }

  if (!env.LIVEKIT_URL) {
    return Response.json({ error: 'LiveKit server URL is not configured' }, { status: 503 });
  }

  const token = await createLiveKitToken(env, {
    room: `session-${session.id}`,
    identity: String(user.id),
    name: user.name,
    role: user.role,
  });

  return Response.json({ token, room: `session-${session.id}`, serverUrl: env.LIVEKIT_URL });
};