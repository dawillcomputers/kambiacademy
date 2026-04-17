import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { auth } from '../_shared/auth';
import { getDB } from '../_shared/db';

const app = new Hono();
app.use('*', cors());

// Get comprehensive progress dashboard for a student
app.get('/student/:studentId', auth, async (c) => {
  try {
    const studentId = c.req.param('studentId');
    const user = c.get('user');

    if (user.role !== 'admin' && user.id !== studentId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const db = getDB(c);

    // Get enrollment progress
    const enrollments = await db
      .selectFrom('enrollments')
      .innerJoin('courses', 'enrollments.courseId', 'courses.id')
      .where('enrollments.studentId', '=', studentId)
      .select([
        'courses.id',
        'courses.title',
        'courses.level',
        'courses.category',
        'enrollments.progress',
        'enrollments.enrolledAt',
        'enrollments.completedAt'
      ])
      .execute();

    // Get quiz performance
    const quizStats = await db
      .selectFrom('quiz_responses')
      .innerJoin('quizzes', 'quiz_responses.quizId', 'quizzes.id')
      .where('quiz_responses.studentId', '=', studentId)
      .select([
        'quizzes.courseId',
        'quiz_responses.score',
        'quiz_responses.completedAt',
        'quizzes.difficulty'
      ])
      .execute();

    // Get assignment submissions
    const assignments = await db
      .selectFrom('submissions')
      .innerJoin('assignments', 'submissions.assignmentId', 'assignments.id')
      .where('submissions.studentId', '=', studentId)
      .select([
        'assignments.title',
        'assignments.courseId',
        'assignments.dueDate',
        'submissions.grade',
        'submissions.submittedAt'
      ])
      .execute();

    // Calculate progress metrics
    const progressData = calculateProgressMetrics(enrollments, quizStats, assignments);

    return c.json(progressData);
  } catch (error) {
    console.error('Error fetching progress dashboard:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get leaderboard data
app.get('/leaderboard/:courseId?', auth, async (c) => {
  try {
    const courseId = c.req.param('courseId');
    const db = getDB(c);

    let query = db
      .selectFrom('enrollments')
      .innerJoin('users', 'enrollments.studentId', 'users.id')
      .leftJoin('courses', 'enrollments.courseId', 'courses.id')
      .select([
        'users.id',
        'users.name',
        'courses.title as courseTitle',
        'enrollments.progress',
        'enrollments.enrolledAt',
        'enrollments.completedAt'
      ]);

    if (courseId) {
      query = query.where('enrollments.courseId', '=', courseId);
    }

    const leaderboardData = await query
      .orderBy('enrollments.progress', 'desc')
      .orderBy('enrollments.completedAt', 'asc')
      .limit(50)
      .execute();

    // Calculate rankings and additional metrics
    const leaderboard = leaderboardData.map((entry, index) => ({
      rank: index + 1,
      studentId: entry.id,
      studentName: entry.name,
      courseTitle: entry.courseTitle,
      progress: entry.progress,
      enrolledAt: entry.enrolledAt,
      completedAt: entry.completedAt,
      isCompleted: !!entry.completedAt,
      daysToComplete: entry.completedAt
        ? Math.ceil((new Date(entry.completedAt) - new Date(entry.enrolledAt)) / (1000 * 60 * 60 * 24))
        : null
    }));

    return c.json({
      leaderboard,
      totalParticipants: leaderboard.length,
      courseSpecific: !!courseId
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Helper function to calculate progress metrics
function calculateProgressMetrics(enrollments: any[], quizStats: any[], assignments: any[]) {
  const totalCourses = enrollments.length;
  const completedCourses = enrollments.filter(e => e.completedAt).length;
  const inProgressCourses = enrollments.filter(e => !e.completedAt && e.progress > 0).length;
  const notStartedCourses = enrollments.filter(e => e.progress === 0).length;

  const averageProgress = totalCourses > 0
    ? enrollments.reduce((sum, e) => sum + e.progress, 0) / totalCourses
    : 0;

  // Quiz performance analysis
  const quizPerformance = quizStats.length > 0 ? {
    averageScore: Math.round(quizStats.reduce((sum, q) => sum + q.score, 0) / quizStats.length),
    totalQuizzes: quizStats.length,
    passedQuizzes: quizStats.filter(q => q.score >= 70).length,
    highPerformers: quizStats.filter(q => q.score >= 90).length
  } : null;

  // Assignment analysis
  const assignmentStats = assignments.length > 0 ? {
    totalAssignments: assignments.length,
    gradedAssignments: assignments.filter(a => a.grade !== null).length,
    averageGrade: assignments.filter(a => a.grade !== null).length > 0
      ? Math.round(assignments.filter(a => a.grade !== null).reduce((sum, a) => sum + a.grade, 0) /
          assignments.filter(a => a.grade !== null).length)
      : null,
    onTimeSubmissions: assignments.filter(a => {
      const submitted = new Date(a.submittedAt);
      const due = new Date(a.dueDate);
      return submitted <= due;
    }).length
  } : null;

  // Learning streaks and patterns
  const learningPatterns = analyzeLearningPatterns(enrollments, quizStats);

  return {
    overview: {
      totalCourses,
      completedCourses,
      inProgressCourses,
      notStartedCourses,
      averageProgress: Math.round(averageProgress),
      completionRate: totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0
    },
    performance: {
      quizPerformance,
      assignmentStats
    },
    learningPatterns,
    recentActivity: getRecentActivity(enrollments, quizStats, assignments),
    achievements: generateAchievements(completedCourses, quizPerformance, assignmentStats)
  };
}

// Helper function to analyze learning patterns
function analyzeLearningPatterns(enrollments: any[], quizStats: any[]) {
  // Calculate study streaks, preferred study times, etc.
  const completedEnrollments = enrollments.filter(e => e.completedAt);

  if (completedEnrollments.length === 0) {
    return {
      studyStreak: 0,
      preferredCategories: [],
      averageCompletionTime: null,
      consistency: 'unknown'
    };
  }

  // Calculate average completion time
  const avgCompletionDays = completedEnrollments.reduce((sum, e) => {
    const days = Math.ceil((new Date(e.completedAt) - new Date(e.enrolledAt)) / (1000 * 60 * 60 * 24));
    return sum + days;
  }, 0) / completedEnrollments.length;

  // Analyze category preferences
  const categoryCount = completedEnrollments.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + 1;
    return acc;
  }, {});

  const preferredCategories = Object.entries(categoryCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([category]) => category);

  return {
    studyStreak: calculateStudyStreak(enrollments),
    preferredCategories,
    averageCompletionTime: Math.round(avgCompletionDays),
    consistency: avgCompletionDays <= 30 ? 'high' : avgCompletionDays <= 60 ? 'medium' : 'low'
  };
}

// Helper function to calculate study streak
function calculateStudyStreak(enrollments: any[]) {
  // Simplified streak calculation - in a real system, this would track daily activity
  const recentActivity = enrollments
    .filter(e => e.progress > 0)
    .sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime());

  if (recentActivity.length === 0) return 0;

  // Assume streak based on recent enrollment activity
  const daysSinceLastActivity = Math.floor(
    (Date.now() - new Date(recentActivity[0].enrolledAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceLastActivity <= 7 ? Math.min(7, recentActivity.length) : 0;
}

// Helper function to get recent activity
function getRecentActivity(enrollments: any[], quizStats: any[], assignments: any[]) {
  const activities = [];

  // Add recent enrollments
  enrollments
    .filter(e => e.progress > 0)
    .sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime())
    .slice(0, 3)
    .forEach(e => {
      activities.push({
        type: 'enrollment',
        title: `Enrolled in ${e.title}`,
        date: e.enrolledAt,
        progress: e.progress
      });
    });

  // Add recent quiz completions
  quizStats
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 3)
    .forEach(q => {
      activities.push({
        type: 'quiz',
        title: `Completed quiz with ${q.score}% score`,
        date: q.completedAt,
        score: q.score
      });
    });

  return activities
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);
}

// Helper function to generate achievements
function generateAchievements(completedCourses: number, quizPerformance: any, assignmentStats: any) {
  const achievements = [];

  if (completedCourses >= 1) {
    achievements.push({
      id: 'first_course',
      title: 'First Steps',
      description: 'Completed your first course',
      icon: '🎓',
      unlocked: true
    });
  }

  if (completedCourses >= 5) {
    achievements.push({
      id: 'course_master',
      title: 'Course Master',
      description: 'Completed 5 courses',
      icon: '🏆',
      unlocked: true
    });
  }

  if (quizPerformance && quizPerformance.averageScore >= 90) {
    achievements.push({
      id: 'quiz_expert',
      title: 'Quiz Expert',
      description: 'Achieved 90%+ average on quizzes',
      icon: '🧠',
      unlocked: true
    });
  }

  if (assignmentStats && assignmentStats.averageGrade >= 90) {
    achievements.push({
      id: 'assignment_star',
      title: 'Assignment Star',
      description: 'Achieved 90%+ average on assignments',
      icon: '⭐',
      unlocked: true
    });
  }

  return achievements;
}

export default app;

export const onRequest: PagesFunction = app.fetch;