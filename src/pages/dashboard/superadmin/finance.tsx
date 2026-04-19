import React, { useState, useEffect } from 'react';
import { api } from '../../../../lib/api';

const SuperAdminFinance: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await api.adminGetStats();
        setStats(response);
      } catch (error) {
        console.error('Failed to load finance data:', error);
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

  const totalRevenue = stats?.totalRevenue ?? 0;
  const pendingCount = stats?.pendingPaymentsDueCount ?? 0;
  const pendingAmount = stats?.pendingPaymentsDueAmount ?? 0;
  const totalEnrollments = stats?.totalEnrollments ?? 0;

  const cards = [
    { label: 'Total Revenue', value: `$${Number(totalRevenue).toLocaleString()}`, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Total Enrollments', value: String(totalEnrollments), color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Pending Payments', value: `$${Number(pendingAmount).toLocaleString()}`, sub: `${pendingCount} pending`, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Total Users', value: String(stats?.totalUsers ?? 0), color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  const recentEnrollments = stats?.recentEnrollments || [];
  const topCourses = stats?.topCourses || [];
  const topTeachers = stats?.topTeachers || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Finance</h1>
        <p className="mt-1 text-sm text-slate-500">Revenue tracking and financial overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className={`rounded-2xl border border-slate-200 ${card.bg} p-5`}>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{card.label}</p>
            <p className={`mt-2 text-2xl font-bold ${card.color}`}>{card.value}</p>
            {card.sub && <p className="mt-1 text-xs text-slate-500">{card.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Top Earning Courses</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {topCourses.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">No course data yet</div>
            ) : topCourses.map((course: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{course.course_slug}</p>
                  <p className="text-xs text-slate-500">{course.enrollment_count} enrollments</p>
                </div>
                <span className="text-sm font-bold text-green-600">${Number(course.total_revenue).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Top Teachers by Revenue</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {topTeachers.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">No teacher data yet</div>
            ) : topTeachers.map((teacher: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{teacher.name}</p>
                  <p className="text-xs text-slate-500">{teacher.course_count} courses · {teacher.enrollment_count} enrollments</p>
                </div>
                <span className="text-sm font-bold text-green-600">${Number(teacher.total_revenue).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Recent Enrollments</h2>
        </div>
        {recentEnrollments.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">No recent enrollments</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Course</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentEnrollments.map((enrollment: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm text-slate-900">{enrollment.user_name}</td>
                    <td className="px-6 py-3 text-sm text-slate-700">{enrollment.course_slug}</td>
                    <td className="px-6 py-3 text-sm font-medium text-slate-900">
                      {enrollment.amount_paid > 0 ? `$${enrollment.amount_paid}` : 'Free'}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-500">
                      {new Date(enrollment.created_at).toLocaleDateString()}
                    </td>
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

export default SuperAdminFinance;