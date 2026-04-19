import type { RealtimeMediaSessionResponse, RealtimeSessionDescription } from '../../../../lib/liveClassroomProtocol';
import { createCloudflareSession, type CloudflareRealtimeEnv } from '../../../_shared/cloudflareRealtime';
import { getAuthorizedLiveSession } from '../../../_shared/liveClassroom';

interface Env extends CloudflareRealtimeEnv {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json().catch(() => null)) as {
    session_id?: number;
    sessionDescription?: RealtimeSessionDescription;
  } | null;

  if (!body?.session_id) {
    return Response.json({ error: 'session_id is required' }, { status: 400 });
  }

  const authorized = await getAuthorizedLiveSession(request, env.DB, body.session_id);
  if ('error' in authorized) {
    return authorized.error;
  }

  try {
    const response = await createCloudflareSession(env, {
      sessionDescription: body.sessionDescription,
      correlationId: `${authorized.session.id}:${authorized.user.id}:${crypto.randomUUID()}`,
    });

    const payload: RealtimeMediaSessionResponse = {
      mediaSessionId: response.sessionId,
      sessionDescription: response.sessionDescription ?? null,
    };

    return Response.json(payload);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to create Cloudflare Realtime session' },
      { status: 503 },
    );
  }
};