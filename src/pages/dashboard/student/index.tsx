import React from 'react';
import { Link } from 'react-router-dom';
import { AuthUser } from '../../../../lib/auth';
import { Course, Submission } from '../../../../types';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';

interface StudentDashboardHomeProps {
  user: AuthUser;
  courses: Course[];
  submissions: Submission[];
  liveSessions?: any[];
}

const StudentDashboardHome: React.FC<StudentDashboardHomeProps> = ({ user, courses, submissions, liveSessions = [] }) => {
  const enrolledCourses = courses.filter(c => user.enrolledCourses?.includes(c.id));
  const completedCourses = enrolledCourses.filter(c => {
    const courseSubmissions = submissions.filter((submission) => submission.courseId === c.id && submission.grade !== null && submission.grade !== undefined);
    return courseSubmissions.length > 0;
  });

  const continueLearning = enrolledCourses.slice(0, 3);
  const upcomingSessions = liveSessions.slice(0, 2);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 rounded-xl">
        <h1 className="text-3xl font-bold mb-2">Hi {user.name}! Ready to learn?</h1>
        <p className="text-blue-100">Let's continue your learning adventure today.</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">{enrolledCourses.length}</div>
          <div className="text-gray-600">My Courses</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">{completedCourses.length}</div>
          <div className="text-gray-600">Finished</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-orange-600 mb-2">{enrolledCourses.length - completedCourses.length}</div>
          <div className="text-gray-600">Still Learning</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-purple-600 mb-2">{completedCourses.length}</div>
          <div className="text-gray-600">My Awards</div>
        </Card>
      </div>

      {/* Continue Learning */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Keep Learning</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {continueLearning.map(course => (
            <Card key={course.id} className="p-6">
              <img
                src={course.imageUrl || 'https://via.placeholder.com/300x200'}
                alt={course.title}
                className="w-full h-32 object-cover rounded-lg mb-4"
              />
              <h3 className="font-bold text-lg mb-2 text-slate-900">{course.title}</h3>
              <p className="text-slate-900 text-sm mb-4">{course.summary}</p>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>How far I've gone</span>
                  <span>60%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                </div>
              </div>

              <Link to={`/student/courses`}>
                <Button className="w-full">Keep Going</Button>
              </Link>
            </Card>
          ))}
        </div>
      </div>

      {/* AI Recommendations */}
      <div>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          🤖 Courses You Might Like
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.slice(0, 3).map(course => (
            <Card key={course.id} className="p-6">
              <img
                src={course.imageUrl || 'https://via.placeholder.com/300x200'}
                alt={course.title}
                className="w-full h-32 object-cover rounded-lg mb-4"
              />
              <h3 className="font-bold text-lg mb-2 text-slate-900">{course.title}</h3>
              <p className="text-slate-900 text-sm mb-4">{course.summary}</p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">{course.level}</span>
                <Link to={`/student/courses`}>
                  <Button size="small">View Course</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Upcoming Live Classes */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4 text-slate-900">Live Classes Coming Up</h2>
        <div className="space-y-3">
          {upcomingSessions.length ? upcomingSessions.map((session: any) => (
            <div key={session.id} className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
              <div>
                <h3 className="font-semibold text-slate-900">{session.title || session.class_title || 'Live Session'}</h3>
                <p className="text-sm text-slate-700">{session.class_title || 'Teacher live classroom session'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">{new Date(session.started_at || Date.now()).toLocaleString()}</p>
                <Link to="/student/live">
                  <Button size="small" variant="secondary">Go to Live Classes</Button>
                </Link>
              </div>
            </div>
          )) : (
            <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
              <div>
                <h3 className="font-semibold text-slate-900">No live session is active yet</h3>
                <p className="text-sm text-slate-700">Join a teacher class or check back when a live session starts.</p>
              </div>
              <div className="text-right">
                <Link to="/student/live">
                  <Button size="small" variant="secondary">Open Live Classes</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default StudentDashboardHome;