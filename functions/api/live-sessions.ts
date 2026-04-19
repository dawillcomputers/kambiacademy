import { getAuthUser, requireSubscription } from '../_shared/auth';
import { getTeacherLiveHoursUsage } from '../_shared/liveUsage';

interface Env { DB: D1Database }

// GET  /api/live-sessions           → list active sessions for user's classes
// GET  /api/live-sessions?id=X      → get session detail
// POST /api/live-sessions           → start a live session (teacher only)
// PATCH /api/live-sessions          → end a live session (teacher only)
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const db = env.DB;
  const user = await getAuthUser(request, db);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);

  // GET
  if (request.method === 'GET') {
    const sessionId = url.searchParams.get('id');

    if (sessionId) {
      // Get specific session + check membership
      const session = await db.prepare(
        `SELECT ls.*, pc.title as class_title, pc.tutor_id as class_tutor_id
         FROM live_sessions ls
         JOIN private_classes pc ON ls.class_id = pc.id
         WHERE ls.id = ?`
      ).bind(sessionId).first();

      if (!session) return Response.json({ error: 'Session not found' }, { status: 404 });

      // Check: user is tutor OR member of the class
      const isTutor = session.tutor_id === user.id;
      const isMember = await db.prepare(
        `SELECT 1 FROM private_class_members WHERE class_id = ? AND user_id = ?`
      ).bind(session.class_id, user.id).first();

      if (!isTutor && !isMember) {
        return Response.json({ error: 'You are not a member of this class' }, { status: 403 });
      }

      // Get participants (class members + tutor)
      const members = await db.prepare(
        `SELECT u.id, u.name, u.role FROM users u
         JOIN private_class_members pcm ON u.id = pcm.user_id
         WHERE pcm.class_id = ?
         UNION
         SELECT u.id, u.name, u.role FROM users u WHERE u.id = ?`
      ).bind(session.class_id, session.tutor_id).all();

      // Get recent messages
      const messages = await db.prepare(
        `SELECT * FROM live_messages WHERE session_id = ? ORDER BY created_at ASC LIMIT 200`
      ).bind(sessionId).all();

      return Response.json({ session, participants: members.results, messages: messages.results });
    }

    // List active sessions for classes the user belongs to
    let sessions;
    if (user.role === 'teacher') {
      sessions = await db.prepare(
        `SELECT ls.*, pc.title as class_title,
          (SELECT COUNT(*) FROM private_class_members WHERE class_id = ls.class_id) as member_count
         FROM live_sessions ls
         JOIN private_classes pc ON ls.class_id = pc.id
         WHERE ls.status = 'active' AND (
           pc.tutor_id = ?
           OR EXISTS (SELECT 1 FROM private_class_members WHERE class_id = ls.class_id AND user_id = ?)
         )
         ORDER BY ls.started_at DESC`
      ).bind(user.id, user.id).all();
    } else {
      sessions = await db.prepare(
        `SELECT ls.*, pc.title as class_title,
          (SELECT COUNT(*) FROM private_class_members WHERE class_id = ls.class_id) as member_count
         FROM live_sessions ls
         JOIN private_classes pc ON ls.class_id = pc.id
         WHERE ls.status = 'active' AND (
           EXISTS (SELECT 1 FROM private_class_members WHERE class_id = ls.class_id AND user_id = ?)
         )
         ORDER BY ls.started_at DESC`
      ).bind(user.id).all();
    }

    return Response.json({ sessions: sessions.results });
  }

  // POST — start a live session
  if (request.method === 'POST') {
    if (user.role !== 'teacher') {
      return Response.json({ error: 'Only teachers can start live sessions' }, { status: 403 });
    }

    // Check live class subscription for teachers
    const subscriptionError = await requireSubscription(request, db, 'live_class');
    if (subscriptionError) {
      return subscriptionError;
    }

    const liveHours = await getTeacherLiveHoursUsage(db, user.id);
    if (liveHours.blocked) {
      return Response.json({
        error: 'Live class hours limit reached for this month',
        message: 'Your live classroom allowance has been exhausted. Pay any due teacher fees or wait until the monthly reset before starting another session.',
        liveHours,
      }, { status: 402 });
    }

    const body = await request.json<{ class_id: number; title?: string }>();
    if (!body.class_id) return Response.json({ error: 'class_id is required' }, { status: 400 });

    // Verify teacher owns this class
    const cls = await db.prepare(
      `SELECT id, title FROM private_classes WHERE id = ? AND tutor_id = ?`
    ).bind(body.class_id, user.id).first();

    if (!cls) return Response.json({ error: 'Class not found or you are not the tutor' }, { status: 404 });

    // Check no active session already exists for this class
    const existing = await db.prepare(
      `SELECT id FROM live_sessions WHERE class_id = ? AND status = 'active'`
    ).bind(body.class_id).first();

    if (existing) return Response.json({ error: 'A live session is already active for this class' }, { status: 409 });

    const title = body.title || `Live Class: ${cls.title}`;
    const result = await db.prepare(
      `INSERT INTO live_sessions (class_id, tutor_id, title) VALUES (?, ?, ?)`
    ).bind(body.class_id, user.id, title).run();

    return Response.json({ id: result.meta.last_row_id, message: 'Live session started' });
  }

  // PATCH — end a live session
  if (request.method === 'PATCH') {
    if (user.role !== 'teacher') {
      return Response.json({ error: 'Only teachers can end live sessions' }, { status: 403 });
    }

    const body = await request.json<{ session_id: number }>();
    if (!body.session_id) return Response.json({ error: 'session_id is required' }, { status: 400 });

    const session = await db.prepare(
      `SELECT id FROM live_sessions WHERE id = ? AND tutor_id = ? AND status = 'active'`
    ).bind(body.session_id, user.id).first();

    if (!session) return Response.json({ error: 'Active session not found' }, { status: 404 });

    await db.prepare(
      `UPDATE live_sessions SET status = 'ended', ended_at = datetime('now') WHERE id = ?`
    ).bind(body.session_id).run();

    return Response.json({ message: 'Session ended' });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};
