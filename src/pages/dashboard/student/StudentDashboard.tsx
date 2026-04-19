import React, { useCallback, useEffect, useState } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../lib/auth';
import { api } from '../../../../lib/api';
import { Assignment, Course, Material, Quiz, Submission } from '../../../../types';
import DashboardLayout from '../../../../components/layout/DashboardLayout';
import PaymentModal from '../../../../components/PaymentModal';
import AICourses from './ai-courses';
import StudentAssignmentDetail from './assignment-detail';
import StudentAssignments from './assignments';
import StudentChat from './chat';
import StudentCourseDetail from './course-detail';
import StudentCourses from './courses';
import StudentDashboardHome from './index';
import StudentLive from './live';
import StudentMaterials from './materials';
import StudentProfile from './profile';
import StudentQuizzes from './quizzes';
import StudentRequestClass from './request-class';
import StudentSubmissions from './submissions';

const normalizeCourse = (course: Course): Course => ({
  ...course,
  id: course.slug,
  instructor: course.instructor || 'Kambi Academy',
  assignments: course.assignments || [],
  materials: course.materials || [],
  liveClassLinks: course.liveClassLinks || [],
  announcements: course.announcements || [],
});

const normalizeAssignment = (assignment: any): Assignment => ({
  id: String(assignment.id),
  courseId: String(assignment.course_slug || assignment.courseId || ''),
  title: assignment.title || 'Untitled assignment',
  description: assignment.description || '',
  dueDate: assignment.due_date || 'No due date',
  maxScore: Number(assignment.max_score ?? 100),
  type: assignment.type || 'file',
});

const normalizeSubmission = (submission: any): Submission => ({
  id: String(submission.id),
  assignmentId: String(submission.assignment_id ?? submission.assignmentId ?? ''),
  studentId: String(submission.student_id ?? submission.studentId ?? ''),
  grade: submission.score ?? submission.grade ?? null,
  feedback: submission.feedback || '',
  content: submission.content || '',
  submittedAt: submission.submitted_at ?? submission.submittedAt ?? '',
  score: submission.score ?? undefined,
  courseId: submission.course_slug || submission.courseId || '',
  courseSlug: submission.course_slug || submission.courseSlug || '',
  assignmentTitle: submission.assignment_title || submission.assignmentTitle,
  maxScore: submission.max_score ?? undefined,
  fileName: submission.file_name || undefined,
  status: submission.status || undefined,
});

const inferMaterialType = (material: any): Material['type'] => {
  if (material.youtube_url || material.type === 'youtube') {
    return 'link';
  }
  if (typeof material.mime_type === 'string' && material.mime_type.startsWith('video/')) {
    return 'video';
  }
  if (typeof material.mime_type === 'string' && material.mime_type.includes('pdf')) {
    return 'pdf';
  }
  return 'text';
};

const normalizeMaterial = (material: any): Material => ({
  id: String(material.id),
  courseId: String(material.course_slug || material.courseId || ''),
  title: material.title || 'Untitled material',
  description: material.description || '',
  type: inferMaterialType(material),
  url: material.youtube_url || api.getMaterialDownloadUrl(Number(material.id)),
  uploadedAt: material.created_at || material.uploadedAt || '',
  fileName: material.file_name || undefined,
  fileSize: material.file_size ? Number(material.file_size) : undefined,
  mimeType: material.mime_type || undefined,
  youtubeUrl: material.youtube_url || undefined,
});

const normalizeQuiz = (quiz: any): Quiz => ({
  id: String(quiz.id),
  courseId: String(quiz.course_slug || quiz.courseId || ''),
  title: quiz.title || 'Untitled quiz',
  description: quiz.description || '',
  timeLimit: quiz.time_limit_minutes ? Number(quiz.time_limit_minutes) : undefined,
  questions: [],
});

const StudentDashboard: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizResponses, setQuizResponses] = useState<any[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMaterialsEnabled, setShowMaterialsEnabled] = useState(false);

  const loadStudentData = useCallback(async () => {
    const [site, settings, assignmentResult, submissionResult, materialResult, quizResult, quizResponseResult, liveSessionResult, progressResult] = await Promise.allSettled([
      api.getSite(),
      api.getSettings(),
      api.getAssignments(),
      api.getSubmissions(),
      api.getMaterials(),
      api.getQuizzes(),
      api.getQuizResponses(),
      api.getLiveSessions(),
      api.getProgress(),
    ]);

    setCourses(site.status === 'fulfilled' ? (site.value.courses || []).map(normalizeCourse) : []);
    setShowMaterialsEnabled(settings.status === 'fulfilled' ? settings.value.settings.student_materials_enabled === 'true' : false);
    setAssignments(assignmentResult.status === 'fulfilled' ? (assignmentResult.value.assignments || []).map(normalizeAssignment) : []);
    setSubmissions(submissionResult.status === 'fulfilled' ? (submissionResult.value.submissions || []).map(normalizeSubmission) : []);
    setMaterials(materialResult.status === 'fulfilled' ? (materialResult.value.materials || []).map(normalizeMaterial) : []);
    setQuizzes(quizResult.status === 'fulfilled' ? (quizResult.value.quizzes || []).map(normalizeQuiz) : []);
    setQuizResponses(quizResponseResult.status === 'fulfilled' ? (quizResponseResult.value.responses || []) : []);
    setLiveSessions(liveSessionResult.status === 'fulfilled' ? (liveSessionResult.value.sessions || []) : []);

    if (progressResult.status === 'fulfilled') {
      const entries = progressResult.value.progress || [];
      const map: Record<string, number> = {};
      for (const entry of entries) {
        if (entry.course_slug) map[entry.course_slug] = entry.progress_pct ?? 0;
      }
      setProgressMap(map);
    }
  }, []);

  useEffect(() => {
    void loadStudentData();
  }, [loadStudentData]);

  if (!user) {
    return <div>Please log in to access the dashboard.</div>;
  }

  const handleSelectCourse = (course: Course) => {
    const isEnrolled = user.enrolledCourses?.includes(course.slug);
    if (isEnrolled) {
      navigate(`/student/courses/${course.slug}`);
      return;
    }

    if (course.price === 0) {
      void handlePaymentSuccess(course);
      return;
    }

    setSelectedCourse(course);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (course: Course) => {
    if (course.price > 0) {
      try {
        const euCountries = [
          'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Austria',
          'Sweden', 'Denmark', 'Finland', 'Poland', 'Czech Republic', 'Hungary',
          'Portugal', 'Greece', 'Ireland', 'Slovenia', 'Estonia', 'Latvia', 'Lithuania',
          'Slovakia', 'Luxembourg', 'Malta', 'Cyprus', 'Croatia', 'Bulgaria', 'Romania',
        ];
        const isUSOrEU = user.country === 'United States' || euCountries.includes(user.country || '');
        const teacherId = Number.parseInt(course.instructorId, 10);

        if (Number.isFinite(teacherId)) {
          await api.recordRevenue({
            course_id: course.slug,
            teacher_id: teacherId,
            base_amount: course.price,
            location_markup_percentage: isUSOrEU ? 10 : 0,
            student_country: user.country,
          });
        }
      } catch (error) {
        console.error('Failed to record revenue:', error);
      }
    }

    try {
      await api.enroll(course.slug);
      await refreshUser();
      await loadStudentData();
    } catch (error) {
      console.error('Failed to enroll in course:', error);
    }

    setShowPaymentModal(false);
    setSelectedCourse(null);
    navigate(`/student/courses/${course.slug}`);
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
              liveSessions={liveSessions}
              progressMap={progressMap}
            />
          }
        />
        <Route path="profile" element={<StudentProfile user={user} />} />
        <Route path="chat" element={<StudentChat user={user} />} />
        <Route
          path="courses"
          element={<StudentCourses user={user} courses={courses} onSelectCourse={handleSelectCourse} progressMap={progressMap} />}
        />
        <Route
          path="courses/:courseId"
          element={
            <StudentCourseDetail
              user={user}
              courses={courses}
              assignments={assignments}
              materials={materials}
              quizzes={quizzes}
              onSelectCourse={handleSelectCourse}
            />
          }
        />
        <Route
          path="materials"
          element={
            showMaterialsEnabled ? (
              <StudentMaterials user={user} courses={courses} materials={materials} />
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
          element={<StudentAssignments user={user} courses={courses} assignments={assignments} submissions={submissions} />}
        />
        <Route
          path="assignments/:assignmentId"
          element={
            <StudentAssignmentDetail
              user={user}
              courses={courses}
              assignments={assignments}
              submissions={submissions}
              onSubmitted={loadStudentData}
            />
          }
        />
        <Route
          path="submissions"
          element={<StudentSubmissions user={user} submissions={submissions} courses={courses} />}
        />
        <Route
          path="quizzes"
          element={
            <StudentQuizzes
              user={user}
              courses={courses}
              quizzes={quizzes}
              quizResponses={quizResponses}
              onSubmitted={loadStudentData}
            />
          }
        />
        <Route path="live" element={<StudentLive user={user} liveSessions={liveSessions} onSessionClosed={loadStudentData} />} />
        <Route path="request-class" element={<StudentRequestClass user={user} courses={courses} />} />
        <Route path="ai-courses" element={<AICourses onRequestPayment={handleSelectCourse} />} />
      </Routes>
      {showPaymentModal && selectedCourse && (
        <PaymentModal
          course={selectedCourse}
          user={user}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedCourse(null);
          }}
          onConfirm={() => {
            void handlePaymentSuccess(selectedCourse);
          }}
          moneyBackGuaranteeDays={30}
        />
      )}
    </DashboardLayout>
  );
};

export default StudentDashboard;