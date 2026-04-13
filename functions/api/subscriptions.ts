import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { auth } from '../_shared/auth';
import { getDB } from '../_shared/db';

const app = new Hono();
app.use('*', cors());

interface Subscription {
  id: string;
  userId: string;
  planType: 'monthly' | 'yearly';
  status: 'active' | 'inactive' | 'cancelled' | 'expired';
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  paymentGateway: string;
  createdAt: string;
  updatedAt: string;
}

interface SubscriptionPayment {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  paymentGateway: string;
  transactionRef: string;
  paymentDate: string;
  createdAt: string;
}

// Platform management fees (effective May 12th, 2026)
const PLATFORM_FEES = {
  monthly: 4.00, // $4 per month
  yearly: 44.00,  // $44 per year
  effectiveDate: '2026-05-12T00:00:00.000Z'
};

// Live class access fees (effective after 3 months free)
const LIVE_CLASS_FEES = {
  monthly: 2.00, // $2 per month
  yearly: 24.00,  // $24 per year
  freePeriodMonths: 3
};

// Get user's current subscriptions (platform and live class)
app.get('/current', auth, async (c) => {
  try {
    const user = c.get('user');
    const db = getDB(c);

    // Get platform subscription
    const platformSubscription = await db
      .selectFrom('subscriptions')
      .where('userId', '=', user.id)
      .where('status', '=', 'active')
      .selectAll()
      .orderBy('createdAt', 'desc')
      .executeTakeFirst();

    // Get live class subscription
    const liveClassSubscription = await db
      .selectFrom('live_class_subscriptions')
      .where('userId', '=', user.id)
      .where('status', '=', 'active')
      .selectAll()
      .orderBy('createdAt', 'desc')
      .executeTakeFirst();

    // Check platform subscription status
    let platformStatus = { hasActiveSubscription: false, requiresSubscription: false };
    if (platformSubscription) {
      const now = new Date();
      const endDate = new Date(platformSubscription.endDate);
      if (endDate > now) {
        platformStatus.hasActiveSubscription = true;
      } else {
        // Mark as expired
        await db
          .updateTable('subscriptions')
          .set({ status: 'expired', updatedAt: new Date().toISOString() })
          .where('id', '=', platformSubscription.id)
          .execute();
      }
    } else {
      // Check if subscription is required
      const effectiveDate = user.role === 'admin'
        ? new Date('2026-04-12T00:00:00.000Z').getTime() + (7 * 24 * 60 * 60 * 1000)
        : new Date('2026-05-12T00:00:00.000Z').getTime() + (6 * 30 * 24 * 60 * 60 * 1000);
      platformStatus.requiresSubscription = new Date().getTime() >= effectiveDate;
    }

    // Check live class subscription status
    let liveClassStatus = { hasActiveSubscription: false, requiresSubscription: false };
    if (liveClassSubscription) {
      const now = new Date();
      const endDate = new Date(liveClassSubscription.endDate);
      if (endDate > now) {
        liveClassStatus.hasActiveSubscription = true;
      } else {
        // Mark as expired
        await db
          .updateTable('live_class_subscriptions')
          .set({ status: 'expired', updatedAt: new Date().toISOString() })
          .where('id', '=', liveClassSubscription.id)
          .execute();
      }
    } else {
      // Check if live class subscription is required (after 3 months free)
      const accountAge = Date.now() - new Date(user.created_at).getTime();
      const threeMonths = 3 * 30 * 24 * 60 * 60 * 1000;
      liveClassStatus.requiresSubscription = accountAge >= threeMonths;
    }

    return c.json({
      platform: {
        ...platformStatus,
        subscription: platformSubscription,
        fees: PLATFORM_FEES
      },
      liveClass: {
        ...liveClassStatus,
        subscription: liveClassSubscription,
        fees: LIVE_CLASS_FEES
      }
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create new subscription (platform or live class)
app.post('/', auth, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();

    const { planType, subscriptionType = 'platform', paymentGateway = 'flutterwave' } = body;

    if (!planType || !['monthly', 'yearly'].includes(planType)) {
      return c.json({ error: 'Invalid plan type. Must be monthly or yearly.' }, 400);
    }

    if (!subscriptionType || !['platform', 'live_class'].includes(subscriptionType)) {
      return c.json({ error: 'Invalid subscription type. Must be platform or live_class.' }, 400);
    }

    const db = getDB(c);
    const tableName = subscriptionType === 'live_class' ? 'live_class_subscriptions' : 'subscriptions';
    const paymentTableName = subscriptionType === 'live_class' ? 'live_class_subscription_payments' : 'subscription_payments';
    const fees = subscriptionType === 'live_class' ? LIVE_CLASS_FEES : PLATFORM_FEES;

    // Check if user already has an active subscription of this type
    const existingSubscription = await db
      .selectFrom(tableName)
      .where('userId', '=', user.id)
      .where('status', '=', 'active')
      .executeTakeFirst();

    if (existingSubscription) {
      return c.json({ error: `User already has an active ${subscriptionType} subscription` }, 400);
    }

    const now = new Date();
    const startDate = now.toISOString();
    const endDate = new Date(now);

    if (planType === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const subscriptionId = crypto.randomUUID();
    const transactionRef = `${subscriptionType}-${subscriptionId}-${Date.now()}`;

    await db
      .insertInto(tableName)
      .values({
        id: subscriptionId,
        userId: user.id,
        planType,
        status: 'active',
        startDate,
        endDate: endDate.toISOString(),
        autoRenew: true,
        paymentGateway,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      })
      .execute();

    await db
      .insertInto(paymentTableName)
      .values({
        id: crypto.randomUUID(),
        subscriptionId,
        amount: fees[planType],
        currency: 'USD',
        status: 'success',
        paymentGateway,
        transactionRef,
        paymentDate: now.toISOString(),
        createdAt: now.toISOString(),
      })
      .execute();

    return c.json({
      subscriptionId,
      subscriptionType,
      planType,
      amount: fees[planType],
      startDate,
      endDate: endDate.toISOString(),
      paymentGateway,
      transactionRef,
      message: `${subscriptionType} subscription created successfully`
    }, 201);
  } catch (error) {
    console.error('Error creating subscription:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Process subscription payment (platform or live class)
app.post('/:subscriptionId/payment', auth, async (c) => {
  try {
    const subscriptionId = c.req.param('subscriptionId');
    const user = c.get('user');
    const body = await c.req.json();

    const { amount, currency = 'USD', paymentGateway, transactionRef, status, subscriptionType = 'platform' } = body;

    if (!amount || !paymentGateway || !transactionRef || !status) {
      return c.json({ error: 'Missing required payment fields' }, 400);
    }

    if (!subscriptionType || !['platform', 'live_class'].includes(subscriptionType)) {
      return c.json({ error: 'Invalid subscription type. Must be platform or live_class.' }, 400);
    }

    // Verify subscription belongs to user
    const db = getDB(c);
    const tableName = subscriptionType === 'live_class' ? 'live_class_subscriptions' : 'subscriptions';
    const paymentTableName = subscriptionType === 'live_class' ? 'live_class_subscription_payments' : 'subscription_payments';

    const subscription = await db
      .selectFrom(tableName)
      .where('id', '=', subscriptionId)
      .where('userId', '=', user.id)
      .executeTakeFirst();

    if (!subscription) {
      return c.json({ error: 'Subscription not found or access denied' }, 404);
    }

    // Check if payment already exists
    const existingPayment = await db
      .selectFrom(paymentTableName)
      .where('transactionRef', '=', transactionRef)
      .executeTakeFirst();

    if (existingPayment) {
      return c.json({ error: 'Payment with this transaction reference already exists' }, 400);
    }

    const paymentId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db
      .insertInto(paymentTableName)
      .values({
        id: paymentId,
        subscriptionId,
        amount,
        currency,
        status,
        paymentGateway,
        transactionRef,
        paymentDate: status === 'success' ? now : null,
        createdAt: now,
      })
      .execute();

    // If payment is successful, ensure subscription is active
    if (status === 'success') {
      await db
        .updateTable(tableName)
        .set({
          status: 'active',
          updatedAt: now
        })
        .where('id', '=', subscriptionId)
        .execute();
    }

    return c.json({
      paymentId,
      status,
      message: `${subscriptionType} payment ${status} recorded successfully`
    });
  } catch (error) {
    console.error('Error processing subscription payment:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Cancel subscription
app.patch('/:subscriptionId/cancel', auth, async (c) => {
  try {
    const subscriptionId = c.req.param('subscriptionId');
    const user = c.get('user');

    const db = getDB(c);

    // Verify subscription belongs to user
    const subscription = await db
      .selectFrom('subscriptions')
      .where('id', '=', subscriptionId)
      .where('userId', '=', user.id)
      .executeTakeFirst();

    if (!subscription) {
      return c.json({ error: 'Subscription not found or access denied' }, 404);
    }

    if (subscription.status !== 'active') {
      return c.json({ error: 'Can only cancel active subscriptions' }, 400);
    }

    await db
      .updateTable('subscriptions')
      .set({
        status: 'cancelled',
        autoRenew: false,
        updatedAt: new Date().toISOString()
      })
      .where('id', '=', subscriptionId)
      .execute();

    return c.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get subscription history
app.get('/history', auth, async (c) => {
  try {
    const user = c.get('user');
    const db = getDB(c);
    const url = new URL(c.req.url);
    const type = url.searchParams.get('type') || 'platform';

    if (!['platform', 'live_class'].includes(type)) {
      return c.json({ error: 'Invalid subscription type' }, 400);
    }

    const tableName = type === 'live_class' ? 'live_class_subscriptions' : 'subscriptions';
    const paymentTableName = type === 'live_class' ? 'live_class_subscription_payments' : 'subscription_payments';

    const subscriptions = await db
      .selectFrom(tableName)
      .where('userId', '=', user.id)
      .selectAll()
      .orderBy('createdAt', 'desc')
      .execute();

    const payments = await db
      .selectFrom(paymentTableName)
      .innerJoin(tableName, `${paymentTableName}.subscriptionId`, `${tableName}.id`)
      .where(`${tableName}.userId`, '=', user.id)
      .select([
        `${paymentTableName}.id`,
        `${paymentTableName}.subscriptionId`,
        `${paymentTableName}.amount`,
        `${paymentTableName}.currency`,
        `${paymentTableName}.status`,
        `${paymentTableName}.paymentGateway`,
        `${paymentTableName}.transactionRef`,
        `${paymentTableName}.paymentDate`,
        `${paymentTableName}.createdAt`,
        `${tableName}.planType`
      ])
      .orderBy(`${paymentTableName}.createdAt`, 'desc')
      .execute();

    const fees = type === 'live_class' ? LIVE_CLASS_FEES : PLATFORM_FEES;

    return c.json({
      subscriptions,
      payments,
      fees
    });
  } catch (error) {
    console.error('Error fetching subscription history:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Admin endpoint to get all subscriptions
app.get('/admin/all', auth, async (c) => {
  try {
    const user = c.get('user');

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const db = getDB(c);
    const subscriptions = await db
      .selectFrom('subscriptions')
      .innerJoin('users', 'subscriptions.userId', 'users.id')
      .select([
        'subscriptions.*',
        'users.name',
        'users.email',
        'users.role'
      ])
      .orderBy('subscriptions.createdAt', 'desc')
      .execute();

    const stats = {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: subscriptions.filter(s => s.status === 'active').length,
      monthlyRevenue: subscriptions
        .filter(s => s.status === 'active' && s.planType === 'monthly')
        .length * PLATFORM_FEES.monthly,
      yearlyRevenue: subscriptions
        .filter(s => s.status === 'active' && s.planType === 'yearly')
        .length * PLATFORM_FEES.yearly,
      totalRevenue: 0
    };

    stats.totalRevenue = stats.monthlyRevenue + stats.yearlyRevenue;

    return c.json({
      subscriptions,
      stats,
      platformFees: PLATFORM_FEES
    });
  } catch (error) {
    console.error('Error fetching admin subscriptions:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;