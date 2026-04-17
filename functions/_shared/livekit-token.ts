import { AccessToken } from 'livekit-server-sdk';

export interface Env {
  LIVEKIT_API_KEY: string;
  LIVEKIT_API_SECRET: string;
}

export interface LiveKitTokenPayload {
  room: string;
  identity: string;
  name?: string;
  role?: string;
}

function isTokenPayload(value: unknown): value is LiveKitTokenPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return typeof payload.room === 'string' && typeof payload.identity === 'string';
}

export async function createLiveKitToken(env: Env, payload: LiveKitTokenPayload): Promise<string> {
  if (!env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
    throw new Error('LiveKit credentials are not configured');
  }

  const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity: payload.identity,
    name: payload.name,
    metadata: JSON.stringify({ role: payload.role || 'participant' }),
  });

  token.addGrant({
    roomJoin: true,
    room: payload.room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return token.toJwt();
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const body = await req.json();
      if (!isTokenPayload(body)) {
        return new Response('Missing required fields', { status: 400 });
      }

      const token = await createLiveKitToken(env, body);
      return new Response(JSON.stringify({ token }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error generating token:', error);
      return new Response('Internal server error', { status: 500 });
    }
  },
};