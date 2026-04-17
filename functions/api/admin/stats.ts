import { getAuthUser, requireSubscription, checkSubscription, isFullAdmin } from '../../_shared/auth';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authUser = await getAuthUser(request, env.DB);
  if (!authUser || !isFullAdmin(authUser)) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Super admin and SOU bypass subscription check
  if (authUser.role !== 'super_admin' && authUser.role !== 'SOU') {
    const hasSubscription = await checkSubscription(authUser, env.DB);
    if (!hasSubscription) {
      const accountAge = Date.now() - new Date(authUser.created_at).getTime();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (accountAge > sevenDays) {
        return Response.json({ error: 'Subscription required.', requiresPayment: true }, { status: 402 });
      }
    }

    const subscriptionError = await requireSubscription(request, env.DB);
    if (subscriptionError) {
      return subscriptionError;
    }
  }

  // Helper function to safely query tables that might not exist
  const safeQuery = async (query: string, params: any[] = []) => {
    try {
      const result = await env.DB.prepare(query).bind(...params);
      return await result.first() || { count: 0, total: 0, revenue: 0 };
    } catch (error) {
      // Table might not exist, return default values
      return { count: 0, total: 0, revenue: 0 };
    }
  };

  const safeAll = async (query: string, params: any[] = []) => {
    try {
      const result = await env.DB.prepare(query).bind(...params);
      return await result.all() || { results: [] };
    } catch (error) {
      // Table might not exist, return empty results
      return { results: [] };
    }
  };

  const [usersResult, enrollmentsResult, contactsResult, tutorAppsResult, courseLikesResult, courseViewsResult, recentUsersResult, recentEnrollmentsResult, topCoursesResult, topTeachersResult] = await Promise.all([
    safeQuery('SELECT COUNT(*) as count FROM users'),
    safeQuery('SELECT COUNT(*) as count, COALESCE(SUM(amount_paid), 0) as revenue FROM enrollments'),
    safeQuery('SELECT COUNT(*) as count FROM contact_submissions'),
    safeQuery('SELECT COUNT(*) as count FROM tutor_applications'),
    safeQuery('SELECT COALESCE(SUM(likes), 0) as total FROM course_stats'),
    safeQuery('SELECT COALESCE(SUM(views), 0) as total FROM course_stats'),
    safeAll('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 10'),
    safeAll(`
      SELECT e.course_slug, e.amount_paid, e.created_at, u.name as user_name, u.email as user_email
      FROM enrollments e JOIN users u ON e.user_id = u.id
      ORDER BY e.created_at DESC LIMIT 10
    `),
    safeAll(`
      SELECT e.course_slug, COUNT(*) as enrollment_count, COALESCE(SUM(e.amount_paid), 0) as total_revenue
      FROM enrollments e
      GROUP BY e.course_slug
      ORDER BY total_revenue DESC
      LIMIT 10
    `),
    safeAll(`
      SELECT u.id, u.name, u.email,
        COUNT(DISTINCT e.id) as enrollment_count,
        COALESCE(SUM(e.amount_paid), 0) as total_revenue,
        COUNT(DISTINCT tc.id) as course_count
      FROM users u
      LEFT JOIN tutor_courses tc ON tc.tutor_id = u.id AND tc.status = 'approved'
      LEFT JOIN enrollments e ON e.course_slug = tc.slug
      WHERE u.role = 'teacher'
      GROUP BY u.id
      ORDER BY total_revenue DESC
      LIMIT 10
    `),
  ]);

  return Response.json({
    totalUsers: usersResult?.count ?? 0,
    totalEnrollments: enrollmentsResult?.count ?? 0,
    totalRevenue: enrollmentsResult?.revenue ?? 0,
    totalContacts: contactsResult?.count ?? 0,
    totalTutorApps: tutorAppsResult?.count ?? 0,
    totalLikes: courseLikesResult?.total ?? 0,
    totalViews: courseViewsResult?.total ?? 0,
    recentUsers: recentUsersResult?.results ?? [],
    recentEnrollments: recentEnrollmentsResult?.results ?? [],
    topCourses: topCoursesResult?.results ?? [],
    topTeachers: topTeachersResult?.results ?? [],
  });
};
