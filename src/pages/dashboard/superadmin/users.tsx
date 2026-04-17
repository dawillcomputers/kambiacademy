import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../../lib/auth';
import { api } from '../../../../lib/api';

interface ManagedUser {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  must_change_password: number;
  created_at: string;
}

const SuperAdminUsers: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'admin' | 'teacher' | 'student'>('all');

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await api.get('/admin/users');
        setUsers(response.users || []);
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const filteredUsers = users.filter(u => filter === 'all' || u.role === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'teacher': return 'bg-green-100 text-green-800';
      case 'student': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
            { name: 'Dashboard', icon: '📊', path: '/superadmin', active: false },
            { name: 'Users', icon: '👥', path: '/superadmin/users', active: true },
            { name: 'Courses', icon: '📚', path: '/superadmin/courses', active: false },
            { name: 'Analytics', icon: '📈', path: '/superadmin/analytics', active: false },
            { name: 'Finance', icon: '💰', path: '/superadmin/finance', active: false },
            { name: 'Settings', icon: '⚙️', path: '/superadmin/settings', active: false },
            { name: 'Audit Log', icon: '📋', path: '/superadmin/audit', active: false },
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
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <header className="flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/30 backdrop-blur-sm">
          <div>
            <h1 className="text-2xl font-bold text-white">User Management</h1>
            <p className="text-slate-400 mt-1">Manage all users across the platform</p>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Filters */}
          <div className="mb-6">
            <div className="flex gap-2">
              {[
                { key: 'all', label: 'All Users', count: users.length },
                { key: 'admin', label: 'Admins', count: users.filter(u => u.role === 'admin' || u.role === 'super_admin').length },
                { key: 'teacher', label: 'Teachers', count: users.filter(u => u.role === 'teacher').length },
                { key: 'student', label: 'Students', count: users.filter(u => u.role === 'student').length },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setFilter(item.key as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === item.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {item.label} ({item.count})
                </button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Password Reset</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-700/30">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-3">
                              <span className="text-white font-bold text-sm">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white">{user.name}</div>
                              <div className="text-sm text-slate-400">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getRoleColor(user.role)}`}>
                            {user.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getStatusColor(user.status)}`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.must_change_password ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                              Required
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Set
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SuperAdminUsers;