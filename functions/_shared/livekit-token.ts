import { AccessToken } from 'livekit-server-sdk';

export interface Env {
  LIVEKIT_API_KEY: string;
  LIVEKIT_API_SECRET: string;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { room, identity, name, role } = await req.json();

      if (!identity || !room) {
        return new Response('Missing required fields', { status: 400 });
      }

      const at = new AccessToken(
        env.LIVEKIT_API_KEY,
        env.LIVEKIT_API_SECRET,
        {
          identity,
          name,
          metadata: JSON.stringify({ role }),
        }
      );

      at.addGrant({
        roomJoin: true,
        room,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      const token = await at.toJwt();

      return new Response(JSON.stringify({ token }), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error('Error generating token:', error);
      return new Response('Internal server error', { status: 500 });
    }
  }
};