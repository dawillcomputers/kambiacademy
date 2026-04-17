import { getAuthUser, isFullAdmin } from '../_shared/auth';

interface Env {
  DB: D1Database;
  FLUTTERWAVE_SECRET_KEY?: string;
}

const PLATFORM_FEES = { monthly: 4.00, yearly: 44.00, effectiveDate: '2026-05-12T00:00:00.000Z' } as Record<string, any>;
const STORAGE_FEES = { monthly: 2.00, yearly: 24.00, freePeriodMonths: 3 } as Record<string, any>;

function normalizeType(t: string | null | undefined): string {
  if (t === 'liveClass' || t === 'live_class' || t === 'storage') return 'live_class';
  return 'platform';
}

function tbl(type: string) {
  const lc = type === 'live_class';
  return { sub: lc ? 'live_class_subscriptions' : 'subscriptions', pay: lc ? 'live_class_subscription_payments' : 'subscription_payments' };
}

function getFees(type: string) { return type === 'live_class' ? STORAGE_FEES : PLATFORM_FEES; }

// GET /api/subscriptions?action=current|history|admin&type=platform|live_class
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'current';

  if (action === 'current') {
    const db = env.DB;
    const platformSub = await db.prepare(`SELECT * FROM subscriptions WHERE userId = ? AND status = 'active' ORDER BY createdAt DESC LIMIT 1`).bind(user.id).first<any>();
    const storageSub = await db.prepare(`SELECT * FROM live_class_subscriptions WHERE userId = ? AND status = 'active' ORDER BY createdAt DESC LIMIT 1`).bind(user.id).first<any>();

    let platformActive = false;
    if (platformSub) {
      if (new Date(platformSub.endDate) > new Date()) { platformActive = true; }
      else { await db.prepare(`UPDATE subscriptions SET status = 'expired', updatedAt = ? WHERE id = ?`).bind(new Date().toISOString(), platformSub.id).run(); }
    }
    let storageActive = false;
    if (storageSub) {
      if (new Date(storageSub.endDate) > new Date()) { storageActive = true; }
      else { await db.prepare(`UPDATE live_class_subscriptions SET status = 'expired', updatedAt = ? WHERE id = ?`).bind(new Date().toISOString(), storageSub.id).run(); }
    }

    const reqPlatform = (() => {
      const eff = user.role === 'admin' ? new Date('2026-04-12').getTime() + 7 * 86400000 : new Date('2026-05-12').getTime() + 6 * 30 * 86400000;
      return Date.now() >= eff;
    })();
    const reqStorage = Date.now() - new Date(user.created_at).getTime() >= 3 * 30 * 86400000;

    return Response.json({
      platform: { hasActiveSubscription: platformActive, requiresSubscription: reqPlatform, subscription: platformSub, fees: PLATFORM_FEES },
      liveClass: { hasActiveSubscription: storageActive, requiresSubscription: reqStorage, subscription: storageSub, fees: STORAGE_FEES },
    });
  }

  if (action === 'history') {
    const type = normalizeType(url.searchParams.get('type'));
    const { sub, pay } = tbl(type);
    const subs = await env.DB.prepare(`SELECT * FROM ${sub} WHERE userId = ? ORDER BY createdAt DESC`).bind(user.id).all();
    const payments = await env.DB.prepare(`SELECT p.*, s.planType FROM ${pay} p JOIN ${sub} s ON p.subscriptionId = s.id WHERE s.userId = ? ORDER BY p.createdAt DESC`).bind(user.id).all();
    return Response.json({ subscriptions: subs.results, payments: payments.results, fees: getFees(type) });
  }

  if (action === 'admin') {
    if (!isFullAdmin(user)) return Response.json({ error: 'Unauthorized' }, { status: 403 });
    const { results } = await env.DB.prepare(`SELECT s.*, u.name, u.email, u.role FROM subscriptions s JOIN users u ON CAST(s.userId AS TEXT) = CAST(u.id AS TEXT) ORDER BY s.createdAt DESC`).all();
    const active = (results || []).filter((s: any) => s.status === 'active');
    const mRev = active.filter((s: any) => s.planType === 'monthly').length * 4;
    const yRev = active.filter((s: any) => s.planType === 'yearly').length * 44;
    return Response.json({ subscriptions: results, stats: { totalSubscriptions: results?.length || 0, activeSubscriptions: active.length, monthlyRevenue: mRev, yearlyRevenue: yRev, totalRevenue: mRev + yRev }, platformFees: PLATFORM_FEES });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
};

// POST /api/subscriptions - create subscription or record payment
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json<any>();

  if (body.subscriptionId && body.transactionRef) {
    const { subscriptionId, amount, paymentGateway, transactionRef, status: payStatus, subscriptionType = 'platform' } = body;
    const type = normalizeType(subscriptionType);
    const { sub, pay } = tbl(type);
    if (!amount || !paymentGateway || !transactionRef || !payStatus) return Response.json({ error: 'Missing payment fields' }, { status: 400 });
    const row = await env.DB.prepare(`SELECT id FROM ${sub} WHERE id = ? AND userId = ?`).bind(subscriptionId, user.id).first();
    if (!row) return Response.json({ error: 'Subscription not found' }, { status: 404 });
    const dup = await env.DB.prepare(`SELECT id FROM ${pay} WHERE transactionRef = ?`).bind(transactionRef).first();
    if (dup) return Response.json({ error: 'Duplicate transaction' }, { status: 400 });
    const now = new Date().toISOString();
    await env.DB.prepare(`INSERT INTO ${pay} (id, subscriptionId, amount, currency, status, paymentGateway, transactionRef, paymentDate, createdAt) VALUES (?,?,?,'USD',?,?,?,?,?)`).bind(crypto.randomUUID(), subscriptionId, amount, payStatus, paymentGateway, transactionRef, payStatus === 'success' ? now : null, now).run();
    if (payStatus === 'success') { await env.DB.prepare(`UPDATE ${sub} SET status = 'active', updatedAt = ? WHERE id = ?`).bind(now, subscriptionId).run(); }
    return Response.json({ message: 'Payment recorded', status: payStatus });
  }

  const { planType, subscriptionType = 'platform', paymentGateway = 'flutterwave' } = body;
  const type = normalizeType(subscriptionType);
  if (!planType || !['monthly', 'yearly'].includes(planType)) return Response.json({ error: 'Invalid plan type.' }, { status: 400 });

  const { sub, pay } = tbl(type);
  const f = getFees(type);

  const existing = await env.DB.prepare(`SELECT id FROM ${sub} WHERE userId = ? AND status = 'active' LIMIT 1`).bind(user.id).first();
  if (existing) return Response.json({ error: 'Already has an active subscription' }, { status: 400 });

  const now = new Date();
  const endDate = new Date(now);
  if (planType === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
  else endDate.setFullYear(endDate.getFullYear() + 1);

  const subscriptionId = crypto.randomUUID();
  const transactionRef = `${type}-${subscriptionId}-${Date.now()}`;

  await env.DB.prepare(`INSERT INTO ${sub} (id, userId, planType, status, startDate, endDate, autoRenew, paymentGateway, createdAt, updatedAt) VALUES (?,?,?,'active',?,?,1,?,?,?)`).bind(subscriptionId, user.id, planType, now.toISOString(), endDate.toISOString(), paymentGateway, now.toISOString(), now.toISOString()).run();
  await env.DB.prepare(`INSERT INTO ${pay} (id, subscriptionId, amount, currency, status, paymentGateway, transactionRef, paymentDate, createdAt) VALUES (?,?,?,'USD','pending',?,?,?,?)`).bind(crypto.randomUUID(), subscriptionId, f[planType], paymentGateway, transactionRef, now.toISOString(), now.toISOString()).run();

  let payment_url = null;
  try {
    const secret = env.FLUTTERWAVE_SECRET_KEY;
    const origin = request.headers.get('origin') || '';
    if (secret && origin) {
      const resp = await fetch('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tx_ref: transactionRef,
          amount: f[planType],
          currency: 'USD',
          redirect_url: `${origin.replace(/\/$/, '')}/payment-callback?type=${type}&sid=${subscriptionId}`,
          customer: { email: user.email, name: user.name },
          customizations: { title: 'Kambi Academy', description: `${type === 'live_class' ? 'Storage' : 'Platform'} ${planType} plan` },
        }),
      });
      const data: any = await resp.json().catch(() => null);
      payment_url = data?.data?.link || null;
    }
  } catch (e) { console.error('Flutterwave init failed:', e); }

  return Response.json({
    subscriptionId, subscriptionType: type, planType, amount: f[planType],
    startDate: now.toISOString(), endDate: endDate.toISOString(),
    transactionRef, payment_url, message: 'Subscription created',
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
  return Response.json({ message: 'Subscription cancelled' });
};
