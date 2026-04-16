import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User } from '../../types';

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
  { name: "Request Class", icon: "📝", path: "/student/request-class" },
  { name: "AI Courses", icon: "🤖", path: "/student/ai-courses" },
  { name: "Chat", icon: "💬", path: "/student/chat" },
];

export default function DashboardLayout({ children, user, showMaterials = false }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const menu = buildMenu(showMaterials);
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  useEffect(() => {
    const handleProfileUpdate = () => {
      setAvatarUrl(localStorage.getItem('student_profile_avatar') || '');
    };

    // Load initial avatar
    handleProfileUpdate();

    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('profile-updated', handleProfileUpdate);
  }, []);
  return (
    <div className="flex h-screen bg-gradient-to-br from-indigo-900 via-slate-900 to-black text-white">

      {/* Sidebar */}
      <aside className="w-72 h-screen overflow-y-auto border-r border-white/10">
        <div className="p-5 font-bold text-xl">Kambi Academy</div>
        <nav className="space-y-2 px-3">
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
      <main className="flex-1 min-h-0 flex flex-col">
        {/* Top bar with profile */}
        <header className="flex justify-end items-center p-4 border-b border-white/10">
          <button
            onClick={() => navigate('/student/profile')}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <img
              src={avatarUrl || 'https://via.placeholder.com/32?text=👤'}
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover"
            />
            <span className="text-sm font-medium">Edit Profile</span>
          </button>
        </header>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}