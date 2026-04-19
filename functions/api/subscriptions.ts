import { getAuthUser, isFullAdmin } from '../_shared/auth';

interface Env {
  DB: D1Database;
  FLUTTERWAVE_SECRET_KEY?: string;
}

type ServiceSubscriptionType = 'storage' | 'live_class';
type SubscriptionType = 'platform' | ServiceSubscriptionType;
type PlanType = 'monthly' | 'yearly';
type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';

interface BundleSubscriptionItem {
  subscriptionType: SubscriptionType;
  planType: PlanType;
}

interface FeeConfig {
  monthly: number;
  yearly: number;
  effectiveDate: string;
  label: string;
}

interface TableConfig {
  sub: string;
  pay: string;
  serviceType?: ServiceSubscriptionType;
}

const SYSTEM_MONITOR_USER_ID = 0;
const FLUTTERWAVE_PAYMENT_GATEWAY = 'flutterwave_live';
const BILLING_START_DATE = '2026-05-01T00:00:00.000Z';
const PRODUCTION_SITE_ORIGIN = 'https://kambiacademy.com';

const PLATFORM_FEES: FeeConfig = {
  monthly: 4.00,
  yearly: 44.00,
  effectiveDate: BILLING_START_DATE,
  label: 'Platform Access',
};

const STORAGE_FEES: FeeConfig = {
  monthly: 2.00,
  yearly: 24.00,
  effectiveDate: BILLING_START_DATE,
  label: 'Cloudflare Storage',
};

const LIVE_CLASS_FEES: FeeConfig = {
  monthly: 2.20,
  yearly: 26.40,
  effectiveDate: BILLING_START_DATE,
  label: 'Live Class Access',
};

function normalizeType(t: string | null | undefined): SubscriptionType {
  if (t === 'storage' || t === 'cloudflare_storage') return 'storage';
  if (t === 'liveClass' || t === 'live_class') return 'live_class';
  return 'platform';
}

function tbl(type: SubscriptionType): TableConfig {
  if (type === 'platform') {
    return { sub: 'subscriptions', pay: 'subscription_payments' };
  }

  return {
    sub: 'live_class_subscriptions',
    pay: 'live_class_subscription_payments',
    serviceType: type,
  };
}

function getServiceTypeClause(alias: string, config: TableConfig) {
  return config.serviceType ? ` AND ${alias}.serviceType = ?` : '';
}

function getServiceTypeBinds(config: TableConfig) {
  return config.serviceType ? [config.serviceType] : [];
}

function getFees(type: SubscriptionType) {
  if (type === 'storage') {
    return STORAGE_FEES;
  }

  if (type === 'live_class') {
    return LIVE_CLASS_FEES;
  }

  return PLATFORM_FEES;
}

function getTypeLabel(type: SubscriptionType) {
  return getFees(type).label;
}

function getRequirementTimestamp(type: SubscriptionType) {
  return new Date(getFees(type).effectiveDate).getTime();
}

function resolvePaymentOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const hostname = requestUrl.hostname.toLowerCase();

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') {
    return (request.headers.get('origin') || requestUrl.origin).replace(/\/$/, '');
  }

  return PRODUCTION_SITE_ORIGIN;
}

async function insertSubscriptionRecord(options: {
  db: D1Database;
  config: TableConfig;
  subscriptionId: string;
  userId: number;
  planType: PlanType;
  paymentGateway: string;
  startDate: string;
  endDate: string;
}) {
  const { db, config, subscriptionId, userId, planType, paymentGateway, startDate, endDate } = options;

  if (config.serviceType) {
    await db.prepare(`
      INSERT INTO ${config.sub} (id, userId, planType, status, startDate, endDate, autoRenew, paymentGateway, serviceType, createdAt, updatedAt)
      VALUES (?,?,?,'inactive',?,?,1,?,?,?,?)
    `).bind(subscriptionId, userId, planType, startDate, endDate, paymentGateway, config.serviceType, startDate, startDate).run();
    return;
  }

  await db.prepare(`
    INSERT INTO ${config.sub} (id, userId, planType, status, startDate, endDate, autoRenew, paymentGateway, createdAt, updatedAt)
    VALUES (?,?,?,'inactive',?,?,1,?,?,?)
  `).bind(subscriptionId, userId, planType, startDate, endDate, paymentGateway, startDate, startDate).run();
}

async function insertPaymentRecord(options: {
  db: D1Database;
  config: TableConfig;
  subscriptionId: string;
  amount: number;
  paymentGateway: string;
  transactionRef: string;
  createdAt: string;
}) {
  const { db, config, subscriptionId, amount, paymentGateway, transactionRef, createdAt } = options;

  if (config.serviceType) {
    await db.prepare(`
      INSERT INTO ${config.pay} (id, subscriptionId, amount, currency, status, paymentGateway, transactionRef, paymentDate, serviceType, createdAt)
      VALUES (?,?,?,'USD','pending',?,?,?, ?,?)
    `).bind(crypto.randomUUID(), subscriptionId, amount, paymentGateway, transactionRef, null, config.serviceType, createdAt).run();
    return;
  }

  await db.prepare(`
    INSERT INTO ${config.pay} (id, subscriptionId, amount, currency, status, paymentGateway, transactionRef, paymentDate, createdAt)
    VALUES (?,?,?,'USD','pending',?,?,?,?)
  `).bind(crypto.randomUUID(), subscriptionId, amount, paymentGateway, transactionRef, null, createdAt).run();
}

async function logSubscriptionAudit(db: D1Database, action: string, description: string) {
  try {
    await db.prepare(`
      INSERT INTO audit_logs (user_id, action, description, timestamp)
      VALUES (?, ?, ?, datetime('now'))
    `).bind(SYSTEM_MONITOR_USER_ID, action, description).run();
  } catch (error) {
    console.error('Failed to write subscription audit log:', error);
  }
}

async function cleanupUnpaidActiveSubscriptions(db: D1Database, userId: number | string, type: SubscriptionType) {
  const config = tbl(type);
  const { sub, pay } = config;
  const subscriptionTypeClause = getServiceTypeClause('s', config);
  const paymentTypeClause = getServiceTypeClause('p', config);
  const typeBinds = getServiceTypeBinds(config);
  const staleRows = await db.prepare(`
    SELECT s.id
    FROM ${sub} s
    WHERE s.userId = ?
      ${subscriptionTypeClause}
      AND s.status = 'active'
      AND NOT EXISTS (
        SELECT 1
        FROM ${pay} p
        WHERE p.subscriptionId = s.id
          ${paymentTypeClause}
          AND p.status = 'success'
      )
  `).bind(userId, ...typeBinds, ...typeBinds).all<{ id: string }>();

  const rows = staleRows.results || [];
  if (!rows.length) {
    return;
  }

  const now = new Date().toISOString();
  for (const row of rows) {
    await db.prepare(`UPDATE ${sub} SET status = 'inactive', updatedAt = ? WHERE id = ?`).bind(now, row.id).run();
  }
}

async function getCurrentActiveSubscription(db: D1Database, userId: number | string, type: SubscriptionType) {
  const config = tbl(type);
  const { sub, pay } = config;
  const subscriptionTypeClause = getServiceTypeClause('s', config);
  const paymentTypeClause = getServiceTypeClause('p', config);
  const typeBinds = getServiceTypeBinds(config);
  const subscription = await db.prepare(`
    SELECT s.*
    FROM ${sub} s
    WHERE s.userId = ?
      ${subscriptionTypeClause}
      AND s.status = 'active'
      AND EXISTS (
        SELECT 1
        FROM ${pay} p
        WHERE p.subscriptionId = s.id
          ${paymentTypeClause}
          AND p.status = 'success'
      )
    ORDER BY s.createdAt DESC
    LIMIT 1
  `).bind(userId, ...typeBinds, ...typeBinds).first<any>();

  if (!subscription) {
    return null;
  }

  if (new Date(subscription.endDate).getTime() <= Date.now()) {
    await db.prepare(`UPDATE ${sub} SET status = 'expired', updatedAt = ? WHERE id = ?`).bind(new Date().toISOString(), subscription.id).run();
    return null;
  }

  return subscription;
}

async function initializeFlutterwavePayment(options: {
  secret: string;
  origin: string;
  transactionRef: string;
  amount: number;
  redirectQuery: string;
  description: string;
  user: { email: string; name: string };
}) {
  const { secret, origin, transactionRef, amount, redirectQuery, description, user } = options;
  const response = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tx_ref: transactionRef,
      amount,
      currency: 'USD',
      redirect_url: `${origin.replace(/\/$/, '')}/payment-callback?${redirectQuery}`,
      customer: { email: user.email, name: user.name },
      customizations: {
        title: 'Kambi Academy',
        description,
      },
    }),
  });

  const data = await response.json().catch(() => null) as any;
  if (!response.ok) {
    throw new Error(data?.message || 'Failed to initialize Flutterwave payment');
  }

  const paymentUrl = data?.data?.link;
  if (!paymentUrl) {
    throw new Error('Flutterwave did not return a payment link');
  }

  return {
    paymentUrl,
    paymentGateway: FLUTTERWAVE_PAYMENT_GATEWAY,
  };
}

async function createPendingSubscriptionCheckout(options: {
  db: D1Database;
  userId: number;
  type: SubscriptionType;
  planType: PlanType;
  transactionRef: string;
  paymentGateway: string;
}) {
  const { db, userId, type, planType, transactionRef, paymentGateway } = options;
  const config = tbl(type);
  const fees = getFees(type);
  const startDate = new Date();
  const endDate = new Date(startDate);
  if (planType === 'monthly') {
    endDate.setMonth(endDate.getMonth() + 1);
  } else {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }

  const subscriptionId = crypto.randomUUID();
  const nowIso = startDate.toISOString();

  await insertSubscriptionRecord({
    db,
    config,
    subscriptionId,
    userId,
    planType,
    paymentGateway,
    startDate: nowIso,
    endDate: endDate.toISOString(),
  });

  await insertPaymentRecord({
    db,
    config,
    subscriptionId,
    amount: fees[planType],
    paymentGateway,
    transactionRef,
    createdAt: nowIso,
  });

  return {
    subscriptionId,
    amount: fees[planType],
    startDate: nowIso,
    endDate: endDate.toISOString(),
    subscriptionType: type,
    planType,
  };
}

async function verifyFlutterwavePayment(secret: string, transactionId: string, transactionRef: string, expectedAmount: number) {
  const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
  });

  const payload = await response.json().catch(() => null) as any;
  if (!response.ok) {
    throw new Error(payload?.message || 'Flutterwave verification failed');
  }

  const verifiedAmount = Number(payload?.data?.amount ?? 0);
  const amountMatches = Math.abs(verifiedAmount - expectedAmount) < 0.01;
  const verified = payload?.status === 'success'
    && payload?.data?.status === 'successful'
    && payload?.data?.tx_ref === transactionRef
    && amountMatches;

  return {
    verified,
    gatewayStatus: payload?.data?.status || 'unknown',
  };
}

async function finalizeSubscriptionPayment(options: {
  env: Env;
  user: { id: number; email: string; name: string };
  subscriptionId: string;
  transactionRef: string;
  subscriptionType: SubscriptionType;
  requestedStatus: string;
  flutterwaveTransactionId?: string;
}) {
  const { env, user, subscriptionId, transactionRef, subscriptionType, requestedStatus, flutterwaveTransactionId } = options;
  const config = tbl(subscriptionType);
  const { sub, pay } = config;
  const subscriptionTypeClause = getServiceTypeClause('s', config);
  const paymentTypeClause = getServiceTypeClause('p', config);
  const typeBinds = getServiceTypeBinds(config);
  const subscription = await env.DB.prepare(`SELECT s.id, s.planType FROM ${sub} s WHERE s.id = ? AND s.userId = ?${subscriptionTypeClause}`).bind(subscriptionId, user.id, ...typeBinds).first<any>();
  if (!subscription) {
    return { response: Response.json({ error: 'Subscription not found' }, { status: 404 }) };
  }

  const payment = await env.DB.prepare(`
    SELECT id, amount, status
    FROM ${pay}
    WHERE subscriptionId = ?
      ${paymentTypeClause}
      AND transactionRef = ?
    ORDER BY createdAt DESC
    LIMIT 1
  `).bind(subscriptionId, ...typeBinds, transactionRef).first<{ id: string; amount: number; status: PaymentStatus }>();

  if (!payment) {
    return { response: Response.json({ error: 'Payment record not found' }, { status: 404 }) };
  }

  if (payment.status === 'success') {
    return {
      response: Response.json({
        message: `${getTypeLabel(subscriptionType)} payment already verified.`,
        status: 'success',
        subscriptionId,
        subscriptionType,
        amount: payment.amount,
      }),
    };
  }

  let nextStatus: PaymentStatus = requestedStatus === 'success' ? 'success' : 'failed';
  let message = requestedStatus === 'success'
    ? `${getTypeLabel(subscriptionType)} payment verified successfully.`
    : `${getTypeLabel(subscriptionType)} payment was not completed.`;

  if (requestedStatus === 'success' && flutterwaveTransactionId && env.FLUTTERWAVE_SECRET_KEY) {
    try {
      const verification = await verifyFlutterwavePayment(env.FLUTTERWAVE_SECRET_KEY, flutterwaveTransactionId, transactionRef, payment.amount);
      if (!verification.verified) {
        nextStatus = 'failed';
        message = `${getTypeLabel(subscriptionType)} payment verification failed.`;
      }
    } catch (error) {
      nextStatus = 'failed';
      message = error instanceof Error ? error.message : 'Flutterwave payment verification failed.';
    }
  }

  const now = new Date().toISOString();
  await env.DB.prepare(`
    UPDATE ${pay}
    SET status = ?, paymentGateway = ?, paymentDate = ?
    WHERE id = ?
  `).bind(nextStatus, FLUTTERWAVE_PAYMENT_GATEWAY, nextStatus === 'success' ? now : null, payment.id).run();

  await env.DB.prepare(`
    UPDATE ${sub}
    SET status = ?, updatedAt = ?
    WHERE id = ?
  `).bind(nextStatus === 'success' ? 'active' : 'inactive', now, subscriptionId).run();

  const auditAction = nextStatus === 'success'
    ? `${subscriptionType}_subscription_payment_verified`
    : `${subscriptionType}_subscription_payment_failed`;
  const auditDescription = `${getTypeLabel(subscriptionType)} ${subscription.planType} payment for ${user.email} ${nextStatus === 'success' ? 'was verified and activated' : `failed verification (${message})`}.`;
  await logSubscriptionAudit(env.DB, auditAction, auditDescription);

  return {
    response: Response.json({
      message,
      status: nextStatus,
      subscriptionId,
      subscriptionType,
      amount: payment.amount,
      paymentGateway: FLUTTERWAVE_PAYMENT_GATEWAY,
    }),
  };
}

async function finalizeBundleSubscriptionPayment(options: {
  env: Env;
  user: { id: number; email: string; name: string };
  items: Array<{ subscriptionId: string; subscriptionType: SubscriptionType }>;
  transactionRef: string;
  requestedStatus: string;
  flutterwaveTransactionId?: string;
}) {
  const { env, user, items, transactionRef, requestedStatus, flutterwaveTransactionId } = options;
  if (!items.length) {
    return { response: Response.json({ error: 'No bundle items were provided' }, { status: 400 }) };
  }

  const bundleRecords: Array<{
    subscriptionId: string;
    subscriptionType: SubscriptionType;
    planType: PlanType;
    paymentId: string;
    amount: number;
    paymentStatus: PaymentStatus;
  }> = [];

  for (const item of items) {
    const config = tbl(item.subscriptionType);
    const { sub, pay } = config;
    const subscriptionTypeClause = getServiceTypeClause('s', config);
    const paymentTypeClause = getServiceTypeClause('p', config);
    const typeBinds = getServiceTypeBinds(config);
    const subscription = await env.DB.prepare(`SELECT s.id, s.planType FROM ${sub} s WHERE s.id = ? AND s.userId = ?${subscriptionTypeClause}`).bind(item.subscriptionId, user.id, ...typeBinds).first<any>();
    if (!subscription) {
      return { response: Response.json({ error: 'Subscription not found in bundle' }, { status: 404 }) };
    }

    const payment = await env.DB.prepare(`
      SELECT id, amount, status
      FROM ${pay}
      WHERE subscriptionId = ?
        ${paymentTypeClause}
        AND transactionRef = ?
      ORDER BY createdAt DESC
      LIMIT 1
    `).bind(item.subscriptionId, ...typeBinds, transactionRef).first<{ id: string; amount: number; status: PaymentStatus }>();

    if (!payment) {
      return { response: Response.json({ error: 'Payment record not found for bundle item' }, { status: 404 }) };
    }

    bundleRecords.push({
      subscriptionId: item.subscriptionId,
      subscriptionType: item.subscriptionType,
      planType: subscription.planType,
      paymentId: payment.id,
      amount: payment.amount,
      paymentStatus: payment.status,
    });
  }

  if (bundleRecords.every((record) => record.paymentStatus === 'success')) {
    return {
      response: Response.json({
        message: 'All due payments were already verified.',
        status: 'success',
        transactionRef,
        items: bundleRecords,
        amount: bundleRecords.reduce((sum, record) => sum + record.amount, 0),
      }),
    };
  }

  const expectedAmount = bundleRecords.reduce((sum, record) => sum + record.amount, 0);
  let nextStatus: PaymentStatus = requestedStatus === 'success' ? 'success' : 'failed';
  let message = requestedStatus === 'success'
    ? 'All due teacher payments were verified successfully.'
    : 'Combined teacher payment was not completed.';

  if (requestedStatus === 'success' && flutterwaveTransactionId && env.FLUTTERWAVE_SECRET_KEY) {
    try {
      const verification = await verifyFlutterwavePayment(env.FLUTTERWAVE_SECRET_KEY, flutterwaveTransactionId, transactionRef, expectedAmount);
      if (!verification.verified) {
        nextStatus = 'failed';
        message = 'Combined teacher payment verification failed.';
      }
    } catch (error) {
      nextStatus = 'failed';
      message = error instanceof Error ? error.message : 'Combined teacher payment verification failed.';
    }
  }

  const now = new Date().toISOString();
  for (const record of bundleRecords) {
    const { sub, pay } = tbl(record.subscriptionType);
    await env.DB.prepare(`
      UPDATE ${pay}
      SET status = ?, paymentGateway = ?, paymentDate = ?
      WHERE id = ?
    `).bind(nextStatus, FLUTTERWAVE_PAYMENT_GATEWAY, nextStatus === 'success' ? now : null, record.paymentId).run();

    await env.DB.prepare(`
      UPDATE ${sub}
      SET status = ?, updatedAt = ?
      WHERE id = ?
    `).bind(nextStatus === 'success' ? 'active' : 'inactive', now, record.subscriptionId).run();
  }

  await logSubscriptionAudit(
    env.DB,
    nextStatus === 'success' ? 'teacher_payments_bundle_verified' : 'teacher_payments_bundle_failed',
    `${user.email} ${nextStatus === 'success' ? 'cleared' : 'failed'} the combined due-payment checkout covering ${bundleRecords.map((record) => getTypeLabel(record.subscriptionType)).join(', ')}.`,
  );

  return {
    response: Response.json({
      message,
      status: nextStatus,
      transactionRef,
      amount: expectedAmount,
      paymentGateway: FLUTTERWAVE_PAYMENT_GATEWAY,
      items: bundleRecords,
    }),
  };
}

// GET /api/subscriptions?action=current|history|admin&type=platform|live_class
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'current';

  if (action === 'current') {
    const db = env.DB;
    await cleanupUnpaidActiveSubscriptions(db, user.id, 'platform');
    await cleanupUnpaidActiveSubscriptions(db, user.id, 'storage');
    await cleanupUnpaidActiveSubscriptions(db, user.id, 'live_class');

    const platformSub = await getCurrentActiveSubscription(db, user.id, 'platform');
    const storageSub = await getCurrentActiveSubscription(db, user.id, 'storage');
    const liveClassSub = await getCurrentActiveSubscription(db, user.id, 'live_class');

    const reqPlatform = Date.now() >= getRequirementTimestamp('platform');
    const reqStorage = Date.now() >= getRequirementTimestamp('storage');
    const reqLiveClass = Date.now() >= getRequirementTimestamp('live_class');

    const storagePayload = {
      hasActiveSubscription: Boolean(storageSub),
      requiresSubscription: reqStorage,
      subscription: storageSub,
      fees: STORAGE_FEES,
    };

    const liveClassPayload = {
      hasActiveSubscription: Boolean(liveClassSub),
      requiresSubscription: reqLiveClass,
      subscription: liveClassSub,
      fees: LIVE_CLASS_FEES,
    };

    return Response.json({
      platform: { hasActiveSubscription: Boolean(platformSub), requiresSubscription: reqPlatform, subscription: platformSub, fees: PLATFORM_FEES },
      storage: storagePayload,
      liveClass: liveClassPayload,
    });
  }

  if (action === 'history') {
    const type = normalizeType(url.searchParams.get('type'));
    const config = tbl(type);
    const { sub, pay } = config;
    const subscriptionTypeClause = getServiceTypeClause('s', config);
    const paymentTypeClause = getServiceTypeClause('p', config);
    const typeBinds = getServiceTypeBinds(config);
    const subs = await env.DB.prepare(`SELECT s.* FROM ${sub} s WHERE s.userId = ?${subscriptionTypeClause} ORDER BY s.createdAt DESC`).bind(user.id, ...typeBinds).all();
    const payments = await env.DB.prepare(`SELECT p.*, s.planType FROM ${pay} p JOIN ${sub} s ON p.subscriptionId = s.id WHERE s.userId = ?${subscriptionTypeClause}${paymentTypeClause} ORDER BY p.createdAt DESC`).bind(user.id, ...typeBinds, ...typeBinds).all();
    return Response.json({ subscriptions: subs.results, payments: payments.results, fees: getFees(type) });
  }

  if (action === 'admin') {
    if (!isFullAdmin(user)) return Response.json({ error: 'Unauthorized' }, { status: 403 });
    const [platformRows, serviceRows] = await Promise.all([
      env.DB.prepare(`SELECT s.*, 'platform' AS subscriptionType, u.name, u.email, u.role FROM subscriptions s JOIN users u ON CAST(s.userId AS TEXT) = CAST(u.id AS TEXT) ORDER BY s.createdAt DESC`).all(),
      env.DB.prepare(`SELECT s.*, s.serviceType AS subscriptionType, u.name, u.email, u.role FROM live_class_subscriptions s JOIN users u ON CAST(s.userId AS TEXT) = CAST(u.id AS TEXT) ORDER BY s.createdAt DESC`).all(),
    ]);
    const results = [...(platformRows.results || []), ...(serviceRows.results || [])];
    const active = results.filter((s: any) => s.status === 'active');
    const totalRevenue = active.reduce((sum: number, row: any) => sum + (getFees(normalizeType(row.subscriptionType))[row.planType as PlanType] || 0), 0);
    return Response.json({
      subscriptions: results,
      stats: {
        totalSubscriptions: results.length,
        activeSubscriptions: active.length,
        totalRevenue,
      },
      fees: {
        platform: PLATFORM_FEES,
        storage: STORAGE_FEES,
        liveClass: LIVE_CLASS_FEES,
      },
    });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
};

// POST /api/subscriptions - create subscription or record payment
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json<any>().catch(() => null);
  if (!body) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (body.action === 'verify') {
    const { subscriptionId, transactionRef, flutterwaveTransactionId, status: callbackStatus = 'failed', subscriptionType = 'platform' } = body;
    if (!subscriptionId || !transactionRef) {
      return Response.json({ error: 'subscriptionId and transactionRef are required for verification' }, { status: 400 });
    }

    const requestedStatus = callbackStatus === 'successful' || callbackStatus === 'success' ? 'success' : 'failed';
    const result = await finalizeSubscriptionPayment({
      env,
      user,
      subscriptionId,
      transactionRef,
      subscriptionType: normalizeType(subscriptionType),
      requestedStatus,
      flutterwaveTransactionId,
    });
    return result.response;
  }

  if (body.action === 'verifyBundle') {
    const { items, transactionRef, flutterwaveTransactionId, status: callbackStatus = 'failed' } = body as {
      items?: Array<{ subscriptionId?: string; subscriptionType?: string }>;
      transactionRef?: string;
      flutterwaveTransactionId?: string;
      status?: string;
    };

    const normalizedItems = (items || [])
      .filter((item): item is { subscriptionId: string; subscriptionType: string } => Boolean(item?.subscriptionId && item?.subscriptionType))
      .map((item) => ({
        subscriptionId: item.subscriptionId,
        subscriptionType: normalizeType(item.subscriptionType),
      }));

    if (!transactionRef || !normalizedItems.length) {
      return Response.json({ error: 'Bundle verification requires items and transactionRef' }, { status: 400 });
    }

    const requestedStatus = callbackStatus === 'successful' || callbackStatus === 'success' ? 'success' : 'failed';
    const result = await finalizeBundleSubscriptionPayment({
      env,
      user,
      items: normalizedItems,
      transactionRef,
      requestedStatus,
      flutterwaveTransactionId,
    });
    return result.response;
  }

  if (body.action === 'bundleCheckout') {
    const { items } = body as { items?: Array<{ subscriptionType?: string; planType?: string }> };
    const normalizedItems = (items || [])
      .filter((item): item is { subscriptionType: string; planType: string } => Boolean(item?.subscriptionType && item?.planType))
      .map((item) => ({
        subscriptionType: normalizeType(item.subscriptionType),
        planType: item.planType,
      }))
      .filter((item): item is BundleSubscriptionItem => item.planType === 'monthly' || item.planType === 'yearly');

    if (!normalizedItems.length) {
      return Response.json({ error: 'No payable items were provided for the combined checkout' }, { status: 400 });
    }

    if (!env.FLUTTERWAVE_SECRET_KEY) {
      return Response.json({ error: 'Flutterwave live gateway is not configured' }, { status: 503 });
    }

    for (const item of normalizedItems) {
      await cleanupUnpaidActiveSubscriptions(env.DB, user.id, item.subscriptionType);
      const existing = await getCurrentActiveSubscription(env.DB, user.id, item.subscriptionType);
      if (existing) {
        return Response.json({ error: `${getTypeLabel(item.subscriptionType)} already has an active subscription` }, { status: 400 });
      }
    }

    const transactionRef = `teacher-bundle-${crypto.randomUUID()}-${Date.now()}`;
    const pendingItems = [] as Array<{
      subscriptionId: string;
      subscriptionType: SubscriptionType;
      planType: PlanType;
      amount: number;
      startDate: string;
      endDate: string;
    }>;

    for (const item of normalizedItems) {
      pendingItems.push(await createPendingSubscriptionCheckout({
        db: env.DB,
        userId: user.id,
        type: item.subscriptionType,
        planType: item.planType,
        transactionRef,
        paymentGateway: FLUTTERWAVE_PAYMENT_GATEWAY,
      }));
    }

    const amount = pendingItems.reduce((sum, item) => sum + item.amount, 0);
    const origin = resolvePaymentOrigin(request);
    const redirectQuery = new URLSearchParams({
      type: 'bundle',
      sid: pendingItems.map((item) => item.subscriptionId).join(','),
      bundle: pendingItems.map((item) => item.subscriptionType).join(','),
      tx_ref: transactionRef,
    }).toString();

    let payment_url: string;
    try {
      const payment = await initializeFlutterwavePayment({
        secret: env.FLUTTERWAVE_SECRET_KEY,
        origin,
        transactionRef,
        amount,
        redirectQuery,
        description: `Teacher bundle checkout for ${pendingItems.map((item) => getTypeLabel(item.subscriptionType)).join(' + ')}`,
        user,
      });
      payment_url = payment.paymentUrl;
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : 'Failed to initialize payment gateway' }, { status: 503 });
    }

    await logSubscriptionAudit(
      env.DB,
      'teacher_payments_bundle_started',
      `${user.email} started a combined due-payment checkout for ${pendingItems.map((item) => getTypeLabel(item.subscriptionType)).join(', ')} totalling $${amount.toFixed(2)}.`,
    );

    return Response.json({
      transactionRef,
      amount,
      payment_url,
      paymentGateway: FLUTTERWAVE_PAYMENT_GATEWAY,
      items: pendingItems,
      message: 'Combined due-payment checkout created. Redirecting to Flutterwave Live...',
    }, { status: 201 });
  }

  if (body.subscriptionId && body.transactionRef) {
    const { subscriptionId, transactionRef, status: payStatus = 'failed', subscriptionType = 'platform' } = body;
    const requestedStatus = payStatus === 'successful' || payStatus === 'success' ? 'success' : 'failed';
    const result = await finalizeSubscriptionPayment({
      env,
      user,
      subscriptionId,
      transactionRef,
      subscriptionType: normalizeType(subscriptionType),
      requestedStatus,
    });
    return result.response;
  }

  const { planType, subscriptionType = 'platform', paymentGateway = 'flutterwave' } = body;
  const type = normalizeType(subscriptionType);
  if (!planType || !['monthly', 'yearly'].includes(planType)) return Response.json({ error: 'Invalid plan type.' }, { status: 400 });

  const config = tbl(type);
  const f = getFees(type);

  await cleanupUnpaidActiveSubscriptions(env.DB, user.id, type);

  const existing = await getCurrentActiveSubscription(env.DB, user.id, type);
  if (existing) return Response.json({ error: `Already has an active ${getTypeLabel(type).toLowerCase()} subscription` }, { status: 400 });

  const now = new Date();
  const startDate = now.toISOString();
  const endDate = new Date(now);
  if (planType === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
  else endDate.setFullYear(endDate.getFullYear() + 1);

  const subscriptionId = crypto.randomUUID();
  const transactionRef = `${type}-${subscriptionId}-${Date.now()}`;
  const origin = resolvePaymentOrigin(request);
  if (!env.FLUTTERWAVE_SECRET_KEY) {
    return Response.json({ error: 'Flutterwave live gateway is not configured' }, { status: 503 });
  }

  let payment_url: string;
  try {
    const payment = await initializeFlutterwavePayment({
      secret: env.FLUTTERWAVE_SECRET_KEY,
      origin,
      transactionRef,
      amount: f[planType as PlanType],
      redirectQuery: new URLSearchParams({
        type,
        sid: subscriptionId,
        tx_ref: transactionRef,
      }).toString(),
      description: `${getTypeLabel(type)} ${planType} plan`,
      user,
    });
    payment_url = payment.paymentUrl;
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Failed to initialize payment gateway' }, { status: 503 });
  }

  await insertSubscriptionRecord({
    db: env.DB,
    config,
    subscriptionId,
    userId: user.id,
    planType,
    paymentGateway: FLUTTERWAVE_PAYMENT_GATEWAY,
    startDate,
    endDate: endDate.toISOString(),
  });
  await insertPaymentRecord({
    db: env.DB,
    config,
    subscriptionId,
    amount: f[planType as PlanType],
    paymentGateway: FLUTTERWAVE_PAYMENT_GATEWAY,
    transactionRef,
    createdAt: startDate,
  });

  await logSubscriptionAudit(
    env.DB,
    `${type}_subscription_checkout_started`,
    `${getTypeLabel(type)} ${planType} checkout started for ${user.email} at $${f[planType as PlanType].toFixed(2)} via ${FLUTTERWAVE_PAYMENT_GATEWAY}.`,
  );

  return Response.json({
    subscriptionId,
    subscriptionType: type,
    planType,
    amount: f[planType as PlanType],
    startDate,
    endDate: endDate.toISOString(),
    transactionRef,
    payment_url,
    paymentGateway: FLUTTERWAVE_PAYMENT_GATEWAY,
    paymentStatus: 'pending',
    message: `${getTypeLabel(type)} checkout created. Redirecting to Flutterwave Live...`,
  }, { status: 201 });
};

// PATCH /api/subscriptions - cancel subscription
export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json<any>();
  const { subscriptionId, subscriptionType = 'platform' } = body;
  if (!subscriptionId) return Response.json({ error: 'subscriptionId required' }, { status: 400 });

  const type = normalizeType(subscriptionType);
  const { sub } = tbl(type);

  const row = await env.DB.prepare(`SELECT id, status FROM ${sub} WHERE id = ? AND userId = ?`).bind(subscriptionId, user.id).first<any>();
  if (!row) return Response.json({ error: 'Not found' }, { status: 404 });
  if (row.status !== 'active') return Response.json({ error: 'Can only cancel active subscriptions' }, { status: 400 });

  await env.DB.prepare(`UPDATE ${sub} SET status = 'cancelled', autoRenew = 0, updatedAt = ? WHERE id = ?`).bind(new Date().toISOString(), subscriptionId).run();
  await logSubscriptionAudit(env.DB, `${type}_subscription_cancelled`, `${getTypeLabel(type)} subscription ${subscriptionId} was cancelled by ${user.email}.`);
  return Response.json({ message: 'Subscription cancelled' });
};
