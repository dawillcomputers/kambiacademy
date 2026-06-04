import { getAuthUser, getSuperAdminBillingStatus, isFullAdmin, isSystemOverride, resolveSystemBillingUser } from '../_shared/auth';
import { getDefaultLiveHoursPolicy, getTeacherLiveHoursUsage } from '../_shared/liveUsage';

interface Env {
  DB: D1Database;
}

type BillingServiceKey = 'platform' | 'storage' | 'live_class';

const BILLING_START_DATE = '2026-05-01T00:00:00.000Z';
const BYTES_PER_GB = 1024 * 1024 * 1024;
const AVERAGE_VIDEO_GB_PER_LIVE_SESSION = 1.8;
const SYSTEM_BASE_LIVE_HOURS = 16;
const SYSTEM_PREPAID_HOURS_KEY = 'system_live_hours_prepaid_balance';
const SYSTEM_LIVE_HOURS_ALLOCATION_PREFIX = 'system_live_hours_allocation:';

const BILLING_CATALOG = {
  services: [
    {
      key: 'platform',
      label: 'Main Subscription',
      monthly: 9,
      yearly: 100,
      description: 'Single subscription that keeps the admin billing cycle active.',
      unlocks: ['Admin and superadmin billing coverage'],
      enforcedOn: ['Admin and superadmin platform access'],
      requiredForSystemBase: true,
    },
    {
      key: 'storage',
      label: 'Storage Add-on',
      monthly: 2,
      yearly: 24,
      description: 'Optional storage add-on for teachers who need hosted files and larger assets.',
      unlocks: ['Material uploads', 'Hosted files'],
      enforcedOn: ['Teacher storage add-on checkout'],
      requiredForSystemBase: false,
    },
    {
      key: 'live_class',
      label: 'Live Classes Add-on',
      monthly: 2,
      yearly: 24,
      description: 'Optional live-class add-on for teachers who need realtime teaching tools.',
      unlocks: ['Start live sessions', 'Run live classes'],
      enforcedOn: ['Teacher live-class add-on checkout'],
      requiredForSystemBase: false,
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
    'Admin and superadmin access follows one main subscription.',
    'Teacher storage and live classes are optional add-ons.',
    'Live-hour overflow is billed separately from the main subscription.',
  ],
};

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundCurrency = (value: number) => Math.round(value * 100) / 100;
const roundHours = (value: number) => Math.round(value * 10) / 10;

const getPaymentTimestamp = (entry: { createdAt?: string; paymentDate?: string; created_at?: string }) =>
  new Date(entry.createdAt || entry.paymentDate || entry.created_at || 0).getTime();

const getEffectiveAddonPrice = (key: string, pricingOverrides: Array<{ target?: string; target_id?: string | number; new_price?: number }> = []) => {
  const basePrice = toNumber(BILLING_CATALOG.addons.find((entry) => entry.key === key)?.price);
  const override = pricingOverrides.find((entry) => entry.target === 'addon' && String(entry.target_id) === key);
  return roundCurrency(override ? toNumber(override.new_price) : basePrice);
};

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
    label: getServiceFees('platform').label,
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

  const [earningsSummary, heldSummary] = await Promise.all([
    safeFirst<{ total_earned: number; total_withdrawn: number; available_balance: number }>(
      db,
      'SELECT total_earned, total_withdrawn, available_balance FROM teacher_earnings WHERE teacher_id = ?',
      [teacher.id],
    ),
    safeFirst<{ held_balance: number }>(
      db,
      'SELECT COALESCE(SUM(held_balance), 0) as held_balance FROM course_earnings WHERE teacher_id = ?',
      [teacher.id],
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

  const teacherSubscriptions = {
    platform: {
      ...platformState,
      label: 'Core Access',
      requiresSubscription: false,
    },
    storage: {
      ...storageState,
      label: 'Storage Add-on',
      requiresSubscription: false,
    },
    liveClass: {
      ...liveClassState,
      label: 'Live Classes Add-on',
      requiresSubscription: false,
    },
  };

  const dueItems: Array<{ key: string; label: string; monthly: number; yearly: number; pendingPayments: number }> = [];

  const paymentHistory = [...storageState.paymentHistory, ...liveClassState.paymentHistory]
    .sort((left, right) => new Date(right.createdAt || right.paymentDate || 0).getTime() - new Date(left.createdAt || left.paymentDate || 0).getTime())
    .slice(0, 12);

  return {
    teacher,
    subscriptions: teacherSubscriptions,
    dueItems,
    dueCount: 0,
    dueAmount: 0,
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
      teacherEarned: roundCurrency(toNumber(earningsSummary?.total_earned)),
      teacherWithdrawn: roundCurrency(toNumber(earningsSummary?.total_withdrawn)),
      availableBalance: roundCurrency(toNumber(earningsSummary?.available_balance)),
      heldBalance: roundCurrency(toNumber(heldSummary?.held_balance)),
    },
    costs,
    profitability,
    paymentHistory,
    systemEvents,
  };
}

async function buildStudentPaymentsSnapshot(db: D1Database) {
  const [totals, recent] = await Promise.all([
    safeFirst<{
      grossRevenue: number;
      platformRevenue: number;
      teacherPayout: number;
      transactionCount: number;
      paidStudents: number;
    }>(
      db,
      `SELECT
         COALESCE(SUM(final_amount), 0) as grossRevenue,
         COALESCE(SUM(platform_fee), 0) as platformRevenue,
         COALESCE(SUM(teacher_payout), 0) as teacherPayout,
         COUNT(*) as transactionCount,
         COUNT(DISTINCT student_id) as paidStudents
       FROM revenue_transactions`,
    ),
    safeAll<any>(
      db,
      `SELECT
         rt.id,
         rt.final_amount as amount,
         rt.platform_fee as platformFee,
         rt.teacher_payout as teacherPayout,
         rt.currency,
         rt.student_country as studentCountry,
         rt.course_id as courseSlug,
         COALESCE(tc.title, rt.course_id) as courseTitle,
         rt.created_at as createdAt,
         student.name as studentName,
         student.email as studentEmail,
         teacher.name as teacherName,
         teacher.email as teacherEmail
       FROM revenue_transactions rt
       LEFT JOIN users student ON student.id = rt.student_id
       LEFT JOIN users teacher ON teacher.id = rt.teacher_id
       LEFT JOIN tutor_courses tc ON tc.slug = rt.course_id
       ORDER BY rt.created_at DESC
       LIMIT 18`,
    ),
  ]);

  return {
    totals: {
      grossRevenue: roundCurrency(toNumber(totals?.grossRevenue)),
      platformRevenue: roundCurrency(toNumber(totals?.platformRevenue)),
      teacherPayout: roundCurrency(toNumber(totals?.teacherPayout)),
      transactionCount: toNumber(totals?.transactionCount),
      paidStudents: toNumber(totals?.paidStudents),
    },
    recent,
  };
}

function getPaymentQueryConfig(service: BillingServiceKey) {
  if (service === 'platform') {
    return {
      subscriptionTable: 'subscriptions',
      paymentTable: 'subscription_payments',
      serviceClause: '',
      binds: [] as unknown[],
      subscriptionType: 'platform',
    };
  }

  return {
    subscriptionTable: 'live_class_subscriptions',
    paymentTable: 'live_class_subscription_payments',
    serviceClause: ' AND s.serviceType = ? AND p.serviceType = ?',
    binds: [service, service] as unknown[],
    subscriptionType: service,
  };
}

async function getRolePaymentStats(db: D1Database, role: string, service: BillingServiceKey) {
  const config = getPaymentQueryConfig(service);
  const stats = await safeFirst<{
    successAmount: number;
    pendingAmount: number;
    successCount: number;
    pendingCount: number;
  }>(
    db,
    `SELECT
       COALESCE(SUM(CASE WHEN p.status = 'success' THEN p.amount ELSE 0 END), 0) as successAmount,
       COALESCE(SUM(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END), 0) as pendingAmount,
       COALESCE(SUM(CASE WHEN p.status = 'success' THEN 1 ELSE 0 END), 0) as successCount,
       COALESCE(SUM(CASE WHEN p.status = 'pending' THEN 1 ELSE 0 END), 0) as pendingCount
     FROM ${config.paymentTable} p
     JOIN ${config.subscriptionTable} s ON s.id = p.subscriptionId
     JOIN users u ON u.id = s.userId
     WHERE u.role = ?${config.serviceClause}`,
    [role, ...config.binds],
  );

  return {
    service,
    label: getServiceFees(service).label,
    successAmount: roundCurrency(toNumber(stats?.successAmount)),
    pendingAmount: roundCurrency(toNumber(stats?.pendingAmount)),
    successCount: toNumber(stats?.successCount),
    pendingCount: toNumber(stats?.pendingCount),
  };
}

async function getRecentRolePayments(db: D1Database, role: string, service: BillingServiceKey, limit = 12) {
  const config = getPaymentQueryConfig(service);
  return safeAll<any>(
    db,
    `SELECT
       p.id,
       p.amount,
       p.status,
       p.transactionRef,
       p.paymentDate,
       p.createdAt,
       s.planType,
       '${config.subscriptionType}' as subscriptionType,
       u.id as userId,
       u.name as userName,
       u.email as userEmail
     FROM ${config.paymentTable} p
     JOIN ${config.subscriptionTable} s ON s.id = p.subscriptionId
     JOIN users u ON u.id = s.userId
     WHERE u.role = ?${config.serviceClause}
     ORDER BY p.createdAt DESC
     LIMIT ?`,
    [role, ...config.binds, limit],
  );
}

async function buildTeacherPaymentsSnapshot(db: D1Database, teacherMetrics: Array<any>) {
  const [platformStats, storageStats, liveClassStats, platformRecent, storageRecent, liveClassRecent] = await Promise.all([
    getRolePaymentStats(db, 'teacher', 'platform'),
    getRolePaymentStats(db, 'teacher', 'storage'),
    getRolePaymentStats(db, 'teacher', 'live_class'),
    getRecentRolePayments(db, 'teacher', 'platform'),
    getRecentRolePayments(db, 'teacher', 'storage'),
    getRecentRolePayments(db, 'teacher', 'live_class'),
  ]);

  const breakdown = [platformStats, storageStats, liveClassStats];
  const recent = [...platformRecent, ...storageRecent, ...liveClassRecent]
    .sort((left, right) => getPaymentTimestamp(right) - getPaymentTimestamp(left))
    .slice(0, 18)
    .map((payment) => ({
      ...payment,
      label: getServiceFees(payment.subscriptionType as BillingServiceKey).label,
    }));

  return {
    totals: {
      collectedAmount: roundCurrency(breakdown.reduce((sum, entry) => sum + entry.successAmount, 0)),
      pendingAmount: roundCurrency(breakdown.reduce((sum, entry) => sum + entry.pendingAmount, 0)),
      successCount: breakdown.reduce((sum, entry) => sum + entry.successCount, 0),
      pendingCount: breakdown.reduce((sum, entry) => sum + entry.pendingCount, 0),
      dueTeachers: teacherMetrics.filter((entry) => toNumber(entry.dueCount) > 0).length,
      dueAmount: roundCurrency(teacherMetrics.reduce((sum, entry) => sum + toNumber(entry.dueAmount), 0)),
    },
    breakdown,
    recent,
  };
}

async function buildSystemPaymentsSnapshot(options: {
  db: D1Database;
  billingOwner: { id: number; name: string; email: string; role: string };
  teacherMetrics: Array<any>;
  pricingOverrides: Array<any>;
}) {
  const { db, billingOwner, teacherMetrics, pricingOverrides } = options;
  const [platformState, storageState, liveClassState, settingsRows] = await Promise.all([
    getPlatformSubscriptionState(db, billingOwner.id),
    getScopedServiceState(db, billingOwner.id, 'storage'),
    getScopedServiceState(db, billingOwner.id, 'live_class'),
    safeAll<{ key: string; value: string }>(
      db,
      `SELECT key, value
       FROM platform_settings
       WHERE key = ?
          OR key LIKE ?
       ORDER BY key`,
      [SYSTEM_PREPAID_HOURS_KEY, `${SYSTEM_LIVE_HOURS_ALLOCATION_PREFIX}%`],
    ),
  ]);

  const prepaidBalance = roundHours(
    toNumber(settingsRows.find((row) => row.key === SYSTEM_PREPAID_HOURS_KEY)?.value),
  );
  const allocationMap = new Map<number, number>();
  for (const row of settingsRows) {
    if (!row.key.startsWith(SYSTEM_LIVE_HOURS_ALLOCATION_PREFIX)) {
      continue;
    }

    const teacherId = Number(row.key.slice(SYSTEM_LIVE_HOURS_ALLOCATION_PREFIX.length));
    if (!Number.isFinite(teacherId)) {
      continue;
    }

    allocationMap.set(teacherId, roundHours(toNumber(row.value)));
  }

  const totalLiveHoursUsed = roundHours(
    teacherMetrics.reduce((sum, entry) => sum + toNumber(entry.liveHours?.hoursUsedThisMonth), 0),
  );
  const totalStorageGB = roundCurrency(
    teacherMetrics.reduce((sum, entry) => sum + toNumber(entry.usage?.storageGB), 0),
  );
  const overflowHours = roundHours(Math.max(0, totalLiveHoursUsed - SYSTEM_BASE_LIVE_HOURS));
  const billableOverflowHours = roundHours(Math.max(0, overflowHours - prepaidBalance));
  const extraHoursUnitPrice = getEffectiveAddonPrice('extra_hours', pricingOverrides);
  const overflowUnits = billableOverflowHours > 0 ? Math.ceil(billableOverflowHours / 10) : 0;
  const overflowCharge = roundCurrency(overflowUnits * extraHoursUnitPrice);
  const serviceStates = [platformState, storageState, liveClassState];
  const baseServiceStates = [platformState];
  const baseDueItems = baseServiceStates
    .filter((entry) => entry.requiresSubscription && !entry.hasActiveSubscription)
    .map((entry) => ({
      key: entry.service,
      label: entry.label,
      monthly: roundCurrency(toNumber(entry.fees?.monthly)),
      yearly: roundCurrency(toNumber(entry.fees?.yearly)),
      status: 'due',
    }));
  const baseDueAmount = roundCurrency(baseDueItems.reduce((sum, entry) => sum + entry.monthly, 0));
  const paymentHistory = [...platformState.paymentHistory, ...storageState.paymentHistory, ...liveClassState.paymentHistory]
    .sort((left, right) => getPaymentTimestamp(right) - getPaymentTimestamp(left))
    .slice(0, 14);
  const allocations = teacherMetrics
    .map((entry) => {
      const allocatedHours = roundHours(allocationMap.get(entry.teacher.id) ?? 0);
      const usedHours = roundHours(toNumber(entry.liveHours?.hoursUsedThisMonth));
      const baseHours = roundHours(toNumber(entry.liveHours?.baseMonthlyLimitHours));
      const totalHours = roundHours(toNumber(entry.liveHours?.monthlyLimitHours));
      return {
        teacherId: entry.teacher.id,
        teacherName: entry.teacher.name,
        teacherEmail: entry.teacher.email,
        baseHours,
        allocatedHours,
        totalHours,
        usedHours,
        remainingHours: roundHours(toNumber(entry.liveHours?.remainingHours)),
        dueCount: toNumber(entry.dueCount),
        hasLiveClassAccess: Boolean(entry.subscriptions?.liveClass?.hasActiveSubscription),
      };
    })
    .sort((left, right) => {
      if (right.allocatedHours !== left.allocatedHours) {
        return right.allocatedHours - left.allocatedHours;
      }

      return left.teacherName.localeCompare(right.teacherName);
    });
  const allocatedHours = roundHours(allocations.reduce((sum, entry) => sum + entry.allocatedHours, 0));
  const availableToAllocate = roundHours(Math.max(0, prepaidBalance - allocatedHours));
  const overAllocatedHours = roundHours(Math.max(0, allocatedHours - prepaidBalance));
  const monthlyBaseStack = roundCurrency(
    BILLING_CATALOG.services
      .filter((entry) => entry.requiredForSystemBase)
      .reduce((sum, entry) => sum + toNumber(entry.monthly), 0),
  );
  const yearlyBaseStack = roundCurrency(
    BILLING_CATALOG.services
      .filter((entry) => entry.requiredForSystemBase)
      .reduce((sum, entry) => sum + toNumber(entry.yearly), 0),
  );
  const addonCatalog = BILLING_CATALOG.addons.map((addon) => ({
    ...addon,
    basePrice: roundCurrency(toNumber(addon.price)),
    effectivePrice: getEffectiveAddonPrice(addon.key, pricingOverrides),
  }));

  return {
    billingOwner: {
      id: billingOwner.id,
      name: billingOwner.name,
      email: billingOwner.email,
      role: billingOwner.role,
    },
    serviceStates,
    paymentHistory,
    baseDueItems,
    monthlyBaseStack,
    yearlyBaseStack,
    baseDueAmount,
    variableDueAmount: overflowCharge,
    totalDueAmount: roundCurrency(baseDueAmount + overflowCharge),
    baseLiveHoursCovered: SYSTEM_BASE_LIVE_HOURS,
    totalLiveHoursUsed,
    overflowHours,
    billableOverflowHours,
    totalStorageGB,
    prepaidBalance,
    allocatedHours,
    availableToAllocate,
    overAllocatedHours,
    dueLines: [
      {
        key: 'platform',
        label: 'Main Subscription',
        amount: 9,
        status: platformState.hasActiveSubscription ? 'covered' : 'due',
        description: 'Single monthly base subscription for the admin billing cycle.',
      },
      ...(overflowCharge > 0
        ? [{
            key: 'extra_hours',
            label: 'Extra Hours',
            amount: overflowCharge,
            status: 'due',
            description: `${billableOverflowHours} billable live hours over the ${SYSTEM_BASE_LIVE_HOURS}-hour base allocation.`,
          }]
        : []),
    ],
    allocations,
    addonCatalog,
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
      canTrackEverything: user.role === 'super_admin',
      systemOnly: isSystemOverride(user),
    },
    catalog: BILLING_CATALOG,
    billingStartDate: BILLING_START_DATE,
    tracking: trackingSummary,
    superAdminBilling: await getSuperAdminBillingStatus(user, env.DB),
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
  const billingOwner = await resolveSystemBillingUser(user, env.DB);
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
  const [studentPayments, teacherPayments, systemPayments] = await Promise.all([
    buildStudentPaymentsSnapshot(env.DB),
    buildTeacherPaymentsSnapshot(env.DB, teacherMetrics),
    buildSystemPaymentsSnapshot({
      db: env.DB,
      billingOwner,
      teacherMetrics,
      pricingOverrides,
    }),
  ]);

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
    studentPayments,
    teacherPayments,
    systemPayments,
  };

  return Response.json(response);
};