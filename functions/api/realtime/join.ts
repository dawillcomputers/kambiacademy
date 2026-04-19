import { buildLiveRoomId, type ParticipantMediaState, type RealtimeJoinResponse } from '../../../lib/liveClassroomProtocol';
import { getAuthorizedLiveSession, getLiveChatHistory } from '../../_shared/liveClassroom';
import { createRealtimeJoinToken } from '../../_shared/realtimeTokens';

interface Env {
  DB: D1Database;
  REALTIME_JOIN_SECRET?: string;
  CLOUDFLARE_REALTIME_APP_ID?: string;
  CLOUDFLARE_REALTIME_APP_SECRET?: string;
}

const normalizeRole = (role: string): RealtimeJoinResponse['participant']['role'] => {
  if (role === 'teacher' || role === 'admin' || role === 'super_admin') {
    return role;
  }

  return 'student';
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.REALTIME_JOIN_SECRET) {
    return Response.json({ error: 'Realtime join secret is not configured' }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { session_id?: number } | null;
  if (!body?.session_id) {
    return Response.json({ error: 'session_id is required' }, { status: 400 });
  }

  const authorized = await getAuthorizedLiveSession(request, env.DB, body.session_id);
  if ('error' in authorized && authorized.error) {
    return authorized.error;
  }

  const roomId = buildLiveRoomId(authorized.session.id);
  const participantId = `participant-${crypto.randomUUID()}`;
  const role = normalizeRole(authorized.user.role);
  const realtimeConfigured = Boolean(env.CLOUDFLARE_REALTIME_APP_ID && env.CLOUDFLARE_REALTIME_APP_SECRET);
  const publishDefaults: ParticipantMediaState = {
    audioEnabled: true,
    videoEnabled: role === 'teacher',
    screenShareEnabled: false,
  };

  const joinToken = await createRealtimeJoinToken(
    {
      roomId,
      sessionId: authorized.session.id,
      participantId,
      userId: authorized.user.id,
      name: authorized.user.name,
      role,
      media: publishDefaults,
      exp: Date.now() + (5 * 60 * 1000),
    },
    env.REALTIME_JOIN_SECRET,
  );

  const socketUrl = new URL('/api/realtime/socket', request.url);
  socketUrl.searchParams.set('token', joinToken);
  socketUrl.protocol = socketUrl.protocol === 'https:' ? 'wss:' : 'ws:';

  const response: RealtimeJoinResponse = {
    roomId,
    session: authorized.session,
    participant: {
      participantId,
      userId: authorized.user.id,
      name: authorized.user.name,
      role,
      media: publishDefaults,
      publications: [],
    },
    media: {
      kind: 'managed-sfu',
      vendor: 'cloudflare',
      roomName: roomId,
      signalingMode: 'custom-webrtc',
      status: realtimeConfigured ? 'configured' : 'scaffolded',
      capabilities: {
        audio: true,
        video: true,
        screenShare: true,
      },
      publishDefaults,
    },
    socketUrl: socketUrl.toString(),
    chatHistory: await getLiveChatHistory(env.DB, authorized.session.id),
  };

  return Response.json(response);
};