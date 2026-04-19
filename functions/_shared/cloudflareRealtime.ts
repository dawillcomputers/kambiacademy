import type {
  RealtimeMediaTrackRequest,
  RealtimeSessionDescription,
} from '../../lib/liveClassroomProtocol';

interface CloudflareErrorPayload {
  errorCode?: string;
  errorDescription?: string;
  errors?: Array<{ message?: string }>;
}

interface CloudflareSessionResponse {
  sessionId: string;
  sessionDescription?: RealtimeSessionDescription;
  errorCode?: string;
  errorDescription?: string;
}

interface CloudflareTrackResponse {
  requiresImmediateRenegotiation?: boolean;
  sessionDescription?: RealtimeSessionDescription;
  tracks?: Array<{
    location: 'local' | 'remote';
    mid?: string;
    sessionId?: string;
    trackName: string;
    kind?: 'audio' | 'video';
    errorCode?: string;
    errorDescription?: string;
  }>;
  errorCode?: string;
  errorDescription?: string;
}

export interface CloudflareRealtimeEnv {
  CLOUDFLARE_REALTIME_APP_ID?: string;
  CLOUDFLARE_REALTIME_APP_SECRET?: string;
}

export interface CloudflareTracksRequest {
  sessionDescription?: RealtimeSessionDescription;
  tracks: RealtimeMediaTrackRequest[];
}

const CLOUDFLARE_REALTIME_BASE_URL = 'https://rtc.live.cloudflare.com/v1';

function getCloudflareRealtimeConfig(env: CloudflareRealtimeEnv) {
  if (!env.CLOUDFLARE_REALTIME_APP_ID || !env.CLOUDFLARE_REALTIME_APP_SECRET) {
    throw new Error('Cloudflare Realtime SFU is not configured');
  }

  return {
    appId: env.CLOUDFLARE_REALTIME_APP_ID,
    appSecret: env.CLOUDFLARE_REALTIME_APP_SECRET,
  };
}

function getCloudflareErrorMessage(payload: CloudflareErrorPayload | null, fallback: string) {
  if (payload?.errorDescription) {
    return payload.errorDescription;
  }

  if (payload?.errorCode) {
    return `${fallback}: ${payload.errorCode}`;
  }

  const firstError = payload?.errors?.[0]?.message;
  if (firstError) {
    return firstError;
  }

  return fallback;
}

async function cloudflareRealtimeRequest<T>(
  env: CloudflareRealtimeEnv,
  path: string,
  method: 'GET' | 'POST' | 'PUT',
  body?: unknown,
): Promise<T> {
  const { appId, appSecret } = getCloudflareRealtimeConfig(env);
  const response = await fetch(`${CLOUDFLARE_REALTIME_BASE_URL}/apps/${appId}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${appSecret}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = (await response.json().catch(() => null)) as CloudflareErrorPayload | null;
  if (!response.ok) {
    throw new Error(getCloudflareErrorMessage(payload, 'Cloudflare Realtime request failed'));
  }

  return payload as T;
}

export async function createCloudflareSession(
  env: CloudflareRealtimeEnv,
  options?: { sessionDescription?: RealtimeSessionDescription; correlationId?: string },
) {
  const query = new URLSearchParams();
  if (options?.correlationId) {
    query.set('correlationId', options.correlationId);
  }

  const path = `/sessions/new${query.size ? `?${query.toString()}` : ''}`;
  return cloudflareRealtimeRequest<CloudflareSessionResponse>(env, path, 'POST', {
    ...(options?.sessionDescription ? { sessionDescription: options.sessionDescription } : {}),
  });
}

export async function addCloudflareTracks(
  env: CloudflareRealtimeEnv,
  mediaSessionId: string,
  request: CloudflareTracksRequest,
) {
  return cloudflareRealtimeRequest<CloudflareTrackResponse>(env, `/sessions/${mediaSessionId}/tracks/new`, 'POST', {
    ...(request.sessionDescription ? { sessionDescription: request.sessionDescription } : {}),
    tracks: request.tracks.map((track) => ({
      location: track.location,
      ...(track.mid ? { mid: track.mid } : {}),
      ...(track.mediaSessionId && track.location === 'remote' ? { sessionId: track.mediaSessionId } : {}),
      ...(track.kind ? { kind: track.kind } : {}),
      trackName: track.trackName,
    })),
  });
}

export async function renegotiateCloudflareSession(
  env: CloudflareRealtimeEnv,
  mediaSessionId: string,
  sessionDescription: RealtimeSessionDescription,
) {
  return cloudflareRealtimeRequest<{ sessionDescription?: RealtimeSessionDescription }>(
    env,
    `/sessions/${mediaSessionId}/renegotiate`,
    'PUT',
    { sessionDescription },
  );
}