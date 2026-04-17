import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

interface SuperAdminStats {
  totalUsers: number;
  totalEnrollments: number;
  totalRevenue: number;
  totalContacts: number;
  totalTutorApps: number;
  totalLikes: number;
  totalViews: number;
  recentUsers: Array<{ id: number; name: string; email: string; role: string; created_at: string }>;
  recentEnrollments: Array<{ course_slug: string; amount_paid: number; created_at: string; user_name: string; user_email: string }>;
  topCourses: Array<{ course_slug: string; enrollment_count: number; total_revenue: number }>;
  topTeachers: Array<{ id: number; name: string; email: string; enrollment_count: number; total_revenue: number; course_count: number }>;
}

const AnimatedCounter: React.FC<{ value: number; label: string; icon: string; color: string }> = ({ value, label, icon, color }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const step = Math.ceil(end / 40);

    const interval = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(interval);
      } else {
        setCount(start);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [value]);

  return (
    <div className={`bg-gradient-to-br ${color} rounded-xl p-6 text-white shadow-lg`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`opacity-80 text-sm font-medium`}>{label}</p>
          <p className="text-3xl font-bold mt-2">{count.toLocaleString()}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
};

const SuperAdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiInput, setAiInput] = useState('');
  const [aiLog, setAiLog] = useState<Array<{ role: string; text: string }>>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const sidebarItems = [
    { name: 'Dashboard', icon: '📊', path: '/superadmin', active: location.pathname === '/superadmin' },
    { name: 'Users', icon: '👥', path: '/superadmin/users', active: location.pathname === '/superadmin/users' },
    { name: 'Courses', icon: '📚', path: '/superadmin/courses', active: location.pathname === '/superadmin/courses' },
    { name: 'Analytics', icon: '📈', path: '/superadmin/analytics', active: location.pathname === '/superadmin/analytics' },
    { name: 'Finance', icon: '💰', path: '/superadmin/finance', active: location.pathname === '/superadmin/finance' },
    { name: 'Payouts', icon: '💸', path: '/superadmin/payouts', active: location.pathname === '/superadmin/payouts' },
    { name: 'Settings', icon: '⚙️', path: '/superadmin/settings', active: location.pathname === '/superadmin/settings' },
    { name: 'Audit Log', icon: '📋', path: '/superadmin/audit', active: location.pathname === '/superadmin/audit' },
  ];

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await api.get('/admin/stats');
        setStats(response);
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
    
    // Refresh stats every 10 seconds
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const sendAiCommand = async () => {
    if (!aiInput.trim()) return;

    setAiLog(prev => [...prev, { role: 'user', text: aiInput }]);
    const command = aiInput;
    setAiInput('');

    try {
      const response = await fetch('/api/ai/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });

      const data = await response.json();
      setAiLog(prev => [...prev, {
        role: 'ai',
        text: data.result || data.message || 'Command executed'
      }]);
    } catch (error: any) {
      setAiLog(prev => [...prev, {
        role: 'ai',
        text: `Error: ${error.message}`
      }]);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Sidebar */}
      <aside className="w-72 h-screen overflow-y-auto border-r border-white/10 bg-slate-900/50 backdrop-blur-sm">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-xl font-bold text-white">Super Admin</h1>
          <p className="text-sm text-slate-400 mt-1">Kambi Academy</p>
        </div>

        <nav className="p-4 space-y-2">
          {[
            { name: 'Dashboard', icon: '📊', path: '/superadmin', active: location.pathname === '/superadmin' },
            { name: 'Users', icon: '👥', path: '/superadmin/users', active: location.pathname === '/superadmin/users' },
            { name: 'Courses', icon: '📚', path: '/superadmin/courses', active: location.pathname === '/superadmin/courses' },
            { name: 'Analytics', icon: '📈', path: '/superadmin/analytics', active: location.pathname === '/superadmin/analytics' },
            { name: 'Finance', icon: '💰', path: '/superadmin/finance', active: location.pathname === '/superadmin/finance' },
            { name: 'Payouts', icon: '💸', path: '/superadmin/payouts', active: location.pathname === '/superadmin/payouts' },
            { name: 'Settings', icon: '⚙️', path: '/superadmin/settings', active: location.pathname === '/superadmin/settings' },
            { name: 'Audit Log', icon: '📋', path: '/superadmin/audit', active: location.pathname === '/superadmin/audit' },
          ].map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                item.active
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* User Profile Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-slate-900/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {user?.name?.charAt(0)?.toUpperCase() || 'S'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-red-600/20 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <header className="flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/30 backdrop-blur-sm">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
            <p className="text-slate-400 mt-1">Welcome back, {user?.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-slate-400">Last login</p>
              <p className="text-sm text-white">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Users</p>
                    <p className="text-3xl font-bold mt-2">{stats?.totalUsers || 0}</p>
                  </div>
                  <div className="text-4xl">👥</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Enrollments</p>
                    <p className="text-3xl font-bold mt-2">{stats?.totalEnrollments || 0}</p>
                  </div>
                  <div className="text-4xl">📚</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Revenue</p>
                    <p className="text-3xl font-bold mt-2">₦{stats?.totalRevenue?.toLocaleString() || 0}</p>
                  </div>
                  <div className="text-4xl">💰</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Contacts</p>
                    <p className="text-3xl font-bold mt-2">{stats?.totalContacts || 0}</p>
                  </div>
                  <div className="text-4xl">📞</div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Users</h3>
              <div className="space-y-3">
                {stats?.recentUsers?.slice(0, 5).map((user) => (
                  <div key={user.id} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{user.name}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-slate-600 rounded-full text-slate-300 capitalize">
                      {user.role}
                    </span>
                  </div>
                )) || (
                  <p className="text-slate-400 text-sm">No recent users</p>
                )}
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Enrollments</h3>
              <div className="space-y-3">
                {stats?.recentEnrollments?.slice(0, 5).map((enrollment, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">📚</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{enrollment.course_slug}</p>
                      <p className="text-xs text-slate-400 truncate">{enrollment.user_name}</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-slate-600 rounded-full text-slate-300">
                      ₦{enrollment.amount_paid}
                    </span>
                  </div>
                )) || (
                  <p className="text-slate-400 text-sm">No recent enrollments</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;