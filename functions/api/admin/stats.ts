import { getAuthUser } from '../../_shared/auth';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authUser = await getAuthUser(request, env.DB);
  if (!authUser || authUser.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const [usersResult, enrollmentsResult, contactsResult, tutorAppsResult, courseLikesResult, courseViewsResult, recentUsersResult, recentEnrollmentsResult] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
    env.DB.prepare('SELECT COUNT(*) as count, COALESCE(SUM(amount_paid), 0) as revenue FROM enrollments').first<{ count: number; revenue: number }>(),
    env.DB.prepare('SELECT COUNT(*) as count FROM contact_submissions').first<{ count: number }>(),
    env.DB.prepare('SELECT COUNT(*) as count FROM tutor_applications').first<{ count: number }>(),
    env.DB.prepare('SELECT COALESCE(SUM(likes), 0) as total FROM course_stats').first<{ total: number }>(),
    env.DB.prepare('SELECT COALESCE(SUM(views), 0) as total FROM course_stats').first<{ total: number }>(),
    env.DB.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 10').all(),
    env.DB.prepare(`
      SELECT e.course_slug, e.amount_paid, e.created_at, u.name as user_name, u.email as user_email
      FROM enrollments e JOIN users u ON e.user_id = u.id
      ORDER BY e.created_at DESC LIMIT 10
    `).all(),
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
  });
};
