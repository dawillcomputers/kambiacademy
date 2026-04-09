
import React, { useCallback, useEffect, useState } from 'react';
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
import SignUp from './components/SignUp';
import AdminPanel from './components/AdminPanel';
import TutorPanel from './components/TutorPanel';
import StudentPanel from './components/StudentPanel';
import ChangePassword from './components/ChangePassword';
import JoinClass from './components/JoinClass';
import { api } from './lib/api';
import { AuthProvider, useAuth } from './lib/auth';
import { BrandingContent, SiteData } from './types';

const fallbackBranding: BrandingContent = {
  name: 'Kambi Academy',
  strapline: 'Live digital skills programs powered by Ndovera Meet.',
  primaryCta: { label: 'Explore courses', href: '/courses' },
  secondaryCta: { label: 'Contact admissions', href: '/contact' },
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
    <p className="mt-2 text-sm text-slate-500">Fetching production data from the Cloudflare API.</p>
  </section>
);

const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <section className="section-shell surface-ring rounded-[32px] border border-rose-100 bg-white/90 px-6 py-16 text-center sm:px-10">
    <p className="text-sm font-semibold uppercase tracking-[0.28em] text-rose-500">Backend unavailable</p>
    <h1 className="mt-4 font-display text-3xl font-bold text-slate-950">The site API is not responding yet.</h1>
    <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600">
      {message || 'Check the Cloudflare Pages Function, D1 bindings, and database seed before retrying.'}
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

  return children;
};

const RequireAdmin: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingState />;
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />;

  return children;
};

const RequireTutor: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingState />;
  if (!user || user.role !== 'teacher') return <Navigate to="/" replace />;

  return children;
};

const RequireChangePassword: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingState />;
  if (!user) return <Navigate to="/login" replace />;

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

  const branding = siteData?.branding ?? fallbackBranding;

  return (
    <div className="app-shell flex min-h-screen flex-col text-slate-950">
      <Header branding={branding} />
      <main className="relative flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
          {isLoading ? (
            <LoadingState />
          ) : error || !siteData ? (
            <ErrorState message={error} onRetry={loadSiteData} />
          ) : (
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/admin" element={<RequireAdmin><AdminPanel /></RequireAdmin>} />
              <Route path="/tutor" element={<RequireTutor><TutorPanel /></RequireTutor>} />
              <Route path="/student" element={<RequireAuth><StudentPanel /></RequireAuth>} />
              <Route path="/change-password" element={<RequireChangePassword><ChangePassword /></RequireChangePassword>} />
              <Route path="/join/:code" element={<JoinClass />} />
              <Route path="/" element={<Home siteData={siteData} />} />
              <Route path="/about" element={<About about={siteData.about} instructors={siteData.instructors} stats={siteData.stats} />} />
              <Route path="/contact" element={<Contact contact={siteData.contact} />} />
              <Route path="/courses" element={<CourseList courses={siteData.courses} instructors={siteData.instructors} />} />
              <Route path="/courses/:slug" element={<RequireAuth><CourseDetailRoute siteData={siteData} /></RequireAuth>} />
              <Route path="/faq" element={<Faq faqs={siteData.faqs} />} />
              <Route path="/teach" element={<BecomeTutor />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </div>
      </main>
      <Footer branding={branding} contact={siteData?.contact ?? null} />
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
