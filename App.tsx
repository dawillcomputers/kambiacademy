
import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import About from './components/About';
import BecomeTutor from './components/BecomeTutor';
import Contact from './components/Contact';
import CourseDetail from './components/CourseDetail';
import CourseList from './components/CourseList';
import Faq from './components/Faq';
import Footer from './components/Footer';
import Header from './components/Header';
import Home from './components/Home';
import Login from './components/Login';
import PaymentCallback from './components/PaymentCallback';
import SignUp from './components/SignUp';
import ChangePassword from './components/ChangePassword';
import JoinClass from './components/JoinClass';
// Lazy-loaded dashboard chunks
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const SuperAdminRoutes = lazy(() => import('./src/pages/dashboard/superadmin'));
const StudentDashboard = lazy(() => import('./src/pages/dashboard/student/StudentDashboard'));
const TeacherDashboard = lazy(() => import('./src/pages/dashboard/teacher/index'));
const TeacherCourses = lazy(() => import('./src/pages/dashboard/teacher/courses'));
const TeacherMaterials = lazy(() => import('./src/pages/dashboard/teacher/materials'));
const TeacherAssignments = lazy(() => import('./src/pages/dashboard/teacher/assignments'));
const TeacherQuizzes = lazy(() => import('./src/pages/dashboard/teacher/quizzes'));
const TeacherClasses = lazy(() => import('./src/pages/dashboard/teacher/classes'));
const TeacherLive = lazy(() => import('./src/pages/dashboard/teacher/live'));
const TeacherBilling = lazy(() => import('./src/pages/dashboard/teacher/billing'));
const TeacherAI = lazy(() => import('./src/pages/dashboard/teacher/ai'));
const TeacherStudents = lazy(() => import('./src/pages/dashboard/teacher/students'));
const TeacherSettings = lazy(() => import('./src/pages/dashboard/teacher/settings'));
import { api } from './lib/api';
import { AuthProvider, useAuth } from './lib/auth';
import { BrandingContent, SiteData } from './types';

const isTeacherRole = (role?: string) => role === 'teacher' || role === 'tutor';
const isSuperAdminConsoleRole = (role?: string) => role === 'super_admin' || role === 'SOU';

const fallbackBranding: BrandingContent = {
  name: 'Kambi Academy',
  strapline: 'Live digital skills programs with expert mentorship and interactive learning.',
  primaryCta: { label: 'Explore courses', href: '/courses' },
  secondaryCta: { label: 'Request information', href: '/contact' },
};

const ScrollToTop: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  return null;
};

const LoadingState: React.FC = () => (
  <section className="section-shell surface-ring rounded-[32px] border border-white/60 px-6 py-20 text-center sm:px-10">
    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
    <p className="mt-6 text-lg font-semibold text-slate-900">Loading live academy content...</p>
    <p className="mt-2 text-sm text-slate-500">Fetching production data from our secure API.</p>
  </section>
);

const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <section className="section-shell surface-ring rounded-[32px] border border-rose-100 bg-white/90 px-6 py-16 text-center sm:px-10">
    <p className="text-sm font-semibold uppercase tracking-[0.28em] text-rose-500">Backend unavailable</p>
    <h1 className="mt-4 font-display text-3xl font-bold text-slate-950">The site API is not responding yet.</h1>
    <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600">
      {message || 'Please check your internet connection and try again. If the problem persists, contact our support team.'}
    </p>
    <button
      onClick={onRetry}
      className="mt-8 inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
    >
      Retry request
    </button>
  </section>
);

const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingState />;
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;

  return children;
};

const RequireAdmin: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingState />;
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;

  return children;
};

const RequireSuperAdmin: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingState />;
  if (!user || !isSuperAdminConsoleRole(user.role)) return <Navigate to="/" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;

  return children;
};

const RequireTutor: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingState />;
  if (!user || !isTeacherRole(user.role)) return <Navigate to="/" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;

  return children;
};

const RequireChangePassword: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingState />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.mustChangePassword) {
    // User doesn't need to change password, redirect to appropriate dashboard
    if (isSuperAdminConsoleRole(user.role)) return <Navigate to="/superadmin" replace />;
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (isTeacherRole(user.role)) return <Navigate to="/teacher" replace />;
    return <Navigate to="/student" replace />;
  }

  return children;
};

const CourseDetailRoute: React.FC<{ siteData: SiteData }> = ({ siteData }) => {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) {
    return <Navigate to="/courses" replace />;
  }

  const course = siteData.courses.find((item) => item.slug === slug);

  if (!course) {
    return <Navigate to="/courses" replace />;
  }

  const instructor = siteData.instructors.find((item) => item.id === course.instructorId) ?? null;
  const relatedCourses = siteData.courses.filter((item) => item.slug !== course.slug).slice(0, 2);
  const sessions = siteData.sessions.filter((item) => item.courseSlug === course.slug);

  return (
    <CourseDetail
      course={course}
      instructor={instructor}
      relatedCourses={relatedCourses}
      sessions={sessions}
    />
  );
};

const defaultSiteData: SiteData = {
  branding: fallbackBranding,
  hero: {
    eyebrow: 'Kambi Academy',
    headline: 'Live digital skills programs for every learner.',
    description: 'Explore live courses, mentorship-led workshops, and hands-on project learning with industry experts.',
    highlights: ['Live mentoring', 'Practical project work', 'Team learning that works'],
    primaryCta: { label: 'Explore courses', href: '/courses' },
    secondaryCta: { label: 'Contact admissions', href: '/contact' },
  },
  stats: [],
  about: {
    headline: 'Build practical skills for real work.',
    narrative: 'Kambi Academy delivers live programs with mentors, hands-on practice, and real outcomes.',
    principles: [],
    videoUrl: '',
    videoThumbnail: '',
    videoDescription: '',
  },
  contact: {
    headline: 'Get in touch',
    description: 'Reach out to book a demo, ask about admissions, or discuss your learning needs.',
    responseTime: 'Within 24 hours',
    primaryEmail: 'hello@kambiacademy.com',
    partnerEmail: 'partners@kambiacademy.com',
    location: 'Remote-first',
    hours: 'Mon-Fri, 9am-5pm GMT',
  },
  tutorProgram: {
    headline: 'Teach with real-world impact.',
    description: 'Become a mentor and deliver live programs for learners ready to grow.',
    benefits: [],
    reviewSteps: [],
  },
  meet: {
    name: 'Kambi Academy Live',
    headline: 'Host your live sessions with secure, scalable conferencing.',
    description: 'Access live class tools and collaboration workflows for every live session.',
    features: [],
  },
  instructors: [],
  courses: [],
  testimonials: [],
  faqs: [],
  sessions: [],
};

const AppShell: React.FC = () => {
  const [siteData, setSiteData] = useState<SiteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSiteData = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const nextData = await api.getSite();
      setSiteData(nextData);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'An unexpected error occurred while fetching site content.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSiteData();
  }, [loadSiteData]);

  const resolvedSiteData: SiteData = siteData
    ? {
        ...defaultSiteData,
        ...siteData,
        branding: { ...defaultSiteData.branding, ...(siteData.branding ?? {}) },
        hero: { ...defaultSiteData.hero, ...(siteData.hero ?? {}) },
        about: { ...defaultSiteData.about, ...(siteData.about ?? {}) },
        contact: { ...defaultSiteData.contact, ...(siteData.contact ?? {}) },
        tutorProgram: { ...defaultSiteData.tutorProgram, ...(siteData.tutorProgram ?? {}) },
        meet: { ...defaultSiteData.meet, ...(siteData.meet ?? {}) },
        stats: siteData.stats ?? defaultSiteData.stats,
        instructors: siteData.instructors ?? defaultSiteData.instructors,
        courses: siteData.courses ?? defaultSiteData.courses,
        testimonials: siteData.testimonials ?? defaultSiteData.testimonials,
        faqs: siteData.faqs ?? defaultSiteData.faqs,
        sessions: siteData.sessions ?? defaultSiteData.sessions,
      }
    : defaultSiteData;

  const branding = resolvedSiteData.branding;
  const location = useLocation();

  // Dashboard routes get full-width layout without header/footer
  const isDashboard = /^\/(superadmin|admin|tutor|teacher|student|change-password)/.test(location.pathname);

  if (isDashboard) {
    return (
      <div className="app-shell min-h-screen">
        {isLoading ? (
          <LoadingState />
        ) : (
          <Suspense fallback={<LoadingState />}>
          <Routes>
            <Route path="/admin" element={<RequireAdmin><AdminPanel /></RequireAdmin>} />
            <Route path="/superadmin/*" element={<RequireSuperAdmin><SuperAdminRoutes /></RequireSuperAdmin>} />
            <Route path="/tutor" element={<RequireTutor><Navigate to="/teacher" replace /></RequireTutor>} />
            <Route path="/student/*" element={<RequireAuth><StudentDashboard /></RequireAuth>} />
            <Route path="/change-password" element={<RequireChangePassword><ChangePassword /></RequireChangePassword>} />
            <Route path="/teacher" element={<RequireTutor><TeacherDashboard /></RequireTutor>} />
            <Route path="/teacher/courses" element={<RequireTutor><TeacherCourses /></RequireTutor>} />
            <Route path="/teacher/materials" element={<RequireTutor><TeacherMaterials /></RequireTutor>} />
            <Route path="/teacher/assignments" element={<RequireTutor><TeacherAssignments /></RequireTutor>} />
            <Route path="/teacher/quizzes" element={<RequireTutor><TeacherQuizzes /></RequireTutor>} />
            <Route path="/teacher/classes" element={<RequireTutor><TeacherClasses /></RequireTutor>} />
            <Route path="/teacher/live" element={<RequireTutor><TeacherLive /></RequireTutor>} />
            <Route path="/teacher/billing" element={<RequireTutor><TeacherBilling /></RequireTutor>} />
            <Route path="/teacher/ai" element={<RequireTutor><TeacherAI /></RequireTutor>} />
            <Route path="/teacher/students" element={<RequireTutor><TeacherStudents /></RequireTutor>} />
            <Route path="/teacher/settings" element={<RequireTutor><TeacherSettings /></RequireTutor>} />
            <Route path="/teacher/*" element={<RequireTutor><Navigate to="/teacher" replace /></RequireTutor>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        )}
      </div>
    );
  }

  return (
    <div className="app-shell flex min-h-screen flex-col text-slate-950">
      <Header branding={branding} />
      {error && !isLoading && (
        <div className="flex items-center justify-between gap-4 bg-amber-50 px-4 py-2 text-xs text-amber-700 sm:px-6">
          <span>⚠ API unavailable — showing default content. {error}</span>
          <button
            onClick={loadSiteData}
            className="shrink-0 rounded-full bg-amber-100 px-3 py-1 font-semibold hover:bg-amber-200"
          >
            Retry
          </button>
        </div>
      )}
      <main className="relative flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
          {isLoading ? (
            <LoadingState />
          ) : (
            <Suspense fallback={<LoadingState />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/payment-callback" element={<PaymentCallback />} />
              <Route path="/admin" element={<RequireAdmin><AdminPanel /></RequireAdmin>} />
              <Route path="/superadmin/*" element={<RequireSuperAdmin><SuperAdminRoutes /></RequireSuperAdmin>} />
              <Route path="/tutor" element={<RequireTutor><Navigate to="/teacher" replace /></RequireTutor>} />
              <Route path="/student/*" element={<RequireAuth><StudentDashboard /></RequireAuth>} />
              <Route path="/change-password" element={<RequireChangePassword><ChangePassword /></RequireChangePassword>} />
              <Route path="/join/:code" element={<JoinClass />} />
              {/* Teacher Dashboard Routes */}
              <Route path="/teacher" element={<RequireTutor><TeacherDashboard /></RequireTutor>} />
              <Route path="/teacher/courses" element={<RequireTutor><TeacherCourses /></RequireTutor>} />
              <Route path="/teacher/materials" element={<RequireTutor><TeacherMaterials /></RequireTutor>} />
              <Route path="/teacher/assignments" element={<RequireTutor><TeacherAssignments /></RequireTutor>} />
              <Route path="/teacher/quizzes" element={<RequireTutor><TeacherQuizzes /></RequireTutor>} />
              <Route path="/teacher/classes" element={<RequireTutor><TeacherClasses /></RequireTutor>} />
              <Route path="/teacher/live" element={<RequireTutor><TeacherLive /></RequireTutor>} />
              <Route path="/teacher/billing" element={<RequireTutor><TeacherBilling /></RequireTutor>} />
              <Route path="/teacher/ai" element={<RequireTutor><TeacherAI /></RequireTutor>} />
              <Route path="/teacher/students" element={<RequireTutor><TeacherStudents /></RequireTutor>} />
              <Route path="/teacher/settings" element={<RequireTutor><TeacherSettings /></RequireTutor>} />
              <Route path="/" element={<Home siteData={resolvedSiteData} />} />
              <Route path="/about" element={<About about={resolvedSiteData.about} instructors={resolvedSiteData.instructors} stats={resolvedSiteData.stats} />} />
              <Route path="/contact" element={<Contact contact={resolvedSiteData.contact} />} />
              <Route path="/courses" element={<CourseList courses={resolvedSiteData.courses} instructors={resolvedSiteData.instructors} />} />
              <Route path="/courses/:slug" element={<RequireAuth><CourseDetailRoute siteData={resolvedSiteData} /></RequireAuth>} />
              <Route path="/faq" element={<Faq faqs={resolvedSiteData.faqs} />} />
              <Route path="/teach" element={<BecomeTutor />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
          )}
        </div>
      </main>
      <Footer branding={branding} contact={resolvedSiteData.contact} />
    </div>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <AuthProvider>
      <ScrollToTop />
      <AppShell />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
