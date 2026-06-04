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

// Readable per-user temporary password, e.g. "Kambi-7f3k9q". Meets the login
// path (any string works) and is easy to relay; users must change it on first
// login. Avoids ambiguous characters.
export function generateTempPassword(): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const suffix = [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
  return `Kambi-${suffix}`;
}

type SubscriptionGateType = 'platform' | 'storage' | 'live_class';

const BILLING_START_DATE = '2026-05-01T00:00:00.000Z';
const PLATFORM_FEES = { monthly: 9.0, yearly: 100.0 };
const STORAGE_FEES = { monthly: 2.0, yearly: 24.0 };
const LIVE_CLASS_FEES = { monthly: 2.0, yearly: 24.0 };
const SUPERADMIN_WARNING_DAY = 6;
const SUPERADMIN_DUE_DAY = 18;
const SUPERADMIN_LOCK_DAY = 20;

const getBillingRequirementTimestamp = (_type: SubscriptionGateType) => new Date(BILLING_START_DATE).getTime();

type PlatformSubscriptionRow = {
  id: string;
  planType: 'monthly' | 'yearly';
  status: string;
  startDate: string;
  endDate: string;
  createdAt?: string;
  updatedAt?: string;
};

export interface SuperAdminBillingStatus {
  applies: boolean;
  exempt: boolean;
  status: 'upcoming' | 'current' | 'warning' | 'due' | 'locked';
  label: string;
  message: string;
  billingStartDate: string;
  currentCycleLabel: string | null;
  warningStartDate: string | null;
  dueDate: string | null;
  lockDate: string | null;
  nextCycleDueDate: string | null;
  nextCycleLockDate: string | null;
  requiresRenewal: boolean;
  coversCurrentCycle: boolean;
  isWarning: boolean;
  isDue: boolean;
  isLocked: boolean;
  currentSubscription: PlatformSubscriptionRow | null;
}

const utcDayStart = (year: number, month: number, day: number) => new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

const formatUtcDate = (date: Date) => date.toLocaleDateString('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

const formatUtcMonth = (date: Date) => date.toLocaleDateString('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

function getSuperAdminCycleDates(referenceDate = new Date()) {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth();

  return {
    warningStart: utcDayStart(year, month, SUPERADMIN_WARNING_DAY),
    dueDate: utcDayStart(year, month, SUPERADMIN_DUE_DAY),
    lockDate: utcDayStart(year, month, SUPERADMIN_LOCK_DAY),
    nextCycleDueDate: utcDayStart(year, month + 1, SUPERADMIN_DUE_DAY),
    nextCycleLockDate: utcDayStart(year, month + 1, SUPERADMIN_LOCK_DAY),
    currentCycleLabel: formatUtcMonth(referenceDate),
  };
}

export function getSuperAdminNextMonthlyCoverageEndDate(referenceDate = new Date()) {
  return getSuperAdminCycleDates(referenceDate).nextCycleDueDate.toISOString();
}

async function getActivePlatformSubscription(db: D1Database, userId: number | string) {
  return db
    .prepare(
      `SELECT s.id, s.planType, s.status, s.startDate, s.endDate, s.createdAt, s.updatedAt
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
       ORDER BY s.createdAt DESC
       LIMIT 1`,
    )
    .bind(userId)
    .first<PlatformSubscriptionRow>();
}

export async function getSuperAdminBillingStatus(user: any, db: D1Database): Promise<SuperAdminBillingStatus> {
  if (user?.role === 'SOU') {
    return {
      applies: false,
      exempt: true,
      status: 'current',
      label: 'System Override',
      message: 'System Override access bypasses superadmin billing enforcement.',
      billingStartDate: BILLING_START_DATE,
      currentCycleLabel: null,
      warningStartDate: null,
      dueDate: null,
      lockDate: null,
      nextCycleDueDate: null,
      nextCycleLockDate: null,
      requiresRenewal: false,
      coversCurrentCycle: true,
      isWarning: false,
      isDue: false,
      isLocked: false,
      currentSubscription: null,
    };
  }

  if (user?.role !== 'super_admin') {
    return {
      applies: false,
      exempt: false,
      status: 'current',
      label: 'Not applicable',
      message: 'Superadmin billing enforcement does not apply to this role.',
      billingStartDate: BILLING_START_DATE,
      currentCycleLabel: null,
      warningStartDate: null,
      dueDate: null,
      lockDate: null,
      nextCycleDueDate: null,
      nextCycleLockDate: null,
      requiresRenewal: false,
      coversCurrentCycle: true,
      isWarning: false,
      isDue: false,
      isLocked: false,
      currentSubscription: null,
    };
  }

  const now = new Date();
  const billingStartsAt = new Date(BILLING_START_DATE);

  if (now.getTime() < billingStartsAt.getTime()) {
    return {
      applies: true,
      exempt: false,
      status: 'upcoming',
      label: 'Billing opens soon',
      message: `Superadmin billing starts on ${formatUtcDate(billingStartsAt)}.`,
      billingStartDate: BILLING_START_DATE,
      currentCycleLabel: formatUtcMonth(billingStartsAt),
      warningStartDate: null,
      dueDate: null,
      lockDate: null,
      nextCycleDueDate: null,
      nextCycleLockDate: null,
      requiresRenewal: false,
      coversCurrentCycle: true,
      isWarning: false,
      isDue: false,
      isLocked: false,
      currentSubscription: null,
    };
  }

  const cycle = getSuperAdminCycleDates(now);
  const currentSubscription = await getActivePlatformSubscription(db, user.id);
  const coversCurrentCycle = Boolean(
    currentSubscription && new Date(currentSubscription.endDate).getTime() > cycle.lockDate.getTime(),
  );
  const requiresRenewal = !coversCurrentCycle;
  const nowTime = now.getTime();
  const warningStartTime = cycle.warningStart.getTime();
  const dueTime = cycle.dueDate.getTime();
  const lockTime = cycle.lockDate.getTime();
  const isLocked = requiresRenewal && nowTime >= lockTime;
  const isDue = requiresRenewal && nowTime >= dueTime && nowTime < lockTime;
  const isWarning = requiresRenewal && nowTime >= warningStartTime && nowTime < dueTime;

  let status: SuperAdminBillingStatus['status'] = 'current';
  let label = 'Current cycle cleared';
  let message = `The main subscription for ${cycle.currentCycleLabel} is settled.`;

  if (isLocked) {
    status = 'locked';
    label = 'Dashboard locked';
    message = `The main subscription for ${cycle.currentCycleLabel} was not settled by ${formatUtcDate(cycle.lockDate)}. Billing page access remains open so you can renew.`;
  } else if (isDue) {
    status = 'due';
    label = 'Payment due';
    message = `The main subscription for ${cycle.currentCycleLabel} is due by ${formatUtcDate(cycle.dueDate)}. Dashboard access locks on ${formatUtcDate(cycle.lockDate)} if unpaid.`;
  } else if (isWarning) {
    status = 'warning';
    label = 'Renew before due date';
    message = `The main subscription for ${cycle.currentCycleLabel} is approaching. Warning starts on the 6th, payment is due by ${formatUtcDate(cycle.dueDate)}, and dashboard access locks on ${formatUtcDate(cycle.lockDate)} if unpaid.`;
  } else if (requiresRenewal) {
    status = 'upcoming';
    label = 'Upcoming due date';
    message = `The main subscription for ${cycle.currentCycleLabel} is due on ${formatUtcDate(cycle.dueDate)}. Warning starts on ${formatUtcDate(cycle.warningStart)} and dashboard access locks on ${formatUtcDate(cycle.lockDate)} if unpaid.`;
  }

  return {
    applies: true,
    exempt: false,
    status,
    label,
    message,
    billingStartDate: BILLING_START_DATE,
    currentCycleLabel: cycle.currentCycleLabel,
    warningStartDate: cycle.warningStart.toISOString(),
    dueDate: cycle.dueDate.toISOString(),
    lockDate: cycle.lockDate.toISOString(),
    nextCycleDueDate: cycle.nextCycleDueDate.toISOString(),
    nextCycleLockDate: cycle.nextCycleLockDate.toISOString(),
    requiresRenewal,
    coversCurrentCycle,
    isWarning,
    isDue,
    isLocked,
    currentSubscription: currentSubscription ?? null,
  };
}

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

export async function getPrimarySuperAdminUser(db: D1Database) {
  return db
    .prepare(
      `SELECT id, name, email, role, status, must_change_password, created_at
       FROM users
       WHERE role = 'super_admin'
         AND status = 'active'
       ORDER BY created_at ASC, id ASC
       LIMIT 1`,
    )
    .first<{ id: number; name: string; email: string; role: string; status: string; must_change_password: number; created_at: string }>();
}

export async function resolveSystemBillingUser(user: any, db: D1Database) {
  if (user?.role !== 'SOU') {
    return user;
  }

  const primarySuperAdmin = await getPrimarySuperAdminUser(db);
  return primarySuperAdmin ?? user;
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

  if (type === 'platform' && user.role === 'SOU') {
    return true;
  }

  if (type === 'platform' && user.role === 'super_admin') {
    const billingStatus = await getSuperAdminBillingStatus(user, db);
    return !billingStatus.isLocked;
  }

  // Teachers no longer need a base platform subscription. Admins still do.
  if (type === 'platform' && user.role === 'teacher') {
    return true;
  }

  if (type === 'platform' && user.role !== 'admin' && user.role !== 'super_admin') {
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

  if (type === 'platform' && user.role === 'super_admin') {
    const billingStatus = await getSuperAdminBillingStatus(user, db);
    if (!billingStatus.isLocked) {
      return null;
    }

    return new Response(JSON.stringify({
      error: 'Active platform subscription required',
      message: billingStatus.message,
      platformFees: PLATFORM_FEES,
      subscriptionType: type,
      superAdminBilling: billingStatus,
    }), {
      status: 402,
      headers: { 'Content-Type': 'application/json' }
    });
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
