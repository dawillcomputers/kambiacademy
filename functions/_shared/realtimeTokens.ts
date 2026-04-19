import type { LiveRoomRole, ParticipantMediaState } from '../../lib/liveClassroomProtocol';

export interface RealtimeJoinTokenPayload {
  roomId: string;
  sessionId: number;
  participantId: string;
  userId: number;
  name: string;
  role: LiveRoomRole;
  media: ParticipantMediaState;
  exp: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const bytesToBase64Url = (bytes: Uint8Array): string => {
  let value = '';
  for (const byte of bytes) {
    value += String.fromCharCode(byte);
  }

  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const base64UrlToBytes = (value: string): Uint8Array => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const binary = atob(`${normalized}${padding}`);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

async function importSigningKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function createRealtimeJoinToken(payload: RealtimeJoinTokenPayload, secret: string): Promise<string> {
  const payloadBytes = encoder.encode(JSON.stringify(payload));
  const key = await importSigningKey(secret);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, payloadBytes));
  return `${bytesToBase64Url(payloadBytes)}.${bytesToBase64Url(signature)}`;
}

export async function verifyRealtimeJoinToken(token: string, secret: string): Promise<RealtimeJoinTokenPayload | null> {
  const [encodedPayload, encodedSignature] = token.split('.');
  if (!encodedPayload || !encodedSignature) {
    return null;
  }

  try {
    const payloadBytes = base64UrlToBytes(encodedPayload);
    const signature = base64UrlToBytes(encodedSignature);
    const key = await importSigningKey(secret);
    const isValid = await crypto.subtle.verify('HMAC', key, signature, payloadBytes);
    if (!isValid) {
      return null;
    }

    const payload = JSON.parse(decoder.decode(payloadBytes)) as RealtimeJoinTokenPayload;
    if (!payload.exp || payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}