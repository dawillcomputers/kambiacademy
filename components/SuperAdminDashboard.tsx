import React, { useState, useEffect } from 'react';
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

const KpiCard: React.FC<{ value: number; label: string; icon: string; prefix?: string }> = ({ value, label, icon, prefix }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    const step = Math.ceil(end / 40) || 1;
    const id = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(id); } else { setCount(start); }
    }, 20);
    return () => clearInterval(id);
  }, [value]);

  return (
    <div className="rounded-2xl bg-[#111B2E] border border-white/[0.06] p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#6B7A99]">{label}</p>
          <p className="text-2xl font-bold text-[#EAF0FF] mt-1">{prefix}{count.toLocaleString()}</p>
        </div>
        <div className="text-3xl opacity-60">{icon}</div>
      </div>
    </div>
  );
};

const SuperAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await api.adminGetStats();
        setStats(response);
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
    
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#EAF0FF]">Dashboard Overview</h1>
        <p className="text-[#6B7A99] mt-1 text-sm">Welcome back, {user?.name}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#6366F1] border-t-transparent"></div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard label="Total Users" value={stats?.totalUsers || 0} icon="👥" />
            <KpiCard label="Enrollments" value={stats?.totalEnrollments || 0} icon="🎓" />
            <KpiCard label="Revenue" value={stats?.totalRevenue || 0} icon="💰" prefix="₦" />
            <KpiCard label="Contacts" value={stats?.totalContacts || 0} icon="📩" />
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Users */}
            <div className="rounded-2xl bg-[#111B2E] border border-white/[0.06] p-5">
              <h3 className="text-sm font-semibold text-[#EAF0FF] mb-4">Recent Users</h3>
              <div className="space-y-2">
                {stats?.recentUsers?.slice(0, 5).map((u) => (
                  <div key={u.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#16233A]/60">
                    <div className="w-7 h-7 rounded-full bg-[#6366F1]/25 flex items-center justify-center text-xs font-bold text-[#EAF0FF]">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#EAF0FF] truncate">{u.name}</p>
                      <p className="text-xs text-[#6B7A99] truncate">{u.email}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#16233A] text-[#A9B4CC] capitalize font-medium">
                      {u.role}
                    </span>
                  </div>
                )) || <p className="text-[#6B7A99] text-sm">No recent users</p>}
              </div>
            </div>

            {/* Recent Enrollments */}
            <div className="rounded-2xl bg-[#111B2E] border border-white/[0.06] p-5">
              <h3 className="text-sm font-semibold text-[#EAF0FF] mb-4">Recent Enrollments</h3>
              <div className="space-y-2">
                {stats?.recentEnrollments?.slice(0, 5).map((e, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#16233A]/60">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs">📚</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#EAF0FF] truncate">{e.course_slug}</p>
                      <p className="text-xs text-[#6B7A99] truncate">{e.user_name}</p>
                    </div>
                    <span className="text-xs text-[#A9B4CC] font-medium">₦{e.amount_paid}</span>
                  </div>
                )) || <p className="text-[#6B7A99] text-sm">No recent enrollments</p>}
              </div>
            </div>
          </div>

          {/* Top Courses + Top Teachers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="rounded-2xl bg-[#111B2E] border border-white/[0.06] p-5">
              <h3 className="text-sm font-semibold text-[#EAF0FF] mb-4">Top Courses</h3>
              <div className="space-y-2">
                {stats?.topCourses?.slice(0, 5).map((c, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#16233A]/60">
                    <span className="text-sm text-[#EAF0FF] truncate">{c.course_slug}</span>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs text-[#A9B4CC]">{c.enrollment_count} enrolled</span>
                      <span className="text-xs text-emerald-400 font-medium">₦{c.total_revenue}</span>
                    </div>
                  </div>
                )) || <p className="text-[#6B7A99] text-sm">No data</p>}
              </div>
            </div>

            <div className="rounded-2xl bg-[#111B2E] border border-white/[0.06] p-5">
              <h3 className="text-sm font-semibold text-[#EAF0FF] mb-4">Top Teachers</h3>
              <div className="space-y-2">
                {stats?.topTeachers?.slice(0, 5).map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#16233A]/60">
                    <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-300">
                      {t.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#EAF0FF] truncate">{t.name}</p>
                      <p className="text-xs text-[#6B7A99]">{t.course_count} courses</p>
                    </div>
                    <span className="text-xs text-emerald-400 font-medium">₦{t.total_revenue}</span>
                  </div>
                )) || <p className="text-[#6B7A99] text-sm">No data</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SuperAdminDashboard;