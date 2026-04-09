import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';

interface AdminStats {
  totalUsers: number;
  totalEnrollments: number;
  totalRevenue: number;
  totalContacts: number;
  totalTutorApps: number;
  totalLikes: number;
  totalViews: number;
  recentUsers: Array<{ id: number; name: string; email: string; role: string; created_at: string }>;
  recentEnrollments: Array<{ course_slug: string; amount_paid: number; created_at: string; user_name: string; user_email: string }>;
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const StatCard: React.FC<{ label: string; value: string | number; detail?: string }> = ({ label, value, detail }) => (
  <div className="rounded-[24px] border border-white/70 bg-white/85 px-5 py-5 shadow-lg shadow-slate-200/50">
    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">{label}</p>
    <p className="mt-3 font-display text-3xl font-bold text-slate-950">{value}</p>
    {detail && <p className="mt-1 text-sm text-slate-500">{detail}</p>}
  </div>
);

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    fetch(`${apiBaseUrl}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to load');
        return res.json();
      })
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="section-shell surface-ring rounded-[32px] border border-white/60 px-6 py-16 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
        <p className="mt-4 text-sm font-semibold text-slate-600">Loading admin dashboard...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="section-shell surface-ring rounded-[32px] border border-rose-100 bg-white/90 px-6 py-12 text-center">
        <p className="text-sm font-semibold text-rose-500">{error || 'Failed to load dashboard data.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8 sm:px-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-500">Admin Dashboard</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-slate-950">Welcome back, {user?.name}</h1>
          </div>
          <Link to="/courses" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
            View site &rarr;
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Users" value={stats.totalUsers} />
          <StatCard label="Enrollments" value={stats.totalEnrollments} />
          <StatCard label="Revenue" value={`$${stats.totalRevenue.toLocaleString()}`} />
          <StatCard label="Page Views" value={stats.totalViews.toLocaleString()} />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <StatCard label="Course Likes" value={stats.totalLikes} />
          <StatCard label="Contact Forms" value={stats.totalContacts} />
          <StatCard label="Tutor Applications" value={stats.totalTutorApps} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Recent Users</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-slate-950">Newest registrations</h2>

          <div className="mt-6 space-y-3">
            {stats.recentUsers.length > 0 ? stats.recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-sm">
                <div>
                  <p className="font-semibold text-slate-900">{u.name}</p>
                  <p className="text-sm text-slate-500">{u.email}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : u.role === 'teacher' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                    {u.role}
                  </span>
                  <p className="mt-1 text-xs text-slate-400">{new Date(u.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-slate-400">No users yet.</p>
            )}
          </div>
        </section>

        <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Recent Enrollments</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-slate-950">Latest course sign-ups</h2>

          <div className="mt-6 space-y-3">
            {stats.recentEnrollments.length > 0 ? stats.recentEnrollments.map((e, i) => (
              <div key={i} className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-sm">
                <div>
                  <p className="font-semibold text-slate-900">{e.user_name}</p>
                  <p className="text-sm text-slate-500">{e.course_slug}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-emerald-600">${e.amount_paid}</p>
                  <p className="mt-1 text-xs text-slate-400">{new Date(e.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-slate-400">No enrollments yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminPanel;
