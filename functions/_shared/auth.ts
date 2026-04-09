export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key,
    256,
  );
  const saltHex = [...salt].map((b) => b.toString(16).padStart(2, '0')).join('');
  const hashHex = [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, storedHash] = stored.split(':');
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key,
    256,
  );
  const hashHex = [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex === storedHash;
}

export function generateToken(): string {
  return crypto.randomUUID();
}

export async function getAuthUser(request: Request, db: D1Database) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const row = await db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role FROM users u
       JOIN user_sessions s ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > datetime('now')`,
    )
    .bind(token)
    .first<{ id: number; name: string; email: string; role: string }>();

  return row;
}
