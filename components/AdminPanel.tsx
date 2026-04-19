import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { Complaint } from '../types';

interface AdminStats {
  totalUsers: number;
  totalEnrollments: number;
  totalRevenue: number;
  pendingPaymentsDueCount: number;
  pendingPaymentsDueAmount: number;
  totalContacts: number;
  totalTutorApps: number;
  totalLikes: number;
  totalViews: number;
  recentUsers: Array<{ id: number; name: string; email: string; role: string; created_at: string }>;
  recentEnrollments: Array<{ course_slug: string; amount_paid: number; created_at: string; user_name: string; user_email: string }>;
  topCourses: Array<{ course_slug: string; enrollment_count: number; total_revenue: number }>;
  topTeachers: Array<{ id: number; name: string; email: string; enrollment_count: number; total_revenue: number; course_count: number }>;
}

interface ManagedUser {
  id: number; name: string; email: string; role: string; status: string; must_change_password: number; created_at: string;
}

interface TutorCourse {
  id: number; tutor_id: number; title: string; description: string; level: string; price: number;
  category: string; status: string; tutor_name?: string; tutor_email?: string; created_at: string;
}

type Tab = 'overview' | 'users' | 'courses' | 'complaints' | 'settings' | 'audit-log' | 'subscription';

interface AuditLogEntry {
  id: number; user_name: string; changed_by_name: string; old_role: string; new_role: string; reason: string; created_at: string;
}

type AdminSubscriptionType = 'platform' | 'storage' | 'liveClass';

interface AdminDueItem {
  key: AdminSubscriptionType;
  label: string;
  amount: number;
  icon: string;
  tone: string;
  planType: 'monthly' | 'yearly';
}

const subscriptionPresentation: Record<AdminSubscriptionType, { label: string; icon: string; monthly: number; yearly: number }> = {
  platform: { label: 'Platform Access', icon: '🧭', monthly: 4, yearly: 44 },
  storage: { label: 'Cloudflare Storage', icon: '☁️', monthly: 2, yearly: 24 },
  liveClass: { label: 'Live Class Access', icon: '🎥', monthly: 2.2, yearly: 26.4 },
};

const statToneStyles: Record<string, string> = {
  indigo: 'from-indigo-100 via-indigo-50 to-white border-indigo-200 text-indigo-950',
  amber: 'from-amber-100 via-orange-50 to-white border-amber-200 text-amber-950',
  emerald: 'from-emerald-100 via-teal-50 to-white border-emerald-200 text-emerald-950',
  sky: 'from-sky-100 via-cyan-50 to-white border-sky-200 text-sky-950',
  rose: 'from-rose-100 via-pink-50 to-white border-rose-200 text-rose-950',
  violet: 'from-violet-100 via-fuchsia-50 to-white border-violet-200 text-violet-950',
};

const StatCard: React.FC<{ label: string; value: string | number; detail?: string; icon: string; tone: keyof typeof statToneStyles }> = ({ label, value, detail, icon, tone }) => (
  <div className={`rounded-[24px] border bg-gradient-to-br px-5 py-5 shadow-lg shadow-slate-200/50 ${statToneStyles[tone]}`}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] opacity-70">{label}</p>
        <p className="mt-3 font-display text-3xl font-bold">{value}</p>
      </div>
      <div className="text-3xl">{icon}</div>
    </div>
    {detail && <p className="mt-4 text-sm opacity-75">{detail}</p>}
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

  // Subscription state
  const [subscriptions, setSubscriptions] = useState<any>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [selectedSubscriptionType, setSelectedSubscriptionType] = useState<AdminSubscriptionType>('platform');
  const [selectedPlans, setSelectedPlans] = useState<Record<AdminSubscriptionType, 'monthly' | 'yearly'>>({
    platform: 'monthly',
    storage: 'monthly',
    liveClass: 'monthly',
  });
  const [selectedBundleItems, setSelectedBundleItems] = useState<Partial<Record<AdminSubscriptionType, boolean>>>({});
  const [subscriptionHistory, setSubscriptionHistory] = useState<any[]>([]);

  // Role change modal
  const [roleChangeTarget, setRoleChangeTarget] = useState<ManagedUser | null>(null);
  const [roleChangeNewRole, setRoleChangeNewRole] = useState('');
  const [roleChangeReason, setRoleChangeReason] = useState('');

  // Audit log
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    api.adminGetStats()
      .then(setStats)
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
    api.getTeacherSubscription()
      .then((d) => setSubscriptions(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'users') api.adminGetUsers().then((d) => setUsers(d.users)).catch(() => {});
    if (tab === 'courses') api.adminGetCourses().then((d) => setCourses(d.courses)).catch(() => {});
    if (tab === 'settings') api.adminGetSettings().then((d) => setSettings(d.settings)).catch(() => {});
    if (tab === 'audit-log') api.getAuditLog().then((d) => setAuditLog(d.log)).catch(() => {});
    if (tab === 'complaints') api.adminGetComplaints().then((d) => setComplaints(d.complaints)).catch(() => {});
    if (tab === 'subscription') {
      setSubscriptionLoading(true);
      api.getTeacherSubscription()
        .then((d) => setSubscriptions(d))
        .catch((error) => setActionMsg(error.message || String(error)))
        .finally(() => setSubscriptionLoading(false));
    }
  }, [tab]);

  // Separate effect for subscription history to avoid dependency issues
  useEffect(() => {
    if (tab === 'subscription') {
      api.getTeacherSubscriptionHistory(selectedSubscriptionType)
        .then((d) => setSubscriptionHistory(d.payments || []))
        .catch(() => {});
    }
  }, [tab, selectedSubscriptionType]);

  const resolveSubscriptionState = (type: AdminSubscriptionType) => {
    if (type === 'platform') {
      return subscriptions?.platform;
    }

    if (type === 'storage') {
      return subscriptions?.storage;
    }

    return subscriptions?.liveClass;
  };

  const dueSubscriptionItems = useMemo<AdminDueItem[]>(() => {
    if (!subscriptions) {
      return [];
    }

    const items: AdminDueItem[] = [];
    (['platform', 'storage', 'liveClass'] as AdminSubscriptionType[]).forEach((type) => {
      const state = resolveSubscriptionState(type);
      if (!state?.requiresSubscription || state?.hasActiveSubscription) {
        return;
      }

      const planType = selectedPlans[type];
      const meta = subscriptionPresentation[type];
      items.push({
        key: type,
        label: meta.label,
        amount: state?.fees?.[planType] ?? meta[planType],
        icon: meta.icon,
        tone: type === 'platform' ? 'amber' : type === 'storage' ? 'sky' : 'rose',
        planType,
      });
    });

    return items;
  }, [selectedPlans, subscriptions]);

  const selectedDueItems = dueSubscriptionItems.filter((item) => selectedBundleItems[item.key] ?? true);
  const selectedDueAmount = selectedDueItems.reduce((sum, item) => sum + item.amount, 0);

  const doAction = async (userId: number, action: string, extra?: any) => {
    setActionMsg('');
    try {
      const res = await api.adminManageUser(userId, action, extra);
      setActionMsg(res.message || 'Done');
      if (res.tempPassword) setActionMsg(`Temp password: ${res.tempPassword}`);
      api.adminGetUsers().then((d) => setUsers(d.users));
    } catch (e: any) { setActionMsg(e.message); }
  };

  const handleRoleChange = async () => {
    if (!roleChangeTarget || !roleChangeNewRole || !roleChangeReason.trim()) return;
    await doAction(roleChangeTarget.id, 'change_role', { role: roleChangeNewRole, reason: roleChangeReason });
    setRoleChangeTarget(null);
    setRoleChangeNewRole('');
    setRoleChangeReason('');
  };

  const doCourseAction = async (courseId: number, status: 'approved' | 'rejected') => {
    setActionMsg('');
    try {
      const res = await api.adminManageCourse(courseId, status);
      setActionMsg(res.message || 'Done');
      api.adminGetCourses().then((d) => setCourses(d.courses));
    } catch (e: any) { setActionMsg(e.message); }
  };

  const handleComplaintAction = async (complaintId: string, status: 'reviewed' | 'resolved') => {
    setActionMsg('');
    try {
      await api.adminUpdateComplaint(complaintId, status, status === 'resolved' ? 'Complaint resolved by admin.' : 'Marked for further review.');
      setActionMsg('Complaint status updated.');
      api.adminGetComplaints().then((d) => setComplaints(d.complaints));
    } catch (e: any) {
      setActionMsg(e.message);
    }
  };

  const saveSetting = async (key: string, value: string) => {
    try {
      await api.adminUpdateSetting(key, value);
      setSettings((s) => ({ ...s, [key]: value }));
      setActionMsg('Setting saved.');
    } catch (e: any) { setActionMsg(e.message); }
  };

  const handleSubscribe = async (overrideType?: AdminSubscriptionType) => {
    setActionMsg('');
    const effectiveType = overrideType || selectedSubscriptionType;
    try {
      const res = await api.createTeacherSubscription(selectedPlans[effectiveType], effectiveType);
      setActionMsg(`${subscriptionPresentation[effectiveType].label} checkout created successfully. Redirecting to Flutterwave Live...`);
      if (res.payment_url) {
        window.location.href = res.payment_url;
      }
    } catch (e: any) {
      setActionMsg(e.message || 'Failed to create subscription');
    }
  };

  const handleBundleSubscribe = async () => {
    if (!selectedDueItems.length) {
      setActionMsg('Select at least one due item to continue.');
      return;
    }

    setActionMsg('');
    try {
      const response = await api.createTeacherSubscriptionBundle(selectedDueItems.map((item) => ({
        subscriptionType: item.key,
        planType: item.planType,
      })));
      setActionMsg(`Combined checkout created for ${selectedDueItems.length} selected item${selectedDueItems.length === 1 ? '' : 's'}. Redirecting to Flutterwave Live...`);
      if (response.payment_url) {
        window.location.href = response.payment_url;
      }
    } catch (error: any) {
      setActionMsg(error.message || 'Failed to create combined checkout.');
    }
  };

  const handleChangePassword = async () => {
    setActionMsg('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setActionMsg('All fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setActionMsg('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setActionMsg('Password must be at least 8 characters.');
      return;
    }

    setChangingPassword(true);
    try {
      const result = await api.adminChangePassword(currentPassword, newPassword);
      setActionMsg('Password changed successfully! Logging in...');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Auto-login with new auth token
      if (result.token) {
        localStorage.setItem('auth_token', result.token);
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (e: any) {
      setActionMsg(e.message || 'Failed to change password.');
    } finally {
      setChangingPassword(false);
    }
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
    { key: 'complaints', label: 'Complaints' },
    { key: 'audit-log', label: 'Audit Log' },
    { key: 'settings', label: 'Settings' },
    { key: 'subscription', label: 'Subscription' },
  ];

  const selectedSubscriptionState = resolveSubscriptionState(selectedSubscriptionType);
  const selectedSubscriptionMeta = subscriptionPresentation[selectedSubscriptionType];

  return (
    <div className="flex min-h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 shadow-lg overflow-y-auto z-50">
        <div className="p-6 border-b border-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-500">Admin Dashboard</p>
          <h1 className="mt-2 font-display text-xl font-bold text-slate-950">Welcome back, {user?.name}</h1>
        </div>
        
        <nav className="p-4 space-y-2">
          {tabs.map((t) => (
            <button 
              key={t.key} 
              onClick={() => { setTab(t.key); setActionMsg(''); }}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition ${
                tab === t.key 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}>
              {t.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <Link to="/courses" className="inline-flex items-center justify-center w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
            View site &rarr;
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64 p-8 overflow-y-auto">
        {actionMsg && (
          <div className="mb-6 rounded-xl bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700">{actionMsg}</div>
        )}

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <>
          <section className="mb-8 rounded-[32px] border border-white/70 bg-white px-6 py-6 shadow-lg">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total Users" value={stats.totalUsers} icon="👥" tone="indigo" detail="All active and pending users in the system" />
              <StatCard label="Enrollments" value={stats.totalEnrollments} icon="🎓" tone="sky" detail="Student enrollments recorded across courses" />
              <StatCard label="Revenue" value={`$${stats.totalRevenue.toLocaleString()}`} icon="💵" tone="emerald" detail="Total enrollment revenue recorded so far" />
              <StatCard label="Page Views" value={stats.totalViews.toLocaleString()} icon="📈" tone="violet" detail="Aggregated course page interest and traffic" />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Course Likes" value={stats.totalLikes} icon="❤️" tone="rose" detail="Learner likes across tracked course pages" />
              <StatCard label="Contact Forms" value={stats.totalContacts} icon="✉️" tone="amber" detail="Inbound contact forms submitted by visitors" />
              <StatCard label="Tutor Applications" value={stats.totalTutorApps} icon="🧑‍🏫" tone="sky" detail="Applications waiting in the tutor funnel" />
              <StatCard label="Payments Due" value={`$${stats.pendingPaymentsDueAmount.toLocaleString()}`} icon="💳" tone="emerald" detail={`${stats.pendingPaymentsDueCount} pending subscription payment${stats.pendingPaymentsDueCount === 1 ? '' : 's'} awaiting completion`} />
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-[32px] border border-white/70 bg-white px-6 py-8 sm:px-8 shadow-lg">
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

            <section className="rounded-[32px] border border-white/70 bg-white px-6 py-8 sm:px-8 shadow-lg">
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

          {/* TOP SELLING COURSES & TEACHERS */}
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8 sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Highest Selling Courses</p>
              <div className="mt-4 space-y-3">
                {stats.topCourses.length === 0 ? (
                  <p className="text-sm text-slate-400">No course sales yet.</p>
                ) : stats.topCourses.map((c, i) => (
                  <div key={c.course_slug} className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900 capitalize">{c.course_slug.replace(/-/g, ' ')}</p>
                        <p className="text-xs text-slate-400">{c.enrollment_count} enrollments</p>
                      </div>
                    </div>
                    <p className="font-bold text-emerald-600">${c.total_revenue}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8 sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Top Earning Teachers</p>
              <div className="mt-4 space-y-3">
                {stats.topTeachers.length === 0 ? (
                  <p className="text-sm text-slate-400">No teacher earnings yet.</p>
                ) : stats.topTeachers.map((t, i) => (
                  <div key={t.id} className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">{t.name}</p>
                        <p className="text-xs text-slate-400">{t.course_count} courses • {t.enrollment_count} students</p>
                      </div>
                    </div>
                    <p className="font-bold text-emerald-600">${t.total_revenue}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}

      {/* USERS TAB */}
      {tab === 'users' && (
        <section className="rounded-[32px] border border-white/70 bg-white px-6 py-8 shadow-lg">
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
                        {u.role !== 'admin' && (
                          <button onClick={() => { setRoleChangeTarget(u); setRoleChangeNewRole(u.role === 'student' ? 'teacher' : 'student'); setRoleChangeReason(''); }}
                            className="rounded bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-700">Change Role</button>
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
        <section className="rounded-[32px] border border-white/70 bg-white px-6 py-8 shadow-lg">
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

      {/* COMPLAINTS TAB */}
      {tab === 'complaints' && (
        <section className="rounded-[32px] border border-white/70 bg-white px-6 py-8 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Student Complaints</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-slate-950">Review and Resolve Complaints</h2>
          <div className="mt-6 overflow-x-auto">
            {complaints.length === 0 ? (
              <p className="text-sm text-slate-400">No complaints have been submitted yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-2">Student</th>
                    <th className="py-3 px-2">Teacher</th>
                    <th className="py-3 px-2">Course</th>
                    <th className="py-3 px-2">Complaint</th>
                    <th className="py-3 px-2">AI Recommendation</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {complaints.map((complaint) => (
                    <tr key={complaint.id} className="bg-white">
                      <td className="py-3 px-2 align-top text-slate-900">{complaint.student_name || 'Student'}</td>
                      <td className="py-3 px-2 align-top text-slate-900">{complaint.teacher_name || 'Teacher'}</td>
                      <td className="py-3 px-2 align-top text-slate-900">{complaint.course_slug || 'N/A'}</td>
                      <td className="py-3 px-2 align-top text-slate-500 max-w-[24rem] whitespace-pre-wrap">{complaint.complaint_text}</td>
                      <td className="py-3 px-2 align-top text-slate-500 max-w-[24rem] whitespace-pre-wrap">{complaint.ai_recommendation || 'No recommendation yet.'}</td>
                      <td className="py-3 px-2 align-top">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${complaint.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : complaint.status === 'reviewed' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                          {complaint.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 align-top space-y-2">
                        <button onClick={() => handleComplaintAction(complaint.id, 'reviewed')} className="block rounded bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700">Mark Reviewed</button>
                        <button onClick={() => handleComplaintAction(complaint.id, 'resolved')} className="block rounded bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700">Resolve</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {/* SETTINGS TAB */}
      {tab === 'settings' && (
        <section className="rounded-[32px] border border-white/70 bg-white px-6 py-8 shadow-lg">
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
            <div className="rounded-2xl border border-white/70 bg-white/85 px-6 py-5 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-4">Student Feature Access</h3>
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <input
                  type="checkbox"
                  checked={settings.student_materials_enabled === 'true'}
                  onChange={(e) => setSettings((s) => ({ ...s, student_materials_enabled: e.target.checked ? 'true' : 'false' }))}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <p className="font-semibold text-slate-900">Allow student materials</p>
                  <p className="text-sm text-slate-500">Show the student materials page when enabled.</p>
                </div>
              </label>
              <button
                onClick={() => saveSetting('student_materials_enabled', settings.student_materials_enabled === 'true' ? 'false' : 'true')}
                className="mt-4 rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                Save feature setting
              </button>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/85 px-6 py-5 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-4">Change Password</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900"
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900"
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900"
                    placeholder="Confirm new password"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (!currentPassword || !newPassword || !confirmPassword) {
                      setActionMsg('All password fields are required.');
                      return;
                    }
                    if (newPassword !== confirmPassword) {
                      setActionMsg('New passwords do not match.');
                      return;
                    }
                    if (newPassword.length < 8) {
                      setActionMsg('Password must be at least 8 characters.');
                      return;
                    }
                    setChangingPassword(true);
                    setActionMsg('');
                    try {
                      const response = await api.changePassword(currentPassword, newPassword);
                      // Store new token for auto-login
                      localStorage.setItem('auth_token', response.token);
                      setActionMsg('Password changed successfully. Logging you back in...');
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      // Reload page after brief delay to show success message
                      setTimeout(() => window.location.reload(), 1500);
                    } catch (error: any) {
                      setActionMsg(error.message || 'Failed to change password.');
                    } finally {
                      setChangingPassword(false);
                    }
                  }}
                  disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                  className="rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* AUDIT LOG TAB */}
      {tab === 'audit-log' && (
        <section className="rounded-[32px] border border-white/70 bg-white px-6 py-8 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Role Changes</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-slate-950">Audit Log</h2>
          <div className="mt-6 overflow-x-auto">
            {auditLog.length === 0 ? (
              <p className="text-sm text-slate-400">No role changes recorded yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-2">User</th>
                    <th className="py-3 px-2">Changed By</th>
                    <th className="py-3 px-2">Old Role</th>
                    <th className="py-3 px-2">New Role</th>
                    <th className="py-3 px-2">Reason</th>
                    <th className="py-3 px-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLog.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="py-3 px-2 font-medium text-slate-900">{entry.user_name}</td>
                      <td className="py-3 px-2 text-slate-600">{entry.changed_by_name}</td>
                      <td className="py-3 px-2">
                        <span className="rounded-full px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-600">{entry.old_role}</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${entry.new_role === 'teacher' ? 'bg-amber-100 text-amber-700' : entry.new_role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>{entry.new_role}</span>
                      </td>
                      <td className="py-3 px-2 text-slate-600 max-w-xs truncate">{entry.reason || '-'}</td>
                      <td className="py-3 px-2 text-slate-400">{new Date(entry.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {/* SUBSCRIPTION TAB */}
      {tab === 'subscription' && (
        <section className="rounded-[32px] border border-white/70 bg-white px-6 py-8 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Subscription Management</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-slate-950">Admin Subscription Status</h2>

          {subscriptionLoading ? (
            <div className="mt-6 flex items-center justify-center py-8">
              <div className="text-sm text-slate-500">Loading subscription status...</div>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {dueSubscriptionItems.length > 0 && (
                <div className="rounded-2xl border border-white/70 bg-white/85 px-6 py-5 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">Payments Due</h3>
                      <p className="mt-1 text-sm text-slate-500">Choose 1, 2, or all 3 active dues and clear them in a single Flutterwave Live checkout.</p>
                    </div>
                    <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                      Selected total: ${selectedDueAmount.toFixed(2)}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-3">
                    {dueSubscriptionItems.map((item) => (
                      <div key={item.key} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                        <label className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
                          <input
                            type="checkbox"
                            checked={selectedBundleItems[item.key] ?? true}
                            onChange={(event) => setSelectedBundleItems((current) => ({ ...current, [item.key]: event.target.checked }))}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                          />
                          Include
                        </label>
                        <div className="mt-4 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-2xl">{item.icon}</p>
                            <h4 className="mt-2 font-semibold text-slate-900">{item.label}</h4>
                            <p className="mt-2 text-2xl font-bold text-slate-950">${item.amount.toFixed(2)}</p>
                          </div>
                          <select
                            value={selectedPlans[item.key]}
                            onChange={(event) => setSelectedPlans((current) => ({
                              ...current,
                              [item.key]: event.target.value as 'monthly' | 'yearly',
                            }))}
                            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                          >
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                          </select>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedSubscriptionType(item.key);
                            void handleSubscribe(item.key);
                          }}
                          className="mt-4 w-full rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                          Pay this one
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <button
                      onClick={() => setSelectedBundleItems({ platform: true, storage: true, liveClass: true })}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Select all due items
                    </button>
                    <button
                      onClick={() => { void handleBundleSubscribe(); }}
                      disabled={!selectedDueItems.length}
                      className="rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Pay selected items together
                    </button>
                  </div>
                </div>
              )}

              {/* Subscription Type Selector */}
              <div className="rounded-2xl border border-white/70 bg-white/85 px-6 py-5 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-4">Subscription Type</h3>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => setSelectedSubscriptionType('platform')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      selectedSubscriptionType === 'platform'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Platform Access ($4/month)
                  </button>
                  <button
                    onClick={() => setSelectedSubscriptionType('storage')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      selectedSubscriptionType === 'storage'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Cloudflare Storage ($2/month)
                  </button>
                  <button
                    onClick={() => setSelectedSubscriptionType('liveClass')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      selectedSubscriptionType === 'liveClass'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Live Class Access ($2.20/month)
                  </button>
                </div>
              </div>

              {/* Current Subscription Status */}
              <div className="rounded-2xl border border-white/70 bg-white/85 px-6 py-5 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-4">
                  Current {selectedSubscriptionMeta.label} Subscription
                </h3>
                {selectedSubscriptionState?.subscription ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Status:</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        selectedSubscriptionState.subscription.status === 'active' ? 'bg-green-100 text-green-700' :
                        selectedSubscriptionState.subscription.status === 'expired' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {selectedSubscriptionState.subscription.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Plan:</span>
                      <span className="font-medium text-slate-900">
                        {selectedSubscriptionState.subscription.planType}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Expires:</span>
                      <span className="font-medium text-slate-900">
                        {new Date(selectedSubscriptionState.subscription.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Payment Method:</span>
                      <span className="font-medium text-slate-900">
                        {selectedSubscriptionState.subscription.paymentGateway}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-slate-500 mb-4">
                      No active {selectedSubscriptionMeta.label.toLowerCase()} subscription found
                    </p>
                    {selectedSubscriptionState?.requiresSubscription && (
                      <button
                        onClick={() => {
                          setSelectedPlans((current) => ({ ...current, [selectedSubscriptionType]: 'monthly' }));
                          void handleSubscribe();
                        }}
                        className="rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                        Subscribe Now
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Subscription Plans */}
              <div className="rounded-2xl border border-white/70 bg-white/85 px-6 py-5 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-4">Available Plans</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <h4 className="font-semibold text-slate-900">Monthly Plan</h4>
                    <p className="text-2xl font-bold text-indigo-600 mt-1">
                      ${selectedSubscriptionState?.fees?.monthly ?? selectedSubscriptionMeta.monthly}
                      <span className="text-sm font-normal text-slate-500">/month</span>
                    </p>
                    <button
                      onClick={() => {
                        setSelectedPlans((current) => ({ ...current, [selectedSubscriptionType]: 'monthly' }));
                        void handleSubscribe();
                      }}
                      className="mt-3 w-full rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                      Subscribe Monthly
                    </button>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <h4 className="font-semibold text-slate-900">Yearly Plan</h4>
                    <p className="text-2xl font-bold text-indigo-600 mt-1">
                      ${selectedSubscriptionState?.fees?.yearly ?? selectedSubscriptionMeta.yearly}
                      <span className="text-sm font-normal text-slate-500">/year</span>
                    </p>
                    <button
                      onClick={() => {
                        setSelectedPlans((current) => ({ ...current, [selectedSubscriptionType]: 'yearly' }));
                        void handleSubscribe();
                      }}
                      className="mt-3 w-full rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                      Subscribe Yearly
                    </button>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div className="rounded-2xl border border-white/70 bg-white/85 px-6 py-5 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-4">Payment History</h3>
                {subscriptionHistory.length === 0 ? (
                  <p className="text-sm text-slate-400">No payment history available.</p>
                ) : (
                  <div className="space-y-3">
                    {subscriptionHistory.map((payment, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900">{payment.planType} Plan</p>
                          <p className="text-sm text-slate-500">{new Date(payment.createdAt || payment.paymentDate).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-emerald-600">${payment.amount}</p>
                          <p className="text-xs text-slate-400">{payment.paymentGateway}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ROLE CHANGE MODAL */}
      {roleChangeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-display text-xl font-bold text-slate-950 mb-1">Change User Role</h3>
            <p className="text-sm text-slate-500 mb-4">
              Changing role for <span className="font-semibold text-slate-900">{roleChangeTarget.name}</span> ({roleChangeTarget.email})
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Current Role</label>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${roleChangeTarget.role === 'teacher' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                  {roleChangeTarget.role}
                </span>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">New Role</label>
                <select value={roleChangeNewRole} onChange={(e) => setRoleChangeNewRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900">
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Reason (required) *</label>
                <textarea value={roleChangeReason} onChange={(e) => setRoleChangeReason(e.target.value)}
                  rows={3} className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900"
                  placeholder="Explain why you are changing this user's role..." required />
              </div>
              <div className="flex gap-3">
                <button onClick={handleRoleChange} disabled={!roleChangeReason.trim()}
                  className="rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                  Confirm Change
                </button>
                <button onClick={() => setRoleChangeTarget(null)}
                  className="rounded-full border border-slate-200 px-6 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default AdminPanel;
