import React, { useEffect, useState } from 'react';
import { Link, Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../lib/auth';
import { api } from '../../../../lib/api';
import DashboardLayout from '../../../../components/layout/DashboardLayout';
import StudentDashboardHome from './index';
import StudentCourses from './courses';
import StudentMaterials from './materials';
import StudentAssignments from './assignments';
import StudentSubmissions from './submissions';
import StudentLive from './live';
import StudentRequestClass from './request-class';
import AICourses from './ai-courses';
import StudentProfile from './profile';
import StudentChat from './chat';
import StudentCourseDetail from './course-detail';
import StudentAssignmentDetail from './assignment-detail';
import PaymentModal from '../../../../components/PaymentModal';
import { MOCK_COURSES, MOCK_SUBMISSIONS, MOCK_MATERIALS } from '../../../../constants';
import { Course } from '../../../../types';

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMaterialsEnabled, setShowMaterialsEnabled] = useState(false);

  useEffect(() => {
    void api.getSettings()
      .then((data) => {
        setShowMaterialsEnabled(data.settings.student_materials_enabled === 'true');
      })
      .catch(() => {
        setShowMaterialsEnabled(false);
      });
  }, []);

  if (!user) {
    return <div>Please log in to access the dashboard.</div>;
  }

  const handleSelectCourse = (course: Course) => {
    const isEnrolled = user.enrolledCourses?.includes(course.id);
    if (isEnrolled) {
      navigate(`/student/courses/${course.id}`);
    } else {
      setSelectedCourse(course);
      setShowPaymentModal(true);
    }
  };

  const handlePaymentSuccess = (course: Course) => {
    if (user.enrolledCourses) {
      if (!user.enrolledCourses.includes(course.id)) {
        user.enrolledCourses.push(course.id);
      }
    } else {
      user.enrolledCourses = [course.id];
    }

    const courseExists = MOCK_COURSES.some((item) => item.id === course.id);
    navigate(courseExists ? `/student/courses/${course.id}` : '/student/courses');
  };

  return (
    <DashboardLayout user={user} showMaterials={showMaterialsEnabled}>
      <Routes>
        <Route
          path="/"
          element={
            <StudentDashboardHome
              user={user}
              courses={MOCK_COURSES}
              submissions={MOCK_SUBMISSIONS}
            />
          }
        />
        <Route path="/profile" element={<StudentProfile user={user} />} />
        <Route path="/chat" element={<StudentChat user={user} />} />
        <Route
          path="/courses"
          element={
            <StudentCourses
              user={user}
              courses={MOCK_COURSES}
              onSelectCourse={handleSelectCourse}
            />
          }
        />
        <Route
          path="/courses/:courseId"
          element={
            <StudentCourseDetail
              user={user}
              courses={MOCK_COURSES}
              onSelectCourse={handleSelectCourse}
            />
          }
        />
        <Route
          path="/materials"
          element={
            showMaterialsEnabled ? (
              <StudentMaterials
                user={user}
                courses={MOCK_COURSES}
                materials={MOCK_MATERIALS}
              />
            ) : (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center">
                <h2 className="text-2xl font-semibold mb-3">Materials are not available yet</h2>
                <p className="text-gray-600 mb-6">
                  This feature is disabled by default. A super admin can enable the student materials page in the admin settings.
                </p>
                <Link to="/student" className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">
                  Back to dashboard
                </Link>
              </div>
            )
          }
        />
        <Route
          path="/assignments"
          element={
            <StudentAssignments
              user={user}
              courses={MOCK_COURSES}
              submissions={MOCK_SUBMISSIONS}
            />
          }
        />
        <Route
          path="/assignments/:assignmentId"
          element={
            <StudentAssignmentDetail
              user={user}
              courses={MOCK_COURSES}
              submissions={MOCK_SUBMISSIONS}
            />
          }
        />
        <Route
          path="/submissions"
          element={
            <StudentSubmissions
              user={user}
              submissions={MOCK_SUBMISSIONS}
              courses={MOCK_COURSES}
            />
          }
        />
        <Route
          path="/live"
          element={<StudentLive user={user} />}
        />
        <Route
          path="/request-class"
          element={
            <StudentRequestClass
              user={user}
              courses={MOCK_COURSES}
            />
          }
        />
        <Route
          path="/ai-courses"
          element={<AICourses onRequestPayment={handleSelectCourse} />}
        />
      </Routes>
      {showPaymentModal && selectedCourse && (
        <PaymentModal
          course={selectedCourse}
          onClose={() => setShowPaymentModal(false)}
          onConfirm={() => {
            handlePaymentSuccess(selectedCourse);
            setShowPaymentModal(false);
            setSelectedCourse(null);
          }}
          moneyBackGuaranteeDays={30}
        />
      )}
    </DashboardLayout>
  );
};

export default StudentDashboard;