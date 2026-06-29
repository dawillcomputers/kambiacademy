import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthUser, useAuth } from '../../lib/auth';
import { useDashTheme } from '../../lib/useDashTheme';
import MobileBottomNav, { BottomNavItem } from './MobileBottomNav';

interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: AuthUser;
  showMaterials?: boolean;
}

const buildMenu = (showMaterials: boolean = false, user?: AuthUser) => {
  const enrolledCount = user?.enrolledCourses?.length || 0;

  // Bootcamp registrants get a bootcamp-first sidebar. They can always browse and
  // register for courses; once they've enrolled in at least one, "My Courses"
  // appears so they can jump straight to their enrolled courses.
  if (user?.role === 'bootcamp_student') {
    return [
      { name: "Dashboard", icon: "🏠", path: "/student" },
      { name: "Bootcamp", icon: "🚀", path: "/student/bootcamp" },
      { name: "Explore Courses", icon: "🧭", path: "/student/courses?view=available" },
      ...(enrolledCount > 0 ? [{ name: "My Courses", icon: "📚", path: "/student/courses?view=enrolled" }] : []),
      { name: "Live Classes", icon: "🎥", path: "/student/live" },
      { name: "AI Courses", icon: "🤖", path: "/student/ai-courses" },
      { name: "Chat", icon: "💬", path: "/student/chat" },
    ];
  }

  return [
    { name: "Dashboard", icon: "🏠", path: "/student" },
    { name: "My Courses", icon: "📚", path: "/student/courses" },
    { name: "Bootcamp", icon: "🚀", path: "/student/bootcamp" },
    ...(showMaterials ? [{ name: "Materials", icon: "📁", path: "/student/materials" }] : []),
    { name: "Assignments", icon: "📝", path: "/student/assignments" },
    { name: "Submissions", icon: "📤", path: "/student/submissions" },
    { name: "Live Classes", icon: "🎥", path: "/student/live" },
    { name: "Request Class", icon: "✏️", path: "/student/request-class" },
    { name: "AI Courses", icon: "🤖", path: "/student/ai-courses" },
    { name: "Chat", icon: "💬", path: "/student/chat" },
  ];
};

export default function DashboardLayout({ children, user, showMaterials = false }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user: authUser } = useAuth();
  const { isLight, toggle } = useDashTheme();
  const effectiveUser = user ?? authUser ?? undefined;
  const menu = buildMenu(showMaterials, effectiveUser);

  // Active-state match that also understands query-string entries (e.g. the
  // bootcamp_student "Explore Courses" vs "My Courses" links share a pathname).
  const matchPath = (path: string) => {
    if (path.includes('?')) {
      return location.pathname + location.search === path;
    }
    return location.pathname === path || (path !== '/student' && location.pathname.startsWith(path));
  };

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleProfileUpdate = () => {
      setAvatarUrl(localStorage.getItem('student_profile_avatar') || '');
    };

    handleProfileUpdate();

    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('profile-updated', handleProfileUpdate);
  }, []);

  // Close sidebar when navigating on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const getActiveKey = () => {
    const match = menu.find(item => matchPath(item.path));
    return match?.path || '/student';
  };

  const bottomNavItems: BottomNavItem[] = [
    ...menu.map(item => ({
      key: item.path,
      label: item.name,
      icon: item.icon,
      onClick: () => navigate(item.path),
    })),
    { key: '/student/profile', label: 'Profile', icon: '👤', onClick: () => navigate('/student/profile') },
    { key: '__logout', label: 'Logout', icon: '🚪', onClick: () => { void handleLogout(); } },
  ];

  return (
    <div className={`flex h-screen ${isLight ? 'dash-root dash-light bg-slate-100 text-slate-900' : 'bg-gradient-to-br from-indigo-900 via-slate-900 to-black text-white'}`}>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}

      {/* Sidebar - hidden on mobile, slide-in drawer */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-72 h-screen overflow-y-auto border-r
        ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-gradient-to-br from-indigo-900 via-slate-900 to-black'}
        flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        <div className="p-5 flex items-center justify-between">
          <span className="flex items-center gap-2.5 text-xl font-bold">
            <img src="/kambiacademy_logo.jpg" alt="Kambi Academy" className="h-9 w-9 rounded-lg object-contain" />
            Kambi Academy
          </span>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-white/60 hover:text-white p-1">
            ✕
          </button>
        </div>
        <nav className="space-y-2 px-3 pb-4">
          {menu.map((item) => {
            const isActive = matchPath(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`block p-3 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-white/10 text-white'
                }`}
              >
                {item.icon} {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Account actions pinned to the bottom of the sidebar */}
        <div className="mt-auto space-y-2 border-t border-white/10 px-3 py-4">
          <button
            onClick={() => navigate('/student/profile')}
            className="flex w-full items-center gap-2 rounded-xl p-3 text-left text-white transition-colors hover:bg-white/10"
          >
            👤 Edit Profile
          </button>
          <button
            onClick={() => { void handleLogout(); }}
            className="flex w-full items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-left font-semibold text-rose-100 transition-colors hover:bg-rose-500/20"
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-h-0 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex justify-between items-center p-4 border-b border-white/10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-white p-2 -ml-2 rounded-lg hover:bg-white/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1" />
          <button
            onClick={toggle}
            title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
            aria-label="Toggle theme"
            className="mr-1 rounded-lg px-3 py-2 text-lg transition-colors hover:bg-white/10"
          >
            {isLight ? '🌙' : '☀️'}
          </button>
          <button
            onClick={() => navigate('/student/profile')}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-white">
                {user?.name?.trim().charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <span className="text-sm font-medium hidden sm:inline">Edit Profile</span>
          </button>
          <button
            onClick={() => { void handleLogout(); }}
            className="ml-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-200 transition-colors hover:bg-rose-500/15"
            title="Log out"
          >
            <span>🚪</span>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </header>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </div>

        {/* Mobile bottom navigation */}
        <MobileBottomNav items={bottomNavItems} activeKey={getActiveKey()} maxVisible={5} />
      </main>
    </div>
  );
}