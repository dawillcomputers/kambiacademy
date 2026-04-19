import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../../lib/api';
import DashboardLayout from '../../../components/layout/DashboardLayout';

export default function TeacherOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [cr, cl, ar, qr, br] = await Promise.allSettled([
        api.tutorGetCourses(),
        api.tutorGetClasses(),
        api.getAssignments(),
        api.getQuizzes(),
        api.getBillingOverview(),
      ]);
      if (cancelled) return;
      setCourses(cr.status === 'fulfilled' ? cr.value.courses || [] : []);
      setClasses(cl.status === 'fulfilled' ? cl.value.classes || [] : []);
      setAssignments(ar.status === 'fulfilled' ? ar.value.assignments || [] : []);
      setQuizzes(qr.status === 'fulfilled' ? qr.value.quizzes || [] : []);
      if (br.status === 'fulfilled') setOverview(br.value.teacher || null);
      else setError('Unable to load billing overview.');
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const revenue = overview?.revenue;
  const liveHours = overview?.liveHours;

  const stats = useMemo(() => [
    { label: 'Courses', value: courses.length, icon: '📚', color: 'from-blue-100 via-sky-50 to-white border-blue-200 text-blue-950' },
    { label: 'Classes', value: classes.length, icon: '🏫', color: 'from-emerald-100 via-teal-50 to-white border-emerald-200 text-emerald-950' },
    { label: 'Assignments', value: assignments.length, icon: '📝', color: 'from-amber-100 via-orange-50 to-white border-amber-200 text-amber-950' },
    { label: 'Quizzes', value: quizzes.length, icon: '❓', color: 'from-violet-100 via-purple-50 to-white border-violet-200 text-violet-950' },
    { label: 'Earnings', value: `₦${(revenue?.estimatedRevenue || 0).toLocaleString()}`, icon: '💰', color: 'from-green-100 via-emerald-50 to-white border-green-200 text-green-950' },
    { label: 'Live Hours', value: liveHours?.mode === 'limited' ? `${liveHours.remainingHours ?? 0}h` : 'Open', icon: '🎥', color: 'from-rose-100 via-pink-50 to-white border-rose-200 text-rose-950' },
  ], [courses.length, classes.length, assignments.length, quizzes.length, revenue, liveHours]);

  const recentCourses = courses.slice(0, 5);
  const recentClasses = classes.slice(0, 4);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
          <p className="mt-1 text-sm text-slate-500">Welcome back. Here's a snapshot of your teaching activity.</p>
        </div>

        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">Loading dashboard...</div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {stats.map((s) => (
                <div key={s.label} className={`rounded-2xl border bg-gradient-to-br px-5 py-4 shadow-sm ${s.color}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{s.label}</p>
                    <span className="text-lg">{s.icon}</span>
                  </div>
                  <p className="mt-3 text-2xl font-bold">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">Recent Courses</h2>
                  <Link to="/teacher/courses" className="text-sm font-medium text-blue-600 hover:text-blue-700">View all →</Link>
                </div>
                <div className="mt-4 space-y-3">
                  {recentCourses.length ? recentCourses.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{c.title}</p>
                        <p className="text-xs text-slate-500">{c.category || 'General'} • {c.level || 'Foundation'}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        c.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        c.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>{c.status || 'draft'}</span>
                    </div>
                  )) : <p className="text-sm text-slate-500">No courses yet. Create your first course.</p>}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">Your Classes</h2>
                  <Link to="/teacher/classes" className="text-sm font-medium text-blue-600 hover:text-blue-700">View all →</Link>
                </div>
                <div className="mt-4 space-y-3">
                  {recentClasses.length ? recentClasses.map((cl) => (
                    <div key={cl.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{cl.title}</p>
                        <p className="text-xs text-slate-500">Code: {cl.invite_code} • {cl.member_count || 0} students</p>
                      </div>
                      <Link to="/teacher/classes" className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-white">Manage</Link>
                    </div>
                  )) : <p className="text-sm text-slate-500">No classes created yet.</p>}
                </div>
              </section>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <Link to="/teacher/courses" className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-lg">📚</span>
                  <div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-blue-600">Create a Course</h3>
                    <p className="text-xs text-slate-500">Draft and publish new courses</p>
                  </div>
                </div>
              </Link>
              <Link to="/teacher/classes" className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-lg">🏫</span>
                  <div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-emerald-600">Start a Class</h3>
                    <p className="text-xs text-slate-500">Create or go live with a class</p>
                  </div>
                </div>
              </Link>
              <Link to="/teacher/wallet" className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-lg">💰</span>
                  <div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-green-600">Check Earnings</h3>
                    <p className="text-xs text-slate-500">Track revenue and payouts</p>
                  </div>
                </div>
              </Link>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
