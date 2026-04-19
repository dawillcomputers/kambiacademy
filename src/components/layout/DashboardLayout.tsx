import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../lib/auth';
import { User } from '../../../types';

interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: User;
  showMaterials?: boolean;
}

const buildStudentMenu = (showMaterials = false) => [
  { name: 'Dashboard', path: '/student', icon: '🏠' },
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
  { name: 'Overview', path: '/teacher', icon: '🏠' },
  { name: 'My Courses', path: '/teacher/courses', icon: '📚' },
  { name: 'Classes', path: '/teacher/classes', icon: '🏫' },
  { name: 'Assignments', path: '/teacher/assignments', icon: '📝' },
  { name: 'Quizzes', path: '/teacher/quizzes', icon: '❓' },
  { name: 'Subscriptions', path: '/teacher/subscriptions', icon: '💳' },
  { name: 'Wallet', path: '/teacher/wallet', icon: '💰' },
  { name: 'Profile', path: '/teacher/profile', icon: '👤' },
];

export default function DashboardLayout({ children, user, showMaterials = false }: DashboardLayoutProps) {
  const { user: authUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>(() => localStorage.getItem('student_profile_avatar') || '');

  useEffect(() => {
    const handleProfileUpdate = () => {
      setAvatarUrl(localStorage.getItem('student_profile_avatar') || '');
    };

    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('profile-updated', handleProfileUpdate);
  }, []);

  const effectiveUser = (user || (authUser as unknown as User | undefined));
  const isTeacher = (authUser?.role === 'teacher') || ((effectiveUser as any)?.role === 'teacher');

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const menu = isTeacher ? buildTeacherMenu() : buildStudentMenu(showMaterials);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className={`w-64 bg-gray-900 text-white fixed inset-y-0 left-0 z-50 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-xl font-bold">Kambi Academy</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <nav className="mt-5">
          {menu.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-5 py-3 hover:bg-gray-700 transition-colors ${
                location.pathname === item.path ? 'bg-blue-600 border-r-4 border-blue-400' : ''
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="mr-3">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Top Navbar */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 lg:px-6">
          <div className="flex items-center justify-between">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-600 hover:text-gray-900"
            >
              ☰
            </button>

            {/* Search Bar */}
            <div className="flex-1 max-w-md mx-4">
              <input
                type="text"
                placeholder="Search courses, materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(isTeacher ? '/teacher/profile' : '/student/profile')}
                className="hidden sm:inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {isTeacher ? 'My Profile' : 'Edit Profile'}
              </button>

              <button className="text-gray-600 hover:text-gray-900 relative">
                🔔
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              <div className="flex items-center gap-2">
                <img
                  src={avatarUrl || (effectiveUser as any)?.avatar || 'https://via.placeholder.com/32x32'}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span className="hidden md:block text-sm font-medium text-gray-700">
                  {effectiveUser?.name || (isTeacher ? 'Teacher' : 'Student')}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}