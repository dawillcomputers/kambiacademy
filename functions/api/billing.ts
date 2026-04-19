import { getAuthUser, isFullAdmin, isSystemOverride } from '../_shared/auth';
import { getDefaultLiveHoursPolicy, getTeacherLiveHoursUsage } from '../_shared/liveUsage';

interface Env {
  DB: D1Database;
}

type BillingServiceKey = 'platform' | 'storage' | 'live_class';

const BILLING_START_DATE = '2026-05-01T00:00:00.000Z';
const BYTES_PER_GB = 1024 * 1024 * 1024;
const AVERAGE_VIDEO_GB_PER_LIVE_SESSION = 1.8;

const BILLING_CATALOG = {
  services: [
    {
      key: 'platform',
      label: 'Platform Access',
      monthly: 4,
      yearly: 44,
      description: 'Required for teacher dashboard access, publishing, classes, assignments, quizzes, and core teaching tools.',
      unlocks: ['Teacher dashboard access', 'Course publishing tools', 'Assignment and quiz management'],
      enforcedOn: ['Teacher course routes', 'Class management endpoints', 'Assignment and quiz endpoints'],
    },
    {
      key: 'storage',
      label: 'Cloudflare Storage',
      monthly: 2,
      yearly: 24,
      description: 'Covers R2-backed file uploads, material hosting, and storage-heavy classroom assets.',
      unlocks: ['Material uploads', 'Material deletion and storage management', 'Cloudflare-backed asset hosting'],
      enforcedOn: ['Material upload endpoint', 'Material deletion endpoint', 'Storage-backed classroom assets'],
    },
    {
      key: 'live_class',
      label: 'Live Class Access',
      monthly: 2.2,
      yearly: 26.4,
      description: 'Covers Cloudflare Realtime live sessions, teacher broadcasts, and recurring session access.',
      unlocks: ['Start live sessions', 'End live sessions', 'Realtime classroom access'],
      enforcedOn: ['Live session start endpoint', 'Live session end endpoint', 'Realtime live-class workflow'],
    },
  ],
  addons: [
    { key: 'recording', label: 'Recording', price: 3, unit: '/month', description: 'Keep recordings enabled for class playback and archive workflows.' },
    { key: 'hd', label: 'HD Video', price: 3, unit: '/month', description: 'Higher media quality for premium live classes.' },
    { key: 'extra_hours', label: 'Extra Hours', price: 2, unit: '/10 hours', description: 'Add headroom when teaching time grows faster than plan usage.' },
    { key: 'class_size', label: 'Participant Boost', price: 5, unit: '/tier', description: 'Increase participant caps for large live cohorts.' },
    { key: 'student_video', label: 'Student Video', price: 4, unit: '/month', description: 'Enable more student video feeds with stricter cost controls.' },
    { key: 'storage', label: 'Extra Storage', price: 2, unit: '/GB', description: 'Additional storage capacity on top of the base Cloudflare Storage service.' },
  ],
  costModel: {
    sfuPerVideoGb: 0.05,
    storagePerGb: 0.015,
    workerPerRequest: 0.0001,
  },
  profitGuards: {
    warningMargin: 0.5,
    dangerMargin: 0.4,
  },
  enforcementPipeline: [
    'User -> Worker -> Subscription Engine -> Enforcement Engine -> Cloudflare Services',
    'Platform Access gates teaching tools and dashboard workflows.',
    'Cloudflare Storage gates upload and storage mutation flows.',
    'Live Class Access gates realtime class creation and live controls.',
  ],
};

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const safeFirst = async <T>(db: D1Database, query: string, binds: unknown[] = []): Promise<T | null> => {
  try {
    return (await db.prepare(query).bind(...binds).first<T>()) ?? null;
  } catch {
    return null;
  }
};

const safeAll = async <T>(db: D1Database, query: string, binds: unknown[] = []): Promise<T[]> => {
  try {
    const result = await db.prepare(query).bind(...binds).all<T>();
    return result.results ?? [];
  } catch {
    return [];
  }
};

const calculateEstimatedCosts = (videoGB: number, storageGB: number, workerRequests: number) => {
  const sfuCost = roundCurrency(videoGB * BILLING_CATALOG.costModel.sfuPerVideoGb);
  const storageCost = roundCurrency(storageGB * BILLING_CATALOG.costModel.storagePerGb);
  const workerCost = roundCurrency(workerRequests * BILLING_CATALOG.costModel.workerPerRequest);

  return {
    sfuCost,
    storageCost,
    workerCost,
    totalCost: roundCurrency(sfuCost + storageCost + workerCost),
  };
};

const calculateProfitSummary = (revenue: number, cost: number) => {
  const profit = roundCurrency(revenue - cost);
  const margin = revenue > 0 ? profit / revenue : 0;

  if (revenue <= 0) {
    return {
      profit,
      margin,
      status: 'warning',
      action: 'collect_revenue',
      label: 'Revenue required',
    };
  }

  if (margin < BILLING_CATALOG.profitGuards.dangerMargin) {
    return {
      profit,
      margin,
      status: 'danger',
      action: 'restrict_features',
      label: 'Restrict features',
    };
  }

  if (margin < BILLING_CATALOG.profitGuards.warningMargin) {
    return {
      profit,
      margin,
      status: 'warning',
      action: 'suggest_upgrade',
      label: 'Suggest upgrade',
    };
  }

  return {
    profit,
    margin,
    status: 'healthy',
    action: 'none',
    label: 'Healthy margin',
  };
};

const getServiceFees = (service: BillingServiceKey) =>
  BILLING_CATALOG.services.find((entry) => entry.key === service) ?? BILLING_CATALOG.services[0];

const billingRequiredNow = () => Date.now() >= new Date(BILLING_START_DATE).getTime();

async function getPlatformSubscriptionState(db: D1Database, userId: number) {
  const [activeSubscription, pendingPayments, paymentHistory] = await Promise.all([
    safeFirst<any>(
      db,
      `SELECT s.*
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
      [userId],
    ),
    safeAll<any>(
      db,
      `SELECT p.*, s.planType
       FROM subscription_payments p
       JOIN subscriptions s ON s.id = p.subscriptionId
       WHERE s.userId = ?
         AND p.status = 'pending'
       ORDER BY p.createdAt DESC`,
      [userId],
    ),
    safeAll<any>(
      db,
      `SELECT p.amount, p.status, p.transactionRef, p.paymentDate, p.createdAt, p.paymentGateway, s.planType, 'platform' as subscriptionType
       FROM subscription_payments p
       JOIN subscriptions s ON s.id = p.subscriptionId
       WHERE s.userId = ?
       ORDER BY p.createdAt DESC
       LIMIT 8`,
      [userId],
    ),
  ]);

  return {
    service: 'platform',
    label: 'Platform Access',
    fees: getServiceFees('platform'),
    requiresSubscription: billingRequiredNow(),
    hasActiveSubscription: Boolean(activeSubscription),
    subscription: activeSubscription,
    pendingPayments,
    paymentHistory,
  };
}

async function getScopedServiceState(db: D1Database, userId: number, serviceType: 'storage' | 'live_class') {
  try {
    const [activeSubscription, pendingPayments, paymentHistory] = await Promise.all([
      safeFirst<any>(
        db,
        `SELECT s.*
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
         ORDER BY s.createdAt DESC
         LIMIT 1`,
        [userId, serviceType, serviceType],
      ),
      safeAll<any>(
        db,
        `SELECT p.*, s.planType
         FROM live_class_subscription_payments p
         JOIN live_class_subscriptions s ON s.id = p.subscriptionId
         WHERE s.userId = ?
           AND p.serviceType = ?
           AND s.serviceType = ?
           AND p.status = 'pending'
         ORDER BY p.createdAt DESC`,
        [userId, serviceType, serviceType],
      ),
      safeAll<any>(
        db,
        `SELECT p.amount, p.status, p.transactionRef, p.paymentDate, p.createdAt, p.paymentGateway, s.planType, p.serviceType as subscriptionType
         FROM live_class_subscription_payments p
         JOIN live_class_subscriptions s ON s.id = p.subscriptionId
         WHERE s.userId = ?
           AND p.serviceType = ?
           AND s.serviceType = ?
         ORDER BY p.createdAt DESC
         LIMIT 8`,
        [userId, serviceType, serviceType],
      ),
    ]);

    return {
      service: serviceType,
      label: getServiceFees(serviceType).label,
      fees: getServiceFees(serviceType),
      requiresSubscription: billingRequiredNow(),
      hasActiveSubscription: Boolean(activeSubscription),
      subscription: activeSubscription,
      pendingPayments,
      paymentHistory,
    };
  } catch {
    if (serviceType === 'live_class') {
      const legacyHistory = await safeAll<any>(
        db,
        `SELECT p.amount, p.status, p.transactionRef, p.paymentDate, p.createdAt, p.paymentGateway, s.planType, 'live_class' as subscriptionType
         FROM live_class_subscription_payments p
         JOIN live_class_subscriptions s ON s.id = p.subscriptionId
         WHERE s.userId = ?
         ORDER BY p.createdAt DESC
         LIMIT 8`,
        [userId],
      );

      return {
        service: serviceType,
        label: getServiceFees(serviceType).label,
        fees: getServiceFees(serviceType),
        requiresSubscription: billingRequiredNow(),
        hasActiveSubscription: Boolean(
          await safeFirst<any>(
            db,
            `SELECT s.id
             FROM live_class_subscriptions s
             WHERE s.userId = ?
               AND s.status = 'active'
               AND s.endDate > datetime('now')
             ORDER BY s.createdAt DESC
             LIMIT 1`,
            [userId],
          ),
        ),
        subscription: null,
        pendingPayments: [],
        paymentHistory: legacyHistory,
      };
    }

    return {
      service: serviceType,
      label: getServiceFees(serviceType).label,
      fees: getServiceFees(serviceType),
      requiresSubscription: billingRequiredNow(),
      hasActiveSubscription: false,
      subscription: null,
      pendingPayments: [],
      paymentHistory: [],
    };
  }
}

async function buildTeacherMetrics(db: D1Database, teacher: { id: number; name: string; email: string; role: string; status?: string }) {
  const [platformState, storageState, liveClassState] = await Promise.all([
    getPlatformSubscriptionState(db, teacher.id),
    getScopedServiceState(db, teacher.id, 'storage'),
    getScopedServiceState(db, teacher.id, 'live_class'),
  ]);

  const liveHours = await getTeacherLiveHoursUsage(db, teacher.id);

  const [courseStats, classStats, materialStats, liveSessionStats, revenueStats, platformRevenue, storageRevenue, liveClassRevenue, systemEvents] = await Promise.all([
    safeFirst<{ count: number }>(db, 'SELECT COUNT(*) as count FROM tutor_courses WHERE tutor_id = ?', [teacher.id]),
    safeFirst<{ count: number }>(db, 'SELECT COUNT(*) as count FROM private_classes WHERE tutor_id = ?', [teacher.id]),
    safeFirst<{ materialCount: number; storageBytes: number }>(
      db,
      'SELECT COUNT(*) as materialCount, COALESCE(SUM(file_size), 0) as storageBytes FROM course_materials WHERE tutor_id = ?',
      [teacher.id],
    ),
    safeFirst<{ count: number }>(db, 'SELECT COUNT(*) as count FROM live_sessions WHERE tutor_id = ?', [teacher.id]),
    safeFirst<{ platformRevenue: number; teacherPayout: number; grossRevenue: number }>(
      db,
      `SELECT
         COALESCE(SUM(platform_fee), 0) as platformRevenue,
         COALESCE(SUM(teacher_payout), 0) as teacherPayout,
         COALESCE(SUM(final_amount), 0) as grossRevenue
       FROM revenue_transactions
       WHERE teacher_id = ?`,
      [teacher.id],
    ),
    safeFirst<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(p.amount), 0) as total
       FROM subscription_payments p
       JOIN subscriptions s ON s.id = p.subscriptionId
       WHERE s.userId = ?
         AND p.status = 'success'`,
      [teacher.id],
    ),
    safeFirst<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(p.amount), 0) as total
       FROM live_class_subscription_payments p
       JOIN live_class_subscriptions s ON s.id = p.subscriptionId
       WHERE s.userId = ?
         AND p.status = 'success'
         AND p.serviceType = 'storage'
         AND s.serviceType = 'storage'`,
      [teacher.id],
    ),
    safeFirst<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(p.amount), 0) as total
       FROM live_class_subscription_payments p
       JOIN live_class_subscriptions s ON s.id = p.subscriptionId
       WHERE s.userId = ?
         AND p.status = 'success'
         AND p.serviceType = 'live_class'
         AND s.serviceType = 'live_class'`,
      [teacher.id],
    ),
    safeAll<{ action: string; description: string; timestamp: string }>(
      db,
      `SELECT action, description, timestamp
       FROM audit_logs
       WHERE user_id = 0
         AND description LIKE ?
       ORDER BY timestamp DESC
       LIMIT 8`,
      [`%${teacher.email}%`],
    ),
  ]);

  const coursesCount = toNumber(courseStats?.count);
  const classesCount = toNumber(classStats?.count);
  const materialsCount = toNumber(materialStats?.materialCount);
  const storageBytes = toNumber(materialStats?.storageBytes);
  const liveSessionsCount = toNumber(liveSessionStats?.count);
  const storageGB = roundCurrency(storageBytes / BYTES_PER_GB);
  const videoGB = roundCurrency(liveSessionsCount * AVERAGE_VIDEO_GB_PER_LIVE_SESSION);
  const workerRequests = Math.max(1, (coursesCount * 12) + (classesCount * 20) + (materialsCount * 8) + (liveSessionsCount * 40));
  const costs = calculateEstimatedCosts(videoGB, storageGB, workerRequests);

  const platformCourseRevenue = toNumber(revenueStats?.platformRevenue);
  const subscriptionRevenue = roundCurrency(
    toNumber(platformRevenue?.total) + toNumber(storageRevenue?.total) + toNumber(liveClassRevenue?.total),
  );
  const estimatedRevenue = roundCurrency(platformCourseRevenue + subscriptionRevenue);
  const profitability = calculateProfitSummary(estimatedRevenue, costs.totalCost);

  const dueItems = [platformState, storageState, liveClassState]
    .filter((entry) => entry.requiresSubscription && !entry.hasActiveSubscription)
    .map((entry) => ({
      key: entry.service,
      label: entry.label,
      monthly: entry.fees.monthly,
      yearly: entry.fees.yearly,
      pendingPayments: entry.pendingPayments.length,
    }));

  const paymentHistory = [...platformState.paymentHistory, ...storageState.paymentHistory, ...liveClassState.paymentHistory]
    .sort((left, right) => new Date(right.createdAt || right.paymentDate || 0).getTime() - new Date(left.createdAt || left.paymentDate || 0).getTime())
    .slice(0, 12);

  return {
    teacher,
    subscriptions: {
      platform: platformState,
      storage: storageState,
      liveClass: liveClassState,
    },
    dueItems,
    dueCount: dueItems.length,
    dueAmount: roundCurrency(dueItems.reduce((sum, item) => sum + item.monthly, 0)),
    usage: {
      coursesCount,
      classesCount,
      materialsCount,
      liveSessionsCount,
      storageGB,
      videoGB,
      workerRequests,
    },
    liveHours,
    revenue: {
      platformCourseRevenue: roundCurrency(platformCourseRevenue),
      subscriptionRevenue,
      estimatedRevenue,
    },
    costs,
    profitability,
    paymentHistory,
    systemEvents,
  };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'teacher' && !isFullAdmin(user)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const trackingSummary = {
    usageEvents: toNumber((await safeFirst<{ count: number }>(env.DB, 'SELECT COUNT(*) as count FROM usage_tracking'))?.count),
    costLogs: toNumber((await safeFirst<{ count: number }>(env.DB, 'SELECT COUNT(*) as count FROM cost_logs'))?.count),
    activeOverrides: toNumber((await safeFirst<{ count: number }>(env.DB, 'SELECT COUNT(*) as count FROM pricing_overrides WHERE active = 1'))?.count),
    activeAddons: toNumber((await safeFirst<{ count: number }>(env.DB, 'SELECT COUNT(*) as count FROM addons WHERE active = 1'))?.count),
  };

  const response: Record<string, unknown> = {
    viewer: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      systemOverride: isSystemOverride(user),
      canTrackEverything: user.role === 'super_admin' || isSystemOverride(user),
    },
    catalog: BILLING_CATALOG,
    billingStartDate: BILLING_START_DATE,
    tracking: trackingSummary,
  };

  if (user.role === 'teacher') {
    response.teacher = await buildTeacherMetrics(env.DB, user);
    return Response.json(response);
  }

  const teachers = await safeAll<{ id: number; name: string; email: string; role: string; status?: string }>(
    env.DB,
    `SELECT id, name, email, role, status
     FROM users
     WHERE role = 'teacher'
     ORDER BY created_at DESC`,
  );

  const teacherMetrics = await Promise.all(teachers.map((teacher) => buildTeacherMetrics(env.DB, teacher)));
  const defaultLiveHoursPolicy = await getDefaultLiveHoursPolicy(env.DB);
  const systemEvents = await safeAll<{ action: string; description: string; timestamp: string }>(
    env.DB,
    `SELECT action, description, timestamp
     FROM audit_logs
     WHERE user_id = 0
     ORDER BY timestamp DESC
     LIMIT 20`,
  );
  const pricingOverrides = await safeAll<any>(env.DB, 'SELECT * FROM pricing_overrides WHERE active = 1 ORDER BY updated_at DESC LIMIT 20');

  const totalEstimatedRevenue = roundCurrency(teacherMetrics.reduce((sum, item) => sum + toNumber(item.revenue.estimatedRevenue), 0));
  const totalEstimatedCost = roundCurrency(teacherMetrics.reduce((sum, item) => sum + toNumber(item.costs.totalCost), 0));
  const summaryProfit = calculateProfitSummary(totalEstimatedRevenue, totalEstimatedCost);

  response.system = {
    totals: {
      teachers: teacherMetrics.length,
      platformCourseRevenue: roundCurrency(teacherMetrics.reduce((sum, item) => sum + toNumber(item.revenue.platformCourseRevenue), 0)),
      subscriptionRevenue: roundCurrency(teacherMetrics.reduce((sum, item) => sum + toNumber(item.revenue.subscriptionRevenue), 0)),
      totalEstimatedRevenue,
      totalEstimatedCost,
      estimatedProfit: summaryProfit.profit,
      averageMargin: teacherMetrics.length
        ? roundCurrency(teacherMetrics.reduce((sum, item) => sum + toNumber(item.profitability.margin), 0) / teacherMetrics.length)
        : 0,
      dueAmount: roundCurrency(teacherMetrics.reduce((sum, item) => sum + toNumber(item.dueAmount), 0)),
      dueCount: teacherMetrics.reduce((sum, item) => sum + toNumber(item.dueCount), 0),
      healthyTeachers: teacherMetrics.filter((item) => item.profitability.status === 'healthy').length,
      warningTeachers: teacherMetrics.filter((item) => item.profitability.status === 'warning').length,
      dangerTeachers: teacherMetrics.filter((item) => item.profitability.status === 'danger').length,
    },
    liveHoursPolicy: defaultLiveHoursPolicy,
    teachers: teacherMetrics,
    pricingOverrides,
    systemEvents,
  };

  return Response.json(response);
};