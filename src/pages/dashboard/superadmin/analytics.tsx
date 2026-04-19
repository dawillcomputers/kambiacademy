import React, { useState, useEffect } from 'react';
import { api } from '../../../../lib/api';

const SuperAdminAnalytics: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await api.adminGetStats();
        setStats(response);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900" />
      </div>
    );
  }

  const metrics = [
    { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: '👥', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Enrollments', value: stats?.totalEnrollments ?? 0, icon: '📚', color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Contact Submissions', value: stats?.totalContacts ?? 0, icon: '📩', color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Tutor Applications', value: stats?.totalTutorApps ?? 0, icon: '🎓', color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Course Views', value: stats?.totalViews ?? 0, icon: '👁️', color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { label: 'Course Likes', value: stats?.totalLikes ?? 0, icon: '❤️', color: 'text-red-600', bg: 'bg-red-50' },
  ];

  const recentUsers = stats?.recentUsers || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">Platform metrics and insights</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((item) => (
          <div key={item.label} className={`rounded-2xl border border-slate-200 ${item.bg} p-5`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{item.label}</p>
              <span className="text-2xl">{item.icon}</span>
            </div>
            <p className={`mt-2 text-3xl font-bold ${item.color}`}>{Number(item.value).toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Recent Users</h2>
        </div>
        {recentUsers.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">No users yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentUsers.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm font-medium text-slate-900">{u.name}</td>
                    <td className="px-6 py-3 text-sm text-slate-500">{u.email}</td>
                    <td className="px-6 py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 capitalize">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminAnalytics;