import type { LiveSessionSummary, RealtimeChatMessage } from '../../lib/liveClassroomProtocol';
import { getAuthUser } from './auth';

interface AuthorizedSessionRow {
  id: number;
  class_id: number;
  tutor_id: number;
  title: string;
  status: string;
  started_at: string;
  class_title: string;
}

interface ChatMessageRow {
  id: number;
  session_id: number;
  user_id: number;
  user_name: string;
  text: string;
  created_at: string;
}

export async function getAuthorizedLiveSession(request: Request, db: D1Database, sessionId: number) {
  const user = await getAuthUser(request, db);
  if (!user) {
    return {
      error: Response.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const session = await db.prepare(
    `SELECT ls.id, ls.class_id, ls.tutor_id, ls.title, ls.status, ls.started_at, pc.title AS class_title
     FROM live_sessions ls
     JOIN private_classes pc ON pc.id = ls.class_id
     WHERE ls.id = ?`,
  ).bind(sessionId).first<AuthorizedSessionRow>();

  if (!session || session.status !== 'active') {
    return {
      error: Response.json({ error: 'Active session not found' }, { status: 404 }),
    };
  }

  const isTutor = session.tutor_id === user.id;
  const isMember = await db.prepare(
    'SELECT 1 FROM private_class_members WHERE class_id = ? AND user_id = ?',
  ).bind(session.class_id, user.id).first();

  if (!isTutor && !isMember) {
    return {
      error: Response.json({ error: 'You are not a member of this live class' }, { status: 403 }),
    };
  }

  const summary: LiveSessionSummary = {
    id: session.id,
    classId: session.class_id,
    tutorId: session.tutor_id,
    title: session.title,
    classTitle: session.class_title,
    startedAt: session.started_at,
    isTeacher: isTutor,
  };

  return {
    user,
    session: summary,
  };
}

export async function getLiveChatHistory(db: D1Database, sessionId: number, limit = 100): Promise<RealtimeChatMessage[]> {
  const rows = await db.prepare(
    `SELECT id, session_id, user_id, user_name, text, created_at
     FROM live_messages
     WHERE session_id = ?
     ORDER BY created_at ASC
     LIMIT ?`,
  ).bind(sessionId, limit).all<ChatMessageRow>();

  return (rows.results || []).map(mapChatMessageRow);
}

export function mapChatMessageRow(row: ChatMessageRow): RealtimeChatMessage {
  return {
    id: String(row.id),
    sessionId: row.session_id,
    userId: row.user_id,
    userName: row.user_name,
    text: row.text,
    createdAt: row.created_at,
  };
}