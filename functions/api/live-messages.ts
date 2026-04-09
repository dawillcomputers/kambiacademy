import { getAuthUser } from '../_shared/auth';

interface Env { DB: D1Database }

// GET  /api/live-messages?session_id=X&after=Y  → poll new messages
// POST /api/live-messages                       → send a message
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const db = env.DB;
  const user = await getAuthUser(request, db);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);

  if (request.method === 'GET') {
    const sessionId = url.searchParams.get('session_id');
    const afterId = url.searchParams.get('after') || '0';

    if (!sessionId) return Response.json({ error: 'session_id required' }, { status: 400 });

    // Verify membership
    const session = await db.prepare(
      `SELECT ls.class_id, ls.tutor_id FROM live_sessions ls WHERE ls.id = ? AND ls.status = 'active'`
    ).bind(sessionId).first<{ class_id: number; tutor_id: number }>();

    if (!session) return Response.json({ error: 'Session not found or ended' }, { status: 404 });

    const isTutor = session.tutor_id === user.id;
    const isMember = await db.prepare(
      `SELECT 1 FROM private_class_members WHERE class_id = ? AND user_id = ?`
    ).bind(session.class_id, user.id).first();

    if (!isTutor && !isMember) {
      return Response.json({ error: 'Not a member of this class' }, { status: 403 });
    }

    const messages = await db.prepare(
      `SELECT * FROM live_messages WHERE session_id = ? AND id > ? ORDER BY created_at ASC LIMIT 100`
    ).bind(sessionId, afterId).all();

    return Response.json({ messages: messages.results });
  }

  if (request.method === 'POST') {
    const body = await request.json<{ session_id: number; text: string }>();
    if (!body.session_id || !body.text?.trim()) {
      return Response.json({ error: 'session_id and text are required' }, { status: 400 });
    }

    // Verify session is active and user is a member
    const session = await db.prepare(
      `SELECT ls.class_id, ls.tutor_id FROM live_sessions ls WHERE ls.id = ? AND ls.status = 'active'`
    ).bind(body.session_id).first<{ class_id: number; tutor_id: number }>();

    if (!session) return Response.json({ error: 'Session not found or ended' }, { status: 404 });

    const isTutor = session.tutor_id === user.id;
    const isMember = await db.prepare(
      `SELECT 1 FROM private_class_members WHERE class_id = ? AND user_id = ?`
    ).bind(session.class_id, user.id).first();

    if (!isTutor && !isMember) {
      return Response.json({ error: 'Not a member of this class' }, { status: 403 });
    }

    const text = body.text.trim().slice(0, 2000);
    const result = await db.prepare(
      `INSERT INTO live_messages (session_id, user_id, user_name, text) VALUES (?, ?, ?, ?)`
    ).bind(body.session_id, user.id, user.name, text).run();

    return Response.json({
      id: result.meta.last_row_id,
      session_id: body.session_id,
      user_id: user.id,
      user_name: user.name,
      text,
      created_at: new Date().toISOString(),
    });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};
