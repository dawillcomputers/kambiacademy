import { getAuthUser } from '../_shared/auth';

interface Env {
  DB: D1Database;
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

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  if (user.role !== 'student') {
    return Response.json({ error: 'Only students can enroll in courses.' }, { status: 403 });
  }

  const body = await request.json<{ courseSlug?: string; course_slug?: string; student_country?: string }>();
  const courseSlug = body.courseSlug || body.course_slug;

  if (!courseSlug) {
    return Response.json({ error: 'courseSlug is required.' }, { status: 400 });
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

  const existing = await env.DB.prepare(
    'SELECT id FROM enrollments WHERE user_id = ? AND course_slug = ?',
  )
    .bind(user.id, courseSlug)
    .first();

  if (existing) {
    return Response.json({ message: 'Already enrolled.', course_slug: courseSlug });
  }

  const baseAmount = roundCurrency(Number(course.price || 0));
  const studentCountry = await getStudentCountry(env.DB, user.id, body.student_country);
  const locationMarkupPercentage = HIGH_COST_REGIONS.has(studentCountry) ? 10 : 0;
  const finalAmount = roundCurrency(baseAmount * (1 + (locationMarkupPercentage / 100)));

  await env.DB.prepare(
    'INSERT INTO enrollments (user_id, course_slug, amount_paid) VALUES (?, ?, ?)',
  )
    .bind(user.id, courseSlug, finalAmount)
    .run();

  if (finalAmount > 0) {
    const { teacherShare, academyShare } = await getRevenueSplit(env.DB);
    const teacherPayout = roundCurrency(finalAmount * teacherShare);
    const platformFee = roundCurrency(finalAmount * academyShare);
    const availablePayout = roundCurrency(teacherPayout * 0.7);
    const heldPayout = roundCurrency(teacherPayout - availablePayout);

    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO revenue_transactions
         (student_id, course_id, teacher_id, base_amount, location_markup_percentage, final_amount, platform_fee, teacher_payout, student_country)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        user.id,
        course.slug,
        course.tutor_id,
        baseAmount,
        locationMarkupPercentage,
        finalAmount,
        platformFee,
        teacherPayout,
        studentCountry,
      ),
      env.DB.prepare(
        `INSERT INTO course_earnings (teacher_id, course_slug, total_earned, available_balance, held_balance)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(teacher_id, course_slug) DO UPDATE SET
         total_earned = total_earned + excluded.total_earned,
         available_balance = available_balance + excluded.available_balance,
         held_balance = held_balance + excluded.held_balance`,
      ).bind(course.tutor_id, course.slug, teacherPayout, availablePayout, heldPayout),
      env.DB.prepare(
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
        amount_paid: finalAmount,
        teacher_payout: teacherPayout,
        platform_fee: platformFee,
      },
      { status: 201 },
    );
  }

  return Response.json({ message: 'Enrolled successfully.', course_slug: courseSlug, amount_paid: 0 }, { status: 201 });
};
