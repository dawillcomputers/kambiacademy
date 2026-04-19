import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../lib/auth';
import { User } from '../../../types';

interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: User;
  showMaterials?: boolean;
}

const buildStudentMenu = (showMaterials = false) => [
  { name: 'Dashboard', path: '/student', icon: '📊' },
  { name: 'Profile', path: '/student/profile', icon: '👤' },
  { name: 'Chat', path: '/student/chat', icon: '💬' },
  { name: 'Courses', path: '/student/courses', icon: '📚' },
  ...(showMaterials ? [{ name: 'Materials', path: '/student/materials', icon: '📁' }] : []),
  { name: 'Assignments', path: '/student/assignments', icon: '📝' },
  { name: 'My Submissions', path: '/student/submissions', icon: '📤' },
  { name: 'Quizzes', path: '/student/quizzes', icon: '❓' },
  { name: 'Live Classes', path: '/student/live', icon: '🎥' },
  { name: 'Request Class', path: '/student/request-class', icon: '🙋' },
  { name: 'AI Courses', path: '/student/ai-courses', icon: '🤖' },
];

const buildTeacherMenu = () => [
  { name: 'Overview', path: '/teacher', icon: '📊' },
  { name: 'My Courses', path: '/teacher/courses', icon: '📚' },
  { name: 'Classes', path: '/teacher/classes', icon: '🏫' },
  { name: 'Chat', path: '/teacher/chat', icon: '💬' },
  { name: 'Assignments', path: '/teacher/assignments', icon: '📝' },
  { name: 'Quizzes', path: '/teacher/quizzes', icon: '📋' },
  { name: 'Subscriptions', path: '/teacher/subscriptions', icon: '💳' },
  { name: 'Wallet', path: '/teacher/wallet', icon: '💰' },
  { name: 'Profile', path: '/teacher/profile', icon: '👤' },
];

export default function DashboardLayout({ children, user, showMaterials = false }: DashboardLayoutProps) {
  const { user: authUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
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

  // Close mobile sidebar on route change
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

  const effectiveUser = (user || (authUser as unknown as User | undefined));
  const isTeacher = (authUser?.role === 'teacher') || ((effectiveUser as any)?.role === 'teacher');

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const menu = isTeacher ? buildTeacherMenu() : buildStudentMenu(showMaterials);
  const profilePath = isTeacher ? '/teacher/profile' : '/student/profile';
  const avatarSrc = avatarUrl || (effectiveUser as any)?.avatar || 'https://via.placeholder.com/32x32';

  // Determine active path — exact match for root, startsWith for sub-paths
  const isActive = (path: string) => {
    if (path === '/teacher' || path === '/student') return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const currentPageName = menu.find(item => isActive(item.path))?.name || 'Dashboard';

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Sidebar ── */}
      <aside
        className={`
          ${collapsed ? 'lg:w-[72px]' : 'lg:w-64'}
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          fixed inset-y-0 left-0 z-50 flex flex-col
          w-64 bg-white border-r border-gray-200
          transition-all duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:inset-auto
        `}
      >
        {/* Logo / Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 px-4">
          {!collapsed && (
            <Link to={isTeacher ? '/teacher' : '/student'} className="flex items-center gap-2">
              <span className="text-xl">🎓</span>
              <span className="text-lg font-bold text-gray-900">Kambi Academy</span>
            </Link>
          )}
          {collapsed && (
            <Link to={isTeacher ? '/teacher' : '/student'} className="mx-auto text-xl">🎓</Link>
          )}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              {collapsed
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
              }
            </svg>
          </button>
        </div>

        {/* Scrollable Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {menu.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors
                  ${collapsed ? 'justify-center' : ''}
                  ${active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
                title={collapsed ? item.name : undefined}
              >
                <span className="text-lg leading-none shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="shrink-0 border-t border-gray-200 p-3">
          <Link
            to={profilePath}
            className={`flex items-center rounded-lg px-3 py-2 transition hover:bg-gray-100 ${collapsed ? 'justify-center' : 'gap-3'}`}
            title="Open profile"
          >
            <img
              src={avatarSrc}
              alt="Avatar"
              className="h-9 w-9 shrink-0 rounded-full border border-gray-200 object-cover"
            />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {effectiveUser?.name || (isTeacher ? 'Teacher' : 'Student')}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {isTeacher ? 'Teacher' : 'Student'}
                </p>
              </div>
            )}
          </Link>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Top Bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
          {/* Left: hamburger + page title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900">{currentPageName}</h1>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            </button>

            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((open) => !open)}
                className="hidden sm:flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 hover:bg-white"
              >
                <img
                  src={avatarSrc}
                  alt="Avatar"
                  className="h-6 w-6 rounded-full object-cover"
                />
                <span className="text-sm font-medium text-gray-700">
                  {effectiveUser?.name || (isTeacher ? 'Teacher' : 'Student')}
                </span>
                <svg className={`h-4 w-4 text-gray-400 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setProfileMenuOpen((open) => !open)}
                className="sm:hidden rounded-full border border-gray-200 bg-white p-1"
                aria-label="Open profile menu"
              >
                <img
                  src={avatarSrc}
                  alt="Avatar"
                  className="h-8 w-8 rounded-full object-cover"
                />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl shadow-slate-200/70">
                  <div className="flex items-center gap-3 rounded-xl px-3 py-3">
                    <img
                      src={avatarSrc}
                      alt="Avatar"
                      className="h-10 w-10 rounded-full border border-gray-200 object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {effectiveUser?.name || (isTeacher ? 'Teacher' : 'Student')}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {(effectiveUser as any)?.email || (isTeacher ? 'Teacher account' : 'Student account')}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={profilePath}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <span className="text-base">👤</span>
                    <span>Open profile</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
                  >
                    <span className="text-base">🚪</span>
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content — scrolls independently */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}