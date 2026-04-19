import { DurableObject } from 'cloudflare:workers';
import type {
  LiveRoomTrackPublication,
  LiveRoomParticipant,
  LiveRoomRole,
  LiveRoomSnapshot,
  ParticipantMediaState,
  RealtimeChatMessage,
  RoomClientEvent,
  RoomNotice,
  RoomServerEvent,
} from '../../../lib/liveClassroomProtocol';

interface Env {
  DB: D1Database;
}

interface StoredParticipantAttachment {
  roomId: string;
  sessionId: number;
  participant: LiveRoomParticipant;
}

const MAX_NOTICES = 12;

const isTruthy = (value: string | null) => value === 'true';

const decodeName = (value: string | null) => decodeURIComponent(value || 'Guest');

const sortParticipants = (participants: LiveRoomParticipant[]) => participants.sort((left, right) => {
  if (left.role === right.role) {
    return left.joinedAt.localeCompare(right.joinedAt);
  }

  if (left.role === 'teacher') {
    return -1;
  }

  if (right.role === 'teacher') {
    return 1;
  }

  return left.name.localeCompare(right.name);
});

export class ClassroomRoom extends DurableObject {
  private readonly appEnv: Env;

  private participants = new Map<WebSocket, LiveRoomParticipant>();

  private notices: RoomNotice[] = [];

  private roomId = 'unassigned-room';

  private sessionId = 0;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.appEnv = env;

    for (const socket of this.ctx.getWebSockets()) {
      const attachment = socket.deserializeAttachment() as StoredParticipantAttachment | null;
      if (!attachment) {
        continue;
      }

      this.roomId = attachment.roomId;
      this.sessionId = attachment.sessionId;
      this.participants.set(socket, attachment.participant);
    }
  }

  async fetch(request: Request): Promise<Response> {
    const upgrade = request.headers.get('Upgrade');
    if (!upgrade || upgrade.toLowerCase() !== 'websocket') {
      return Response.json(
        {
          ok: true,
          roomId: this.roomId,
          sessionId: this.sessionId,
          participants: this.participants.size,
        },
        { status: 200 },
      );
    }

    const roomId = request.headers.get('x-classroom-room-id');
    const sessionId = Number(request.headers.get('x-classroom-session-id'));
    const participantId = request.headers.get('x-classroom-participant-id');
    const userId = Number(request.headers.get('x-classroom-user-id'));
    const name = decodeName(request.headers.get('x-classroom-user-name'));
    const role = (request.headers.get('x-classroom-user-role') || 'student') as LiveRoomRole;

    if (!roomId || !sessionId || !participantId || !userId) {
      return Response.json({ error: 'Missing room metadata' }, { status: 400 });
    }

    this.roomId = roomId;
    this.sessionId = sessionId;

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);

    const participant: LiveRoomParticipant = {
      participantId,
      userId,
      name,
      role,
      joinedAt: new Date().toISOString(),
      handRaised: false,
      connectionState: 'connected',
      media: {
        audioEnabled: isTruthy(request.headers.get('x-classroom-audio-enabled')),
        videoEnabled: isTruthy(request.headers.get('x-classroom-video-enabled')),
        screenShareEnabled: isTruthy(request.headers.get('x-classroom-screen-enabled')),
      },
      publications: [],
    };

    this.persistParticipant(server, participant);
    this.sendToSocket(server, { type: 'presence.sync', room: this.snapshot() });
    this.broadcast({ type: 'participant.joined', participant }, server);
    this.publishNotice(`${participant.name} joined the classroom.`);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') {
      return;
    }

    let event: RoomServerEvent;
    try {
      event = JSON.parse(message) as RoomServerEvent;
    } catch {
      this.sendToSocket(socket, {
        type: 'room.notice',
        notice: this.createNotice('warning', 'Received malformed realtime payload.'),
      });
      return;
    }

    const currentParticipant = this.participants.get(socket);
    if (!currentParticipant) {
      return;
    }

    switch (event.type) {
      case 'chat.send': {
        const text = event.text.trim();
        if (!text) {
          return;
        }

        const createdAt = new Date().toISOString();
        const result = await this.appEnv.DB.prepare(
          `INSERT INTO live_messages (session_id, user_id, user_name, text, created_at)
           VALUES (?, ?, ?, ?, ?)`,
        ).bind(this.sessionId, currentParticipant.userId, currentParticipant.name, text.slice(0, 2000), createdAt).run();

        const chatMessage: RealtimeChatMessage = {
          id: String(result.meta.last_row_id ?? crypto.randomUUID()),
          sessionId: this.sessionId,
          userId: currentParticipant.userId,
          userName: currentParticipant.name,
          text: text.slice(0, 2000),
          createdAt,
        };

        this.broadcast({ type: 'chat.message', message: chatMessage });
        break;
      }
      case 'hand.raise': {
        const nextParticipant: LiveRoomParticipant = {
          ...currentParticipant,
          handRaised: event.raised,
        };
        this.persistParticipant(socket, nextParticipant);
        this.broadcast({ type: 'participant.updated', participant: nextParticipant });
        break;
      }
      case 'media.update': {
        const nextPublications = Array.isArray(event.publications)
          ? event.publications.filter((publication): publication is LiveRoomTrackPublication => Boolean(publication?.mediaSessionId && publication.trackName && publication.kind))
          : currentParticipant.publications;

        const nextMedia: ParticipantMediaState = {
          audioEnabled: Boolean(event.media.audioEnabled),
          videoEnabled: Boolean(event.media.videoEnabled),
          screenShareEnabled: Boolean(event.media.screenShareEnabled),
        };

        const nextParticipant: LiveRoomParticipant = {
          ...currentParticipant,
          media: nextMedia,
          mediaSessionId: event.mediaSessionId || currentParticipant.mediaSessionId,
          publications: nextPublications,
        };

        this.persistParticipant(socket, nextParticipant);
        this.broadcast({ type: 'participant.updated', participant: nextParticipant });
        break;
      }
      case 'room.ping': {
        this.sendToSocket(socket, { type: 'room.pong', at: new Date().toISOString() });
        break;
      }
      default:
        break;
    }
  }

  webSocketClose(socket: WebSocket): void {
    this.handleDisconnect(socket);
  }

  webSocketError(socket: WebSocket): void {
    this.handleDisconnect(socket);
  }

  private handleDisconnect(socket: WebSocket) {
    const participant = this.participants.get(socket);
    if (!participant) {
      return;
    }

    this.participants.delete(socket);
    this.broadcast({ type: 'participant.left', participantId: participant.participantId });
    this.publishNotice(`${participant.name} left the classroom.`);
  }

  private broadcast(event: RoomClientEvent, except?: WebSocket) {
    const payload = JSON.stringify(event);
    for (const socket of this.participants.keys()) {
      if (except && socket === except) {
        continue;
      }

      socket.send(payload);
    }
  }

  private createNotice(level: RoomNotice['level'], message: string): RoomNotice {
    return {
      id: crypto.randomUUID(),
      level,
      message,
      createdAt: new Date().toISOString(),
    };
  }

  private publishNotice(message: string) {
    const notice = this.createNotice('info', message);
    this.notices = [...this.notices.slice(-(MAX_NOTICES - 1)), notice];
    this.broadcast({ type: 'room.notice', notice });
  }

  private persistParticipant(socket: WebSocket, participant: LiveRoomParticipant) {
    this.participants.set(socket, participant);
    socket.serializeAttachment({
      roomId: this.roomId,
      sessionId: this.sessionId,
      participant,
    } satisfies StoredParticipantAttachment);
  }

  private sendToSocket(socket: WebSocket, event: RoomClientEvent) {
    socket.send(JSON.stringify(event));
  }

  private snapshot(): LiveRoomSnapshot {
    return {
      roomId: this.roomId,
      sessionId: this.sessionId,
      participants: sortParticipants([...this.participants.values()]),
      notices: this.notices,
      updatedAt: new Date().toISOString(),
    };
  }
}

export default {
  fetch() {
    return Response.json({
      service: 'kambiacademy-realtime',
      status: 'ok',
    });
  },
};