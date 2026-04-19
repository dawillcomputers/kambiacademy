import { buildLiveRoomId } from '../../../lib/liveClassroomProtocol';
import { verifyRealtimeJoinToken } from '../../_shared/realtimeTokens';

interface Env {
  CLASSROOM_ROOMS: DurableObjectNamespace;
  REALTIME_JOIN_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.REALTIME_JOIN_SECRET) {
    return Response.json({ error: 'Realtime join secret is not configured' }, { status: 503 });
  }

  const upgrade = request.headers.get('Upgrade');
  if (!upgrade || upgrade.toLowerCase() !== 'websocket') {
    return new Response('Expected Upgrade: websocket', { status: 426 });
  }

  const token = new URL(request.url).searchParams.get('token');
  if (!token) {
    return Response.json({ error: 'Realtime token is required' }, { status: 400 });
  }

  const payload = await verifyRealtimeJoinToken(token, env.REALTIME_JOIN_SECRET);
  if (!payload) {
    return Response.json({ error: 'Invalid or expired realtime token' }, { status: 401 });
  }

  const roomId = payload.roomId || buildLiveRoomId(payload.sessionId);
  const durableObjectId = env.CLASSROOM_ROOMS.idFromName(roomId);
  const stub = env.CLASSROOM_ROOMS.get(durableObjectId);
  const headers = new Headers(request.headers);
  headers.set('x-classroom-room-id', roomId);
  headers.set('x-classroom-session-id', String(payload.sessionId));
  headers.set('x-classroom-participant-id', payload.participantId);
  headers.set('x-classroom-user-id', String(payload.userId));
  headers.set('x-classroom-user-name', encodeURIComponent(payload.name));
  headers.set('x-classroom-user-role', payload.role);
  headers.set('x-classroom-audio-enabled', String(payload.media.audioEnabled));
  headers.set('x-classroom-video-enabled', String(payload.media.videoEnabled));
  headers.set('x-classroom-screen-enabled', String(payload.media.screenShareEnabled));

  const proxyRequest = new Request('https://classroom.internal/connect', {
    method: 'GET',
    headers,
  });

  return stub.fetch(proxyRequest);
};