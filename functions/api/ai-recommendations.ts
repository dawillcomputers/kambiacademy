import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { auth } from '../_shared/auth';
import { getDB } from '../_shared/db';

interface Env {
  DB: D1Database;
}

interface SessionUser {
  id: number;
  role: string;
}

const app = new Hono<{ Bindings: Env; Variables: { user: SessionUser } }>();
app.use('*', cors());

// AI-powered course recommendations for students
app.get('/courses/:studentId', auth, async (c) => {
  try {
    const studentId = c.req.param('studentId');
    const user = c.get('user');

    // Only allow students to get their own recommendations or admins
    if (user.role !== 'admin' && String(user.id) !== studentId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const db = getDB(c);

    // Get student's enrollment history and performance
    const enrollments = await db
      .selectFrom('enrollments')
      .where('studentId', '=', studentId)
      .select(['courseId', 'progress', 'completedAt'])
      .execute();

    // Get student's quiz performance
    const quizResults = await db
      .selectFrom('quiz_responses')
      .innerJoin('quizzes', 'quiz_responses.quizId', 'quizzes.id')
      .where('quiz_responses.studentId', '=', studentId)
      .select(['quizzes.courseId', 'quiz_responses.score', 'quizzes.difficulty'])
      .execute();

    // Get all available courses
    const allCourses = await db
      .selectFrom('courses')
      .select(['id', 'title', 'level', 'category', 'tags'])
      .execute();

    // Simple AI recommendation logic based on:
    // 1. Performance in similar courses
    // 2. Current level progression
    // 3. Category preferences
    const recommendations = generateRecommendations(enrollments, quizResults, allCourses);

    return c.json(recommendations);
  } catch (error) {
    console.error('Error generating course recommendations:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// AI-powered study plan recommendations
app.get('/study-plan/:studentId', auth, async (c) => {
  try {
    const studentId = c.req.param('studentId');
    const user = c.get('user');

    if (user.role !== 'admin' && String(user.id) !== studentId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const db = getDB(c);

    // Get student's current enrollments and progress
    const currentCourses = await db
      .selectFrom('enrollments')
      .innerJoin('courses', 'enrollments.courseId', 'courses.id')
      .where('enrollments.studentId', '=', studentId)
      .where('enrollments.progress', '<', 100)
      .select([
        'courses.id',
        'courses.title',
        'courses.level',
        'enrollments.progress',
        'enrollments.enrolledAt'
      ])
      .execute();

    // Get upcoming assignments and quizzes
    const upcomingWork = await db
      .selectFrom('assignments')
      .innerJoin('enrollments', 'assignments.courseId', 'enrollments.courseId')
      .where('enrollments.studentId', '=', studentId)
      .where('assignments.dueDate', '>', new Date().toISOString())
      .select(['assignments.title', 'assignments.dueDate', 'assignments.courseId'])
      .orderBy('assignments.dueDate', 'asc')
      .limit(5)
      .execute();

    const studyPlan = generateStudyPlan(currentCourses, upcomingWork);

    return c.json(studyPlan);
  } catch (error) {
    console.error('Error generating study plan:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Helper function to generate course recommendations
function generateRecommendations(enrollments: any[], quizResults: any[], allCourses: any[]) {
  // Calculate student's current level and performance
  const completedCourses = enrollments.filter(e => e.completedAt);
  const avgPerformance = quizResults.length > 0
    ? quizResults.reduce((sum, r) => sum + r.score, 0) / quizResults.length
    : 75;

  // Determine next level
  const levelCounts = completedCourses.reduce<Record<string, number>>((acc, course) => {
    acc[course.level] = (acc[course.level] || 0) + 1;
    return acc;
  }, {});

  const currentLevel = levelCounts['Advanced'] > levelCounts['Intermediate']
    ? 'Advanced'
    : levelCounts['Intermediate'] > levelCounts['Foundation']
    ? 'Intermediate'
    : 'Foundation';

  const nextLevel = currentLevel === 'Foundation' ? 'Intermediate' :
                   currentLevel === 'Intermediate' ? 'Advanced' : 'Advanced';

  // Filter courses by next level and performance
  const recommendedCourses = allCourses
    .filter(course => course.level === nextLevel)
    .filter(course => !enrollments.some(e => e.courseId === course.id))
    .map(course => ({
      ...course,
      confidence: Math.min(95, avgPerformance + Math.random() * 10),
      reason: avgPerformance > 80
        ? `Based on your excellent performance in ${currentLevel} courses`
        : `Great foundation - ready to advance to ${nextLevel} level`
    }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  return {
    currentLevel,
    nextLevel,
    averagePerformance: Math.round(avgPerformance),
    recommendations: recommendedCourses
  };
}

// Helper function to generate study plan
function generateStudyPlan(currentCourses: any[], upcomingWork: any[]) {
  const now = new Date();
  const plan = [];

  // Daily study blocks
  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() + i);

    const dayWork = upcomingWork.filter(work => {
      const dueDate = new Date(work.dueDate);
      const daysUntilDue = Math.ceil((dueDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDue <= 7 && daysUntilDue >= 0;
    });

    const dayCourses = currentCourses.filter(course => {
      // Prioritize courses with lower progress or upcoming deadlines
      return true; // Simplified - in real AI, this would be more sophisticated
    });

    plan.push({
      date: date.toISOString().split('T')[0],
      focus: dayCourses.slice(0, 2).map(c => c.title),
      assignments: dayWork.map(w => w.title),
      studyHours: Math.min(4, 2 + dayWork.length),
      priority: dayWork.length > 0 ? 'high' : 'medium'
    });
  }

  return {
    weeklyPlan: plan,
    totalStudyHours: plan.reduce((sum, day) => sum + day.studyHours, 0),
    upcomingDeadlines: upcomingWork.length,
    recommendations: [
      'Focus on high-priority assignments first',
      'Alternate between different subjects to maintain engagement',
      'Take short breaks every 45-50 minutes',
      'Review material before starting new topics'
    ]
  };
}

export default app;

export const onRequest: PagesFunction<Env> = async (context) =>
  app.fetch(context.request, context.env, context as unknown as ExecutionContext);