import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../lib/auth';

interface TeacherDashboardLayoutProps {
  children: React.ReactNode;
}

type NavItem = {
  name: string;
  path: string;
  icon: string;
};

const primaryNav: NavItem[] = [
  { name: 'Overview', path: '/teacher', icon: '📊' },
  { name: 'My Courses', path: '/teacher/courses', icon: '📚' },
  { name: 'Classes', path: '/teacher/classes', icon: '🏫' },
  { name: 'Assignments', path: '/teacher/assignments', icon: '📝' },
  { name: 'Quizzes', path: '/teacher/quizzes', icon: '📋' },
  { name: 'Subscriptions', path: '/teacher/subscriptions', icon: '💳' },
  { name: 'Wallet', path: '/teacher/wallet', icon: '💰' },
  { name: 'Profile', path: '/teacher/profile', icon: '👤' },
];

const utilityNav: NavItem[] = [
  { name: 'Chat', path: '/teacher/chat', icon: '💬' },
  { name: 'Materials', path: '/teacher/materials', icon: '📁' },
  { name: 'Students', path: '/teacher/students', icon: '🎓' },
  { name: 'Billing', path: '/teacher/billing', icon: '🧾' },
  { name: 'Settings', path: '/teacher/settings', icon: '⚙️' },
  { name: 'AI Studio', path: '/teacher/ai', icon: '🤖' },
];

const getPageName = (pathname: string) => {
  const active = [...primaryNav, ...utilityNav].find((item) => {
    if (item.path === '/teacher') {
      return pathname === item.path;
    }

    return pathname === item.path || pathname.startsWith(`${item.path}/`);
  });

  return active?.name || 'Teacher Dashboard';
};

const isActive = (pathname: string, itemPath: string) => {
  if (itemPath === '/teacher') {
    return pathname === itemPath;
  }

  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
};

export default function TeacherDashboardLayout({ children }: TeacherDashboardLayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>(() => localStorage.getItem('student_profile_avatar') || '');
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleProfileUpdate = () => {
      setAvatarUrl(localStorage.getItem('student_profile_avatar') || '');
    };

    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('profile-updated', handleProfileUpdate);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
    setProfileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const avatarSrc = avatarUrl || (user as any)?.avatar || 'https://via.placeholder.com/40x40';
  const pageName = useMemo(() => getPageName(location.pathname), [location.pathname]);

  const renderNavSection = (items: NavItem[], title?: string) => (
    <div className="space-y-1">
      {title && <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{title}</p>}
      {items.map((item) => {
        const active = isActive(location.pathname, item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition ${active ? 'bg-slate-950 text-white shadow-lg shadow-slate-300/40' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="truncate">{item.name}</span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-100">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[292px] max-w-[85vw] flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:max-w-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5">
          <Link to="/teacher" className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">Teacher Panel</p>
            <h2 className="mt-1 truncate text-xl font-bold text-slate-950">Kambi Academy</h2>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            aria-label="Close sidebar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
          {renderNavSection(primaryNav)}
          {renderNavSection(utilityNav, 'Tools')}
        </div>

        <div className="border-t border-slate-200 p-4">
          <Link
            to="/teacher/profile"
            className="flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-slate-100"
          >
            <img
              src={avatarSrc}
              alt="Teacher avatar"
              className="h-10 w-10 rounded-full border border-slate-200 object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{user?.name || 'Teacher'}</p>
              <p className="truncate text-xs text-slate-500">{user?.email || 'Teacher account'}</p>
            </div>
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-50 lg:hidden"
                aria-label="Open sidebar"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Teacher Dashboard</p>
                <h1 className="truncate text-lg font-semibold text-slate-950 sm:text-xl">{pageName}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/teacher/courses"
                className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 md:inline-flex"
              >
                New course
              </Link>

              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1.5 shadow-sm transition hover:bg-slate-50 sm:px-3"
                >
                  <img
                    src={avatarSrc}
                    alt="Teacher avatar"
                    className="h-8 w-8 rounded-full object-cover"
                  />
                  <span className="hidden max-w-32 truncate text-sm font-medium text-slate-700 sm:block">{user?.name || 'Teacher'}</span>
                  <svg className={`hidden h-4 w-4 text-slate-400 transition-transform sm:block ${profileMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 top-12 z-50 w-64 rounded-3xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-200/80">
                    <div className="flex items-center gap-3 rounded-2xl px-3 py-3">
                      <img
                        src={avatarSrc}
                        alt="Teacher avatar"
                        className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{user?.name || 'Teacher'}</p>
                        <p className="truncate text-xs text-slate-500">{user?.email || 'Teacher account'}</p>
                      </div>
                    </div>
                    <Link
                      to="/teacher/profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <span className="text-base">👤</span>
                      <span>Open profile</span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                    >
                      <span className="text-base">🚪</span>
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}