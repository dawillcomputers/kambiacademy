import { getAuthUser } from '../_shared/auth';

interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
  attachment?: {
    type: 'image' | 'audio';
    name: string;
    size: number;
    data: string;
  };
}

// In-memory storage for chat messages (in production, use a database)
const chatMessages = new Map<string, ChatMessage[]>();
let messageCounter = 0;

interface Env { DB: D1Database }

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const db = env.DB;

  // For now, we'll use in-memory storage. In production, you'd want to use the database
  // const user = await getAuthUser(request, db);
  // if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);

  if (request.method === 'GET') {
    const roomId = url.searchParams.get('roomId');
    const after = url.searchParams.get('after') || '0';

    if (!roomId) return Response.json({ error: 'roomId required' }, { status: 400 });

    const roomMessages = chatMessages.get(roomId) || [];
    const newMessages = roomMessages.filter(msg => parseInt(msg.id) > parseInt(after));

    return Response.json({ messages: newMessages });
  }

  if (request.method === 'POST') {
    const body = (await request.json()) as { roomId: string; text?: string; userId: string; userName: string; attachment?: { type: 'image' | 'audio'; name: string; size: number; data: string } };

    if (!body.roomId || !body.userId || !body.userName) {
      return Response.json({ error: 'roomId, userId, and userName are required' }, { status: 400 });
    }

    if (!body.text?.trim() && !body.attachment) {
      return Response.json({ error: 'text or attachment is required' }, { status: 400 });
    }

    const message: ChatMessage = {
      id: (++messageCounter).toString(),
      roomId: body.roomId,
      userId: body.userId,
      userName: body.userName,
      text: body.text?.trim() ?? '',
      timestamp: new Date().toISOString(),
      attachment: body.attachment,
    };

    // Store message
    if (!chatMessages.has(body.roomId)) {
      chatMessages.set(body.roomId, []);
    }
    chatMessages.get(body.roomId)!.push(message);

    // Keep only last 100 messages per room
    const roomMessages = chatMessages.get(body.roomId)!;
    if (roomMessages.length > 100) {
      roomMessages.splice(0, roomMessages.length - 100);
    }

    return Response.json({ success: true, message });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};