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
  if (!stored || typeof stored !== 'string') {
    return false;
  }

  const parts = stored.split(':');
  if (parts.length !== 2) {
    console.warn('verifyPassword: stored hash has invalid format', stored);
    return false;
  }

  const [saltHex, storedHash] = parts;
  const saltMatch = saltHex.match(/.{2}/g);
  if (!saltMatch) {
    console.warn('verifyPassword: invalid salt format', saltHex);
    return false;
  }

  const salt = new Uint8Array(saltMatch.map((b) => parseInt(b, 16)));
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

type SubscriptionGateType = 'platform' | 'storage' | 'live_class';

const BILLING_START_DATE = '2026-05-01T00:00:00.000Z';
const PLATFORM_FEES = { monthly: 4.0, yearly: 44.0 };
const STORAGE_FEES = { monthly: 2.0, yearly: 24.0 };
const LIVE_CLASS_FEES = { monthly: 2.2, yearly: 26.4 };

const getBillingRequirementTimestamp = (_type: SubscriptionGateType) => new Date(BILLING_START_DATE).getTime();

export async function getAuthUser(request: Request, db: D1Database) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    const token = authHeader.slice(7);
    if (!token) return null;
    const row = await db
      .prepare(
        `SELECT u.id, u.name, u.email, u.role, u.status, u.must_change_password, u.created_at FROM users u
         JOIN user_sessions s ON u.id = s.user_id
         WHERE s.token = ? AND s.expires_at > datetime('now')`,
      )
      .bind(token)
      .first<{ id: number; name: string; email: string; role: string; status: string; must_change_password: number; created_at: string }>();
    return row || null;
  } catch (err) {
    console.error('getAuthUser ERROR:', err);
    return null;
  }
}

async function checkServiceSubscription(user: any, db: D1Database, serviceType: 'storage' | 'live_class'): Promise<boolean> {
  if (Date.now() < getBillingRequirementTimestamp(serviceType)) {
    return true;
  }

  try {
    const subscription = await db
      .prepare(
        `SELECT s.id, s.endDate
         FROM live_class_subscriptions s
         WHERE s.userId = ?
           AND s.serviceType = ?
           AND s.status = 'active'
           AND s.endDate > datetime('now')
           AND EXISTS (
             SELECT 1
             FROM live_class_subscription_payments p
             WHERE p.subscriptionId = s.id
               AND p.serviceType = ?
               AND p.status = 'success'
           )
         ORDER BY createdAt DESC LIMIT 1`,
      )
      .bind(user.id, serviceType, serviceType)
      .first<{ id: string; endDate: string }>();

    return !!subscription;
  } catch {
    if (serviceType === 'live_class') {
      const legacySubscription = await db
        .prepare(
          `SELECT s.id, s.endDate
           FROM live_class_subscriptions s
           WHERE s.userId = ?
             AND s.status = 'active'
             AND s.endDate > datetime('now')
             AND EXISTS (
               SELECT 1
               FROM live_class_subscription_payments p
               WHERE p.subscriptionId = s.id
                 AND p.status = 'success'
             )
           ORDER BY createdAt DESC LIMIT 1`,
        )
        .bind(user.id)
        .first<{ id: string; endDate: string }>();

      return !!legacySubscription;
    }

    return false;
  }
}

// Check if user has active subscription (for teachers and protected teacher services)
export async function checkSubscription(user: any, db: D1Database, type: SubscriptionGateType = 'platform'): Promise<boolean> {
  // Students don't need subscriptions
  if (user.role === 'student') {
    return true;
  }

  // Only teachers and admins need platform subscriptions
  if (type === 'platform' && user.role !== 'teacher' && user.role !== 'admin') {
    return true;
  }

  if (type === 'storage') {
    return await checkStorageSubscription(user, db);
  }

  // For live class access, check live class subscription
  if (type === 'live_class') {
    return await checkLiveClassSubscription(user, db);
  }

  // All teacher/admin billing is treated as settled for April, then starts from May.
  const effectiveDate = getBillingRequirementTimestamp(type);

  const now = new Date().getTime();

  // If before effective date, no subscription required
  if (now < effectiveDate) {
    return true;
  }

  // Check for active subscription
  const subscription = await db
    .prepare(
      `SELECT s.id, s.endDate
       FROM subscriptions s
       WHERE s.userId = ?
         AND s.status = 'active'
         AND s.endDate > datetime('now')
         AND EXISTS (
           SELECT 1
           FROM subscription_payments p
           WHERE p.subscriptionId = s.id
             AND p.status = 'success'
         )
       ORDER BY createdAt DESC LIMIT 1`,
    )
    .bind(user.id)
    .first<{ id: string; endDate: string }>();

  return !!subscription;
}

export async function checkStorageSubscription(user: any, db: D1Database): Promise<boolean> {
  return checkServiceSubscription(user, db, 'storage');
}

// Check live class subscription using the live_class service bucket.
export async function checkLiveClassSubscription(user: any, db: D1Database): Promise<boolean> {
  return checkServiceSubscription(user, db, 'live_class');
}

// Middleware to require subscription for teachers and admins
export async function requireSubscription(request: Request, db: D1Database, type: SubscriptionGateType = 'platform') {
  const user = await getAuthUser(request, db);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const effectiveDate = getBillingRequirementTimestamp(type);

  const now = new Date().getTime();

  // If before effective date, no subscription required
  if (now < effectiveDate) {
    return null;
  }

  const hasSubscription = await checkSubscription(user, db, type);
  if (!hasSubscription) {
    const fees = type === 'live_class'
      ? LIVE_CLASS_FEES
      : type === 'storage'
        ? STORAGE_FEES
        : PLATFORM_FEES;

    return new Response(JSON.stringify({
      error: `Active ${type === 'live_class' ? 'live class' : type === 'storage' ? 'cloud storage' : 'platform'} subscription required`,
      message: `Please subscribe to continue using ${type === 'live_class' ? 'live classes' : type === 'storage' ? 'Cloudflare storage features' : 'the platform'}`,
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
