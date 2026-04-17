import { getAuthUser } from '../../_shared/auth';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const user = await getAuthUser(request, env.DB);
    if (!user) {
      return Response.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    let enrolledCourses: string[] = [];
    if (user.role === 'student') {
      const enrollments = await env.DB.prepare(
        'SELECT course_id FROM enrollments WHERE user_id = ? AND status = ?'
      ).bind(user.id, 'active').all();
      enrolledCourses = enrollments.results.map((row: any) => row.course_id);
    }

    return Response.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        mustChangePassword: !!user.must_change_password,
        enrolledCourses,
      },
    });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return Response.json(
      {
        error: 'Internal server error',
        message: 'Unable to verify authentication at this time.',
      },
      { status: 500 },
    );
  }
};
