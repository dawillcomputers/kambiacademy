import React, { useEffect, useState } from 'react';
import { Link, Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../lib/auth';
import { api } from '../../../../lib/api';
import { Course, Submission, Material } from '../../../../types';
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

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
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

    void (async () => {
      try {
        const site = await api.getSite();
        setCourses(site.courses || []);
      } catch {
        setCourses([]);
      }

      try {
        const submissionResult = await api.getSubmissions();
        setSubmissions(submissionResult.submissions || []);
      } catch {
        setSubmissions([]);
      }

      try {
        const materialsResult = await api.getMaterials();
        setMaterials(materialsResult.materials || []);
      } catch {
        setMaterials([]);
      }
    })();
  }, []);

  if (!user) {
    return <div>Please log in to access the dashboard.</div>;
  }

  const handleSelectCourse = (course: Course) => {
    const isEnrolled = user.enrolledCourses?.includes(course.id);
    if (isEnrolled) {
      navigate(`/student/courses/${course.id}`);
      return;
    }

    if (course.price === 0) {
      handlePaymentSuccess(course);
      return;
    }

    setSelectedCourse(course);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (course: Course) => {
    // Record revenue transaction if course has a price
    if (course.price > 0) {
      try {
        // Determine location markup (10% for US and EU countries)
        const euCountries = [
          'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Austria',
          'Sweden', 'Denmark', 'Finland', 'Poland', 'Czech Republic', 'Hungary',
          'Portugal', 'Greece', 'Ireland', 'Slovenia', 'Estonia', 'Latvia', 'Lithuania',
          'Slovakia', 'Luxembourg', 'Malta', 'Cyprus', 'Croatia', 'Bulgaria', 'Romania'
        ];
        const isUSOrEU = user.country === 'United States' || euCountries.includes(user.country || '');
        const locationMarkup = isUSOrEU ? 10 : 0;

        await api.recordRevenue({
          course_id: course.id,
          teacher_id: parseInt(course.instructorId),
          base_amount: course.price,
          location_markup_percentage: locationMarkup,
          student_country: user.country
        });
      } catch (error) {
        console.error('Failed to record revenue:', error);
        // Continue with enrollment even if revenue recording fails
      }
    }

    setCourses((currentCourses) => {
      if (currentCourses.some((item) => item.id === course.id)) {
        return currentCourses;
      }
      return [...currentCourses, course];
    });

    if (user.enrolledCourses) {
      if (!user.enrolledCourses.includes(course.id)) {
        user.enrolledCourses.push(course.id);
      }
    } else {
      user.enrolledCourses = [course.id];
    }

    navigate(`/student/courses/${course.id}`);
  };

  return (
    <DashboardLayout user={user} showMaterials={showMaterialsEnabled}>
      <Routes>
        <Route
          index
          element={
            <StudentDashboardHome
              user={user}
              courses={courses}
              submissions={submissions}
            />
          }
        />
        <Route path="profile" element={<StudentProfile user={user} />} />
        <Route path="chat" element={<StudentChat user={user} />} />
        <Route
          path="courses"
          element={
            <StudentCourses
              user={user}
              courses={courses}
              onSelectCourse={handleSelectCourse}
            />
          }
        />
        <Route
          path="courses/:courseId"
          element={
            <StudentCourseDetail
              user={user}
              courses={courses}
              onSelectCourse={handleSelectCourse}
            />
          }
        />
        <Route
          path="materials"
          element={
            showMaterialsEnabled ? (
              <StudentMaterials
                user={user}
                courses={courses}
                materials={materials}
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
          path="assignments"
          element={
            <StudentAssignments
              user={user}
              courses={courses}
              submissions={submissions}
            />
          }
        />
        <Route
          path="assignments/:assignmentId"
          element={
            <StudentAssignmentDetail
              user={user}
              courses={courses}
              submissions={submissions}
            />
          }
        />
        <Route
          path="submissions"
          element={
            <StudentSubmissions
              user={user}
              submissions={submissions}
              courses={courses}
            />
          }
        />
        <Route
          path="live"
          element={<StudentLive user={user} />}
        />
        <Route
          path="request-class"
          element={
            <StudentRequestClass
              user={user}
              courses={courses}
            />
          }
        />
        <Route
          path="ai-courses"
          element={<AICourses onRequestPayment={handleSelectCourse} />}
        />
      </Routes>
      {showPaymentModal && selectedCourse && (
        <PaymentModal
          course={selectedCourse}
          user={user}
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