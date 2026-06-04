import { getAuthUser } from '../_shared/auth';

interface Env {
  DB: D1Database;
  FLUTTERWAVE_STUDENT_SECRET_KEY?: string;
  FLUTTERWAVE_SECRET_KEY?: string;
}

interface CourseRow {
  slug: string;
  title: string;
  price: number;
  tutor_id: number;
  status: string;
}

interface SettingRow {
  key: string;
  value: string;
}

interface AIGeneratedCoursePayload {
  title?: string;
  description?: string;
  level?: string;
  duration_label?: string;
  price?: number;
}

type EnrollmentAction = 'quote' | 'initiate' | 'verify' | 'direct';

const FLUTTERWAVE_PAYMENT_GATEWAY = 'flutterwave_live';
const PRODUCTION_SITE_ORIGIN = 'https://kambiacademy.com';
const FLUTTERWAVE_PREFERRED_PAYMENT_OPTIONS = 'banktransfer,card,ussd';
const FLUTTERWAVE_FEE_FALLBACK_RATE = 0.02;
const isSuccessfulIntent = (status?: string | null) => ['success', 'successful', 'completed'].includes(String(status || '').toLowerCase());

const HIGH_COST_REGIONS = new Set([
  'USA',
  'United States',
  'Canada',
  'UK',
  'United Kingdom',
  'Germany',
  'France',
  'Italy',
  'Spain',
  'Netherlands',
  'Belgium',
  'Switzerland',
  'Austria',
  'Sweden',
  'Norway',
  'Denmark',
  'Finland',
  'Ireland',
  'Portugal',
  'Greece',
  'Poland',
  'Czech Republic',
  'Hungary',
  'Slovakia',
  'Slovenia',
  'Croatia',
  'Romania',
  'Bulgaria',
  'Serbia',
  'Bosnia',
  'Montenegro',
  'Kosovo',
  'Albania',
  'North Macedonia',
  'Malta',
  'Cyprus',
  'Iceland',
  'Luxembourg',
  'Liechtenstein',
  'Monaco',
  'Andorra',
  'San Marino',
  'Vatican City',
]);

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const resolveStudentFlutterwaveSecret = (env: Env) => env.FLUTTERWAVE_STUDENT_SECRET_KEY || env.FLUTTERWAVE_SECRET_KEY;

const slugify = (value: string) => {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return normalized || `ai-course-${Date.now()}`;
};

async function resolveAICourseOwnerId(db: D1Database) {
  const prioritizedOwner = await db.prepare(
    `SELECT id
     FROM users
     WHERE status = 'active' AND role IN ('super_admin', 'SOU', 'admin')
     ORDER BY CASE role WHEN 'super_admin' THEN 1 WHEN 'SOU' THEN 2 WHEN 'admin' THEN 3 ELSE 4 END, id ASC
     LIMIT 1`,
  ).first<{ id: number }>();

  if (prioritizedOwner?.id) {
    return prioritizedOwner.id;
  }

  const fallbackOwner = await db.prepare(
    `SELECT id
     FROM users
     WHERE status = 'active'
     ORDER BY id ASC
     LIMIT 1`,
  ).first<{ id: number }>();

  return fallbackOwner?.id;
}

async function ensureAIGeneratedCourse(options: {
  db: D1Database;
  courseSlug: string;
  aiCourse?: AIGeneratedCoursePayload;
}) {
  const { db, courseSlug, aiCourse } = options;
  if (!aiCourse?.title?.trim()) {
    return;
  }

  const existing = await db.prepare(
    `SELECT slug FROM tutor_courses WHERE slug = ?`,
  ).bind(courseSlug).first<{ slug: string }>();
  if (existing) {
    return;
  }

  const ownerId = await resolveAICourseOwnerId(db);
  if (!ownerId) {
    throw new Error('Unable to provision AI course owner.');
  }

  const safePrice = roundCurrency(Math.max(0, Number(aiCourse.price || 0)));
  const safeSlug = slugify(courseSlug || aiCourse.title);

  await db.prepare(
    `INSERT INTO tutor_courses (tutor_id, slug, title, description, level, price, duration_label, category, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved')`,
  ).bind(
    ownerId,
    safeSlug,
    aiCourse.title.trim(),
    (aiCourse.description || `AI-generated course for ${aiCourse.title}`).trim(),
    aiCourse.level || 'Foundation',
    safePrice,
    aiCourse.duration_label || '6 weeks',
    'AI Course',
  ).run();
}

function resolvePaymentOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const hostname = requestUrl.hostname.toLowerCase();

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') {
    return (request.headers.get('origin') || requestUrl.origin).replace(/\/$/, '');
  }

  return PRODUCTION_SITE_ORIGIN;
}

async function initializeFlutterwavePayment(options: {
  secret: string;
  origin: string;
  transactionRef: string;
  amount: number;
  courseSlug: string;
  user: { email: string; name: string };
}) {
  const { secret, origin, transactionRef, amount, courseSlug, user } = options;
  const redirectQuery = new URLSearchParams({
    type: 'student_course',
    course: courseSlug,
    tx_ref: transactionRef,
  }).toString();

  const response = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tx_ref: transactionRef,
      amount,
      currency: 'NGN',
      payment_options: FLUTTERWAVE_PREFERRED_PAYMENT_OPTIONS,
      redirect_url: `${origin.replace(/\/$/, '')}/payment-callback?${redirectQuery}`,
      customer: { email: user.email, name: user.name },
      customizations: {
        title: 'Kambi Academy',
        description: `Course enrollment payment for ${courseSlug}`,
      },
      meta: {
        course_slug: courseSlug,
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

async function verifyFlutterwavePayment(secret: string, transactionId: string | undefined, transactionRef: string, expectedAmount: number) {
  const verifyUrl = transactionId
    ? `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`
    : `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(transactionRef)}`;

  const response = await fetch(verifyUrl, {
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
  });

  const payload = await response.json().catch(() => null) as any;
  if (!response.ok) {
    throw new Error(payload?.message || 'Flutterwave verification failed');
  }

  const transaction = Array.isArray(payload?.data) ? payload.data[0] : payload?.data;
  const verifiedAmount = Number(transaction?.amount ?? 0);
  const amountMatches = Math.abs(verifiedAmount - expectedAmount) < 0.01;
  const verified = payload?.status === 'success'
    && isSuccessfulIntent(transaction?.status)
    && transaction?.tx_ref === transactionRef
    && amountMatches;

  return {
    verified,
  };
}

async function getStudentCountry(db: D1Database, userId: number, requestedCountry?: string) {
  if (requestedCountry?.trim()) {
    return requestedCountry.trim();
  }

  try {
    const profile = await db.prepare('SELECT country FROM user_profiles WHERE user_id = ?').bind(userId).first<{ country: string | null }>();
    return profile?.country?.trim() || 'Nigeria';
  } catch {
    return 'Nigeria';
  }
}

async function getRevenueSplit(db: D1Database) {
  const settings = await db.prepare(
    `SELECT key, value
     FROM platform_settings
     WHERE key IN ('tutor_percentage', 'academy_percentage')`,
  ).all<SettingRow>();

  const map = new Map((settings.results || []).map((row) => [row.key, row.value]));
  const teacherPercent = Number.parseFloat(map.get('tutor_percentage') || '70');
  const academyPercent = Number.parseFloat(map.get('academy_percentage') || String(100 - teacherPercent));
  const teacherShare = teacherPercent > 0 ? teacherPercent / 100 : 0.7;
  const academyShare = academyPercent > 0 ? academyPercent / 100 : Math.max(0, 1 - teacherShare);

  return {
    teacherShare,
    academyShare,
  };
}

async function resolveFlutterwaveProcessingFee(secret: string | undefined, amount: number, currency: string) {
  if (!secret || amount <= 0) {
    return {
      processingFee: roundCurrency(amount * FLUTTERWAVE_FEE_FALLBACK_RATE),
      feeSource: 'fallback',
    };
  }

  const feeUrl = new URL('https://api.flutterwave.com/v3/transactions/fee');
  feeUrl.searchParams.set('amount', String(amount));
  feeUrl.searchParams.set('currency', currency);

  try {
    const response = await fetch(feeUrl.toString(), {
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
    });

    const payload = await response.json().catch(() => null) as any;
    if (!response.ok) {
      throw new Error(payload?.message || 'Unable to retrieve Flutterwave fee');
    }

    return {
      processingFee: roundCurrency(Number(payload?.data?.fee ?? 0)),
      feeSource: 'flutterwave',
    };
  } catch {
    return {
      processingFee: roundCurrency(amount * FLUTTERWAVE_FEE_FALLBACK_RATE),
      feeSource: 'fallback',
    };
  }
}

async function calculateStudentCheckoutAmounts(baseAmount: number, locationMarkupPercentage: number, secret?: string) {
  const courseAmount = roundCurrency(baseAmount * (1 + (locationMarkupPercentage / 100)));
  const { processingFee, feeSource } = await resolveFlutterwaveProcessingFee(secret, courseAmount, 'NGN');
  const checkoutAmount = roundCurrency(courseAmount + processingFee);

  return {
    courseAmount,
    processingFee,
    checkoutAmount,
    feeSource,
  };
}

async function finalizeEnrollment(options: {
  db: D1Database;
  userId: number;
  course: CourseRow;
  courseSlug: string;
  studentCountry: string;
  baseAmount: number;
  locationMarkupPercentage: number;
  courseAmount: number;
  processingFee: number;
  checkoutAmount: number;
  feeSource: string;
}) {
  const {
    db,
    userId,
    course,
    courseSlug,
    studentCountry,
    baseAmount,
    locationMarkupPercentage,
    courseAmount,
    processingFee,
    checkoutAmount,
    feeSource,
  } = options;

  const existing = await db.prepare(
    'SELECT id FROM enrollments WHERE user_id = ? AND course_slug = ?',
  )
    .bind(userId, courseSlug)
    .first();

  if (existing) {
    return Response.json({ message: 'Already enrolled.', course_slug: courseSlug });
  }

  await db.prepare(
    'INSERT INTO enrollments (user_id, course_slug, amount_paid) VALUES (?, ?, ?)',
  )
    .bind(userId, courseSlug, checkoutAmount)
    .run();

  if (checkoutAmount <= 0) {
    return Response.json({ message: 'Enrolled successfully.', course_slug: courseSlug, amount_paid: 0 }, { status: 201 });
  }

  const { teacherShare, academyShare } = await getRevenueSplit(db);
  const teacherPayout = roundCurrency(courseAmount * teacherShare);
  const platformFee = roundCurrency(courseAmount * academyShare);
  const availablePayout = roundCurrency(teacherPayout * 0.7);
  const heldPayout = roundCurrency(teacherPayout - availablePayout);

  await db.batch([
    db.prepare(
      `INSERT INTO revenue_transactions
       (student_id, course_id, teacher_id, base_amount, location_markup_percentage, final_amount, platform_fee, teacher_payout, student_country, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      userId,
      course.slug,
      course.tutor_id,
      baseAmount,
      locationMarkupPercentage,
      courseAmount,
      platformFee,
      teacherPayout,
      studentCountry,
      `gateway:${FLUTTERWAVE_PAYMENT_GATEWAY};processing_fee:${processingFee.toFixed(2)};checkout_total:${checkoutAmount.toFixed(2)}`,
    ),
    db.prepare(
      `INSERT INTO course_earnings (teacher_id, course_slug, total_earned, available_balance, held_balance)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(teacher_id, course_slug) DO UPDATE SET
       total_earned = total_earned + excluded.total_earned,
       available_balance = available_balance + excluded.available_balance,
       held_balance = held_balance + excluded.held_balance`,
    ).bind(course.tutor_id, course.slug, teacherPayout, availablePayout, heldPayout),
    db.prepare(
      `INSERT INTO teacher_earnings (teacher_id, total_earned, available_balance)
       VALUES (?, ?, ?)
       ON CONFLICT(teacher_id) DO UPDATE SET
       total_earned = total_earned + excluded.total_earned,
       available_balance = available_balance + excluded.available_balance,
       last_updated = datetime('now')`,
    ).bind(course.tutor_id, teacherPayout, availablePayout),
  ]);

  return Response.json(
    {
      message: 'Enrollment completed successfully.',
      course_slug: courseSlug,
      amount_paid: checkoutAmount,
      course_amount: courseAmount,
      processing_fee: processingFee,
      processing_fee_source: feeSource,
      teacher_payout: teacherPayout,
      platform_fee: platformFee,
      paymentGateway: FLUTTERWAVE_PAYMENT_GATEWAY,
    },
    { status: 201 },
  );
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  if (user.role !== 'student' && user.role !== 'bootcamp_student') {
    return Response.json({ error: 'Only students can enroll in courses.' }, { status: 403 });
  }

  const body = await request.json<{
    action?: EnrollmentAction;
    courseSlug?: string;
    course_slug?: string;
    student_country?: string;
    transactionRef?: string;
    tx_ref?: string;
    flutterwaveTransactionId?: string;
    transaction_id?: string;
    status?: string;
    ai_generated?: boolean;
    ai_course?: AIGeneratedCoursePayload;
  }>();
  const courseSlug = body.courseSlug || body.course_slug;
  const action = body.action || 'direct';

  if (!courseSlug) {
    return Response.json({ error: 'courseSlug is required.' }, { status: 400 });
  }

  if (body.ai_generated && (action === 'initiate' || action === 'verify')) {
    await ensureAIGeneratedCourse({
      db: env.DB,
      courseSlug,
      aiCourse: body.ai_course,
    });
  }

  const course = await env.DB.prepare(
    `SELECT slug, title, price, tutor_id, status
     FROM tutor_courses
     WHERE slug = ?`,
  ).bind(courseSlug).first<CourseRow>();

  if (!course) {
    return Response.json({ error: 'Course not found.' }, { status: 404 });
  }

  if (String(course.status || '').toLowerCase() !== 'approved') {
    return Response.json({ error: 'This course is not available for enrollment yet.' }, { status: 409 });
  }

  const baseAmount = roundCurrency(Number(course.price || 0));
  const studentCountry = await getStudentCountry(env.DB, user.id, body.student_country);
  const locationMarkupPercentage = HIGH_COST_REGIONS.has(studentCountry) ? 10 : 0;
  const studentFlutterwaveSecret = resolveStudentFlutterwaveSecret(env);
  const { courseAmount, processingFee, checkoutAmount, feeSource } = await calculateStudentCheckoutAmounts(
    baseAmount,
    locationMarkupPercentage,
    studentFlutterwaveSecret,
  );

  if (action === 'quote') {
    return Response.json({
      course_slug: courseSlug,
      course_amount: courseAmount,
      processing_fee: processingFee,
      processing_fee_source: feeSource,
      amount_paid: checkoutAmount,
      location_markup_percentage: locationMarkupPercentage,
    });
  }

  if (checkoutAmount <= 0) {
    return finalizeEnrollment({
      db: env.DB,
      userId: user.id,
      course,
      courseSlug,
      studentCountry,
      baseAmount,
      locationMarkupPercentage,
      courseAmount,
      processingFee,
      checkoutAmount,
      feeSource,
    });
  }

  if (action === 'initiate') {
    if (!studentFlutterwaveSecret) {
      return Response.json({ error: 'Flutterwave student gateway is not configured' }, { status: 503 });
    }

    const transactionRef = `student-course-${user.id}-${courseSlug}-${Date.now()}`;
    const origin = resolvePaymentOrigin(request);

    try {
      const payment = await initializeFlutterwavePayment({
        secret: studentFlutterwaveSecret,
        origin,
        transactionRef,
        amount: checkoutAmount,
        courseSlug,
        user,
      });

      return Response.json({
        message: 'Student checkout created. Redirecting to Flutterwave Live...',
        course_slug: courseSlug,
        amount_paid: checkoutAmount,
        course_amount: courseAmount,
        processing_fee: processingFee,
        processing_fee_source: feeSource,
        transactionRef,
        payment_url: payment.paymentUrl,
        paymentGateway: payment.paymentGateway,
        paymentStatus: 'pending',
      }, { status: 201 });
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : 'Failed to initialize payment gateway' }, { status: 503 });
    }
  }

  if (action === 'verify') {
    const transactionRef = body.transactionRef || body.tx_ref;
    const flutterwaveTransactionId = body.flutterwaveTransactionId || body.transaction_id;
    const requestedStatus = isSuccessfulIntent(body.status) ? 'success' : 'failed';

    if (!transactionRef) {
      return Response.json({ error: 'transactionRef is required for verification' }, { status: 400 });
    }

    if (requestedStatus !== 'success') {
      return Response.json({ error: 'Payment was not completed.' }, { status: 400 });
    }

    if (!studentFlutterwaveSecret) {
      return Response.json({ error: 'Flutterwave student gateway is not configured' }, { status: 503 });
    }

    try {
      const verification = await verifyFlutterwavePayment(studentFlutterwaveSecret, flutterwaveTransactionId, transactionRef, checkoutAmount);
      if (!verification.verified) {
        return Response.json({ error: 'Student payment verification failed.' }, { status: 400 });
      }
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : 'Payment verification failed.' }, { status: 400 });
    }

    return finalizeEnrollment({
      db: env.DB,
      userId: user.id,
      course,
      courseSlug,
      studentCountry,
      baseAmount,
      locationMarkupPercentage,
      courseAmount,
      processingFee,
      checkoutAmount,
      feeSource,
    });
  }

  return Response.json({ error: 'Direct enrollment is only available for free courses.' }, { status: 400 });
};
