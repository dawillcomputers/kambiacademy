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
}

const StudentDashboardHome: React.FC<StudentDashboardHomeProps> = ({ user, courses, submissions }) => {
  const enrolledCourses = courses.filter(c => user.enrolledCourses?.includes(c.id));
  const completedCourses = enrolledCourses.filter(c => {
    const courseSubmissions = submissions.filter(s => enrolledCourses.some(ec => ec.id === c.id));
    return courseSubmissions.length > 0 && courseSubmissions.every(s => s.grade);
  });

  const continueLearning = enrolledCourses.slice(0, 3); // Mock data for now

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
          <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
            <div>
              <h3 className="font-semibold text-slate-900">React Masterclass</h3>
              <p className="text-sm text-slate-700">Advanced React patterns that help you build faster.</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">Tomorrow 10:00 AM</p>
              <Link to="/student/live">
                <Button size="small" variant="secondary">Go to Live Classes</Button>
              </Link>
            </div>
          </div>
          <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
            <div>
              <h3 className="font-semibold text-slate-900">JavaScript Basics</h3>
              <p className="text-sm text-slate-700">Core JavaScript ideas made easy to follow.</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">Friday 2:00 PM</p>
              <Link to="/student/live">
                <Button size="small" variant="secondary">Go to Live Classes</Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StudentDashboardHome;