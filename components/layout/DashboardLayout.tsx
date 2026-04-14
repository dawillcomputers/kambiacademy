import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User } from '../../types';

interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: User;
}

const menu = [
  { name: "Dashboard", icon: "🏠", path: "/" },
  { name: "My Courses", icon: "📚", path: "/courses" },
  { name: "Materials", icon: "📁", path: "/materials" },
  { name: "Assignments", icon: "📝", path: "/assignments" },
  { name: "Submissions", icon: "📤", path: "/submissions" },
  { name: "Live Classes", icon: "🎥", path: "/live" },
  { name: "Request Class", icon: "📝", path: "/request-class" },
  { name: "AI Courses", icon: "🤖", path: "/ai-courses" },
];

export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const location = useLocation();
  return (
    <div className="flex h-screen bg-gradient-to-br from-indigo-900 via-slate-900 to-black text-white">

      {/* Sidebar */}
      <aside className="w-72 h-screen overflow-y-auto border-r border-white/10">
        <div className="p-5 font-bold text-xl">Kambi Academy</div>
        <nav className="space-y-2 px-3">
          {menu.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
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
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
}