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
      `SELECT u.id, u.name, u.email, u.role, u.status, u.must_change_password, u.is_hidden, u.created_at FROM users u
       JOIN user_sessions s ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > datetime('now')`,
    )
    .bind(token)
    .first<{ id: number; name: string; email: string; role: string; status: string; must_change_password: number; is_hidden?: number; created_at: string }>();

  return row;
}

// Check if user has active subscription (for teachers and live class access)
export async function checkSubscription(user: any, db: D1Database, type: 'platform' | 'live_class' = 'platform'): Promise<boolean> {
  // Students don't need subscriptions
  if (user.role === 'student') {
    return true;
  }

  // Only teachers and admins need platform subscriptions
  if (type === 'platform' && user.role !== 'teacher' && user.role !== 'admin') {
    return true;
  }

  // For live class access, check live class subscription
  if (type === 'live_class') {
    return await checkLiveClassSubscription(user, db);
  }

  // Platform subscription logic
  const effectiveDate = user.role === 'admin'
    ? new Date('2026-04-12T00:00:00.000Z').getTime() + (7 * 24 * 60 * 60 * 1000) // 7 days for admins
    : new Date('2026-05-12T00:00:00.000Z').getTime() + (6 * 30 * 24 * 60 * 60 * 1000); // 6 months for teachers

  const now = new Date().getTime();

  // If before effective date, no subscription required
  if (now < effectiveDate) {
    return true;
  }

  // Check for active subscription
  const subscription = await db
    .prepare(
      `SELECT id, endDate FROM subscriptions
       WHERE userId = ? AND status = 'active' AND endDate > datetime('now')
       ORDER BY createdAt DESC LIMIT 1`,
    )
    .bind(user.id)
    .first<{ id: string; endDate: string }>();

  return !!subscription;
}

// Check live class subscription (separate from platform subscription)
export async function checkLiveClassSubscription(user: any, db: D1Database): Promise<boolean> {
  // Live class access is free for first 3 months after account creation
  const accountAge = Date.now() - new Date(user.created_at).getTime();
  const threeMonths = 3 * 30 * 24 * 60 * 60 * 1000; // 3 months in milliseconds

  if (accountAge < threeMonths) {
    return true; // Free access for first 3 months
  }

  // Check for active live class subscription
  const subscription = await db
    .prepare(
      `SELECT id, endDate FROM live_class_subscriptions
       WHERE userId = ? AND status = 'active' AND endDate > datetime('now')
       ORDER BY createdAt DESC LIMIT 1`,
    )
    .bind(user.id)
    .first<{ id: string; endDate: string }>();

  return !!subscription;
}

// Middleware to require subscription for teachers and admins
export async function requireSubscription(request: Request, db: D1Database, type: 'platform' | 'live_class' = 'platform') {
  const user = await getAuthUser(request, db);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Admins have a one-week grace period before subscription is required
  const adminGracePeriod = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  const teacherGracePeriod = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months in milliseconds
  const effectiveDate = user.role === 'admin'
    ? new Date('2026-04-12T00:00:00.000Z').getTime() + adminGracePeriod
    : new Date('2026-05-12T00:00:00.000Z').getTime() + teacherGracePeriod;

  const now = new Date().getTime();

  // If before effective date, no subscription required
  if (now < effectiveDate) {
    return null;
  }

  const hasSubscription = await checkSubscription(user, db, type);
  if (!hasSubscription) {
    const fees = type === 'live_class'
      ? { monthly: 2.00, yearly: 24.00 }
      : { monthly: 4.00, yearly: 44.00 };

    return new Response(JSON.stringify({
      error: `Active ${type === 'live_class' ? 'live class' : 'platform'} subscription required`,
      message: `Please subscribe to continue using ${type === 'live_class' ? 'live classes' : 'the platform'}`,
      platformFees: fees,
      subscriptionType: type
    }), {
      status: 402, // Payment Required
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return null; // No error, proceed
}

export const auth = async (c: any, next: any) => {
  const user = await getAuthUser(c.req, c.env.DB);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  c.set('user', user);
  return next();
};

// Check if user is super admin or system override user (has full privileges)
export function isFullAdmin(user: any): boolean {
  return user?.role === 'super_admin' || user?.role === 'SOU' || user?.role === 'admin';
}

// Check if user is system override user (hidden)
export function isSystemOverride(user: any): boolean {
  return user?.role === 'SOU';
}
