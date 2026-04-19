import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User } from '../../types';
import MobileBottomNav, { BottomNavItem } from './MobileBottomNav';

interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: User;
  showMaterials?: boolean;
}

const buildMenu = (showMaterials: boolean = false) => [
  { name: "Dashboard", icon: "🏠", path: "/student" },
  { name: "My Courses", icon: "📚", path: "/student/courses" },
  ...(showMaterials ? [{ name: "Materials", icon: "📁", path: "/student/materials" }] : []),
  { name: "Assignments", icon: "📝", path: "/student/assignments" },
  { name: "Submissions", icon: "📤", path: "/student/submissions" },
  { name: "Live Classes", icon: "🎥", path: "/student/live" },
  { name: "Request Class", icon: "✏️", path: "/student/request-class" },
  { name: "AI Courses", icon: "🤖", path: "/student/ai-courses" },
  { name: "Chat", icon: "💬", path: "/student/chat" },
];

export default function DashboardLayout({ children, user, showMaterials = false }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const menu = buildMenu(showMaterials);
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
    const match = menu.find(item =>
      item.path === location.pathname ||
      (item.path !== '/student' && location.pathname.startsWith(item.path))
    );
    return match?.path || '/student';
  };

  const bottomNavItems: BottomNavItem[] = menu.map(item => ({
    key: item.path,
    label: item.name,
    icon: item.icon,
    onClick: () => navigate(item.path),
  }));

  return (
    <div className="flex h-screen bg-gradient-to-br from-indigo-900 via-slate-900 to-black text-white">

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}

      {/* Sidebar - hidden on mobile, slide-in drawer */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-72 h-screen overflow-y-auto border-r border-white/10
        bg-gradient-to-br from-indigo-900 via-slate-900 to-black
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        <div className="p-5 font-bold text-xl flex items-center justify-between">
          <span>Kambi Academy</span>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-white/60 hover:text-white p-1">
            ✕
          </button>
        </div>
        <nav className="space-y-2 px-3 pb-6">
          {menu.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/student' && location.pathname.startsWith(item.path));
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
            onClick={() => navigate('/student/profile')}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <img
              src={avatarUrl || 'https://via.placeholder.com/32?text=👤'}
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover"
            />
            <span className="text-sm font-medium hidden sm:inline">Edit Profile</span>
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