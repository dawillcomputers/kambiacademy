import type { RealtimeSessionDescription } from '../../../../lib/liveClassroomProtocol';
import { renegotiateCloudflareSession, type CloudflareRealtimeEnv } from '../../../_shared/cloudflareRealtime';
import { getAuthorizedLiveSession } from '../../../_shared/liveClassroom';

interface Env extends CloudflareRealtimeEnv {
  DB: D1Database;
}

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json().catch(() => null)) as {
    session_id?: number;
    media_session_id?: string;
    sessionDescription?: RealtimeSessionDescription;
  } | null;

  if (!body?.session_id || !body.media_session_id || !body.sessionDescription) {
    return Response.json({ error: 'session_id, media_session_id, and sessionDescription are required' }, { status: 400 });
  }

  const authorized = await getAuthorizedLiveSession(request, env.DB, body.session_id);
  if ('error' in authorized) {
    return authorized.error;
  }

  try {
    const response = await renegotiateCloudflareSession(env, body.media_session_id, body.sessionDescription);
    return Response.json({ sessionDescription: response.sessionDescription ?? null });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to renegotiate Cloudflare Realtime session' },
      { status: 503 },
    );
  }
};