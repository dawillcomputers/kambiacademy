import React from 'react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const menu = [
  { name: "My Courses", icon: "📚" },
  { name: "Materials", icon: "📁" },
  { name: "Assignments", icon: "📝" },
  { name: "Quizzes", icon: "❓" },
  { name: "Classes", icon: "🏫" },
  { name: "Live Classes", icon: "🎥" },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-gradient-to-br from-indigo-900 via-slate-900 to-black text-white">

      {/* Sidebar */}
      <aside className="w-72 h-screen overflow-y-auto border-r border-white/10">
        <div className="p-5 font-bold text-xl">Kambi Academy</div>
        <nav className="space-y-2 px-3">
          {menu.map((item) => (
            <div key={item.name} className="p-3 rounded-xl hover:bg-white/10 cursor-pointer transition-colors">
              {item.icon} {item.name}
            </div>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
}