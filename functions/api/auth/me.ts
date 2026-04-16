import { getAuthUser } from '../../_shared/auth';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getAuthUser(request, env.DB);
  if (!user) {
    return Response.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  // Get enrolled courses for students
  let enrolledCourses: string[] = [];
  if (user.role === 'student') {
    try {
      const enrollments = await env.DB.prepare(
        'SELECT course_id FROM enrollments WHERE user_id = ? AND status = ?'
      ).bind(user.id, 'active').all();
      enrolledCourses = enrollments.results.map((row: any) => row.course_id);
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
    }
  }

  return Response.json({
    user: {
      id: user.id, name: user.name, email: user.email, role: user.role,
      status: user.status, mustChangePassword: !!user.must_change_password,
      enrolledCourses: enrolledCourses,
    },
  });
};
