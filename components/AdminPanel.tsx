import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

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

interface ManagedUser {
  id: number; name: string; email: string; role: string; status: string; must_change_password: number; created_at: string;
}

interface TutorCourse {
  id: number; tutor_id: number; title: string; description: string; level: string; price: number;
  category: string; status: string; tutor_name?: string; tutor_email?: string; created_at: string;
}

type Tab = 'overview' | 'users' | 'courses' | 'settings';

const StatCard: React.FC<{ label: string; value: string | number; detail?: string }> = ({ label, value, detail }) => (
  <div className="rounded-[24px] border border-white/70 bg-white/85 px-5 py-5 shadow-lg shadow-slate-200/50">
    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">{label}</p>
    <p className="mt-3 font-display text-3xl font-bold text-slate-950">{value}</p>
    {detail && <p className="mt-1 text-sm text-slate-500">{detail}</p>}
  </div>
);

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [courses, setCourses] = useState<TutorCourse[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    api.adminGetStats()
      .then(setStats)
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === 'users') api.adminGetUsers().then((d) => setUsers(d.users)).catch(() => {});
    if (tab === 'courses') api.adminGetCourses().then((d) => setCourses(d.courses)).catch(() => {});
    if (tab === 'settings') api.adminGetSettings().then((d) => setSettings(d.settings)).catch(() => {});
  }, [tab]);

  const doAction = async (userId: number, action: string, extra?: any) => {
    setActionMsg('');
    try {
      const res = await api.adminManageUser(userId, action, extra);
      setActionMsg(res.message || 'Done');
      if (res.tempPassword) setActionMsg(`Temp password: ${res.tempPassword}`);
      api.adminGetUsers().then((d) => setUsers(d.users));
    } catch (e: any) { setActionMsg(e.message); }
  };

  const doCourseAction = async (courseId: number, status: 'approved' | 'rejected') => {
    setActionMsg('');
    try {
      const res = await api.adminManageCourse(courseId, status);
      setActionMsg(res.message || 'Done');
      api.adminGetCourses().then((d) => setCourses(d.courses));
    } catch (e: any) { setActionMsg(e.message); }
  };

  const saveSetting = async (key: string, value: string) => {
    try {
      await api.adminUpdateSetting(key, value);
      setSettings((s) => ({ ...s, [key]: value }));
      setActionMsg('Setting saved.');
    } catch (e: any) { setActionMsg(e.message); }
  };

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

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'users', label: 'Users' },
    { key: 'courses', label: 'Course Approval' },
    { key: 'settings', label: 'Settings' },
  ];

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

        {/* Tabs */}
        <div className="mt-6 flex gap-2 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => { setTab(t.key); setActionMsg(''); }}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${tab === t.key ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {actionMsg && (
          <div className="mt-4 rounded-xl bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700">{actionMsg}</div>
        )}
      </section>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <>
          <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <div className="mt-4 space-y-3">
                {stats.recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-sm">
                    <div><p className="font-semibold text-slate-900">{u.name}</p><p className="text-sm text-slate-500">{u.email}</p></div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : u.role === 'teacher' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{u.role}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8 sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Recent Enrollments</p>
              <div className="mt-4 space-y-3">
                {stats.recentEnrollments.map((e, i) => (
                  <div key={i} className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-sm">
                    <div><p className="font-semibold text-slate-900">{e.user_name}</p><p className="text-sm text-slate-500">{e.course_slug}</p></div>
                    <div className="text-right"><p className="font-semibold text-emerald-600">${e.amount_paid}</p><p className="text-xs text-slate-400">{new Date(e.created_at).toLocaleDateString()}</p></div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}

      {/* USERS TAB */}
      {tab === 'users' && (
        <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">User Management</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-slate-950">All Users</h2>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-2">Name</th>
                  <th className="py-3 px-2">Email</th>
                  <th className="py-3 px-2">Role</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 px-2 font-medium text-slate-900">{u.name}</td>
                    <td className="py-3 px-2 text-slate-600">{u.email}</td>
                    <td className="py-3 px-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : u.role === 'teacher' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{u.role}</span>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.status === 'active' ? 'bg-green-100 text-green-700' : u.status === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{u.status || 'active'}</span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex flex-wrap gap-1">
                        {u.status === 'pending' && u.role === 'teacher' && (
                          <button onClick={() => doAction(u.id, 'approve_tutor')} className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700">Approve</button>
                        )}
                        {u.status !== 'suspended' && u.role !== 'admin' && (
                          <button onClick={() => doAction(u.id, 'suspend')} className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700">Suspend</button>
                        )}
                        {u.status === 'suspended' && (
                          <button onClick={() => doAction(u.id, 'activate')} className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700">Activate</button>
                        )}
                        <button onClick={() => doAction(u.id, 'reset_password')} className="rounded bg-amber-600 px-2 py-1 text-xs text-white hover:bg-amber-700">Reset PW</button>
                        {u.role === 'student' && (
                          <button onClick={() => doAction(u.id, 'change_role', { role: 'teacher' })} className="rounded bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-700">Make Tutor</button>
                        )}
                        {u.role === 'teacher' && u.status === 'active' && (
                          <button onClick={() => doAction(u.id, 'change_role', { role: 'student' })} className="rounded bg-slate-600 px-2 py-1 text-xs text-white hover:bg-slate-700">Demote</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* COURSE APPROVAL TAB */}
      {tab === 'courses' && (
        <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Course Approval</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-slate-950">Tutor-Submitted Courses</h2>
          <div className="mt-6 space-y-4">
            {courses.length === 0 && <p className="text-sm text-slate-400">No courses submitted yet.</p>}
            {courses.map((c) => (
              <div key={c.id} className="rounded-2xl border border-white/70 bg-white/85 px-6 py-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{c.title}</h3>
                    <p className="text-sm text-slate-500 mt-1">{c.description}</p>
                    <div className="mt-2 flex gap-3 text-xs text-slate-500">
                      <span>Level: {c.level}</span>
                      <span>Price: ${c.price}</span>
                      <span>Category: {c.category}</span>
                      {c.tutor_name && <span>By: {c.tutor_name}</span>}
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${c.status === 'approved' ? 'bg-green-100 text-green-700' : c.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{c.status}</span>
                </div>
                {c.status === 'pending' && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => doCourseAction(c.id, 'approved')} className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700">Approve</button>
                    <button onClick={() => doCourseAction(c.id, 'rejected')} className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SETTINGS TAB */}
      {tab === 'settings' && (
        <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Platform Settings</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-slate-950">Revenue Split & Configuration</h2>
          <div className="mt-6 space-y-6">
            <div className="rounded-2xl border border-white/70 bg-white/85 px-6 py-5 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-4">Revenue Split</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Tutor Percentage (%)</label>
                  <input
                    type="number" min="0" max="100"
                    value={settings.tutor_percentage || '70'}
                    onChange={(e) => setSettings((s) => ({ ...s, tutor_percentage: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Academy Percentage (%)</label>
                  <input
                    type="number" min="0" max="100"
                    value={settings.academy_percentage || '30'}
                    onChange={(e) => setSettings((s) => ({ ...s, academy_percentage: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  saveSetting('tutor_percentage', settings.tutor_percentage || '70');
                  saveSetting('academy_percentage', settings.academy_percentage || '30');
                }}
                className="mt-4 rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                Save Revenue Split
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default AdminPanel;
