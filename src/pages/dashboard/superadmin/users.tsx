import React, { useState, useEffect } from 'react';
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
        <p className="mt-1 text-sm text-slate-500">Manage all users across the platform</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'All Users', count: users.length },
          { key: 'admin', label: 'Admins', count: users.filter(u => u.role === 'admin' || u.role === 'super_admin').length },
          { key: 'teacher', label: 'Teachers', count: users.filter(u => u.role === 'teacher').length },
          { key: 'student', label: 'Students', count: users.filter(u => u.role === 'student').length },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key as any)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              filter === item.key
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {item.label} ({item.count})
          </button>
        ))}
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Password</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{u.name}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${getRoleColor(u.role)}`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${getStatusColor(u.status)}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.must_change_password ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                        {u.must_change_password ? 'Reset Required' : 'Set'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="py-12 text-center text-sm text-slate-500">No users found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminUsers;