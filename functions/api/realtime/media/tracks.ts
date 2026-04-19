import type {
  RealtimeMediaTrackRequest,
  RealtimeMediaTracksResponse,
  RealtimeSessionDescription,
} from '../../../../lib/liveClassroomProtocol';
import { addCloudflareTracks, type CloudflareRealtimeEnv } from '../../../_shared/cloudflareRealtime';
import { getAuthorizedLiveSession } from '../../../_shared/liveClassroom';

interface Env extends CloudflareRealtimeEnv {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json().catch(() => null)) as {
    session_id?: number;
    media_session_id?: string;
    sessionDescription?: RealtimeSessionDescription;
    tracks?: RealtimeMediaTrackRequest[];
  } | null;

  if (!body?.session_id || !body.media_session_id || !body.tracks?.length) {
    return Response.json({ error: 'session_id, media_session_id, and tracks are required' }, { status: 400 });
  }

  const authorized = await getAuthorizedLiveSession(request, env.DB, body.session_id);
  if ('error' in authorized) {
    return authorized.error;
  }

  try {
    const response = await addCloudflareTracks(env, body.media_session_id, {
      sessionDescription: body.sessionDescription,
      tracks: body.tracks,
    });

    const payload: RealtimeMediaTracksResponse = {
      requiresImmediateRenegotiation: Boolean(response.requiresImmediateRenegotiation),
      sessionDescription: response.sessionDescription ?? null,
      tracks: (response.tracks || []).map((track) => ({
        location: track.location,
        mid: track.mid,
        mediaSessionId: track.sessionId,
        trackName: track.trackName,
        kind: track.kind,
        errorCode: track.errorCode,
        errorDescription: track.errorDescription,
      })),
    };

    return Response.json(payload);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to add Cloudflare Realtime tracks' },
      { status: 503 },
    );
  }
};