import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../../lib/api';
import DashboardLayout from '../../../components/layout/DashboardLayout';

const cardStyles = [
  'from-sky-100 via-cyan-50 to-white border-sky-200 text-sky-950',
  'from-violet-100 via-fuchsia-50 to-white border-violet-200 text-violet-950',
  'from-emerald-100 via-teal-50 to-white border-emerald-200 text-emerald-950',
  'from-amber-100 via-orange-50 to-white border-amber-200 text-amber-950',
  'from-rose-100 via-pink-50 to-white border-rose-200 text-rose-950',
  'from-slate-100 via-white to-white border-slate-200 text-slate-950',
];

export default function TeacherDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setError('');
      const [courseResult, classResult, assignmentResult, quizResult, liveResult, billingResult] = await Promise.allSettled([
        api.tutorGetCourses(),
        api.tutorGetClasses(),
        api.getAssignments(),
        api.getQuizzes(),
        api.getLiveSessions(),
        api.getBillingOverview(),
      ]);

      if (cancelled) {
        return;
      }

      setCourses(courseResult.status === 'fulfilled' ? courseResult.value.courses || [] : []);
      setClasses(classResult.status === 'fulfilled' ? classResult.value.classes || [] : []);
      setAssignments(assignmentResult.status === 'fulfilled' ? assignmentResult.value.assignments || [] : []);
      setQuizzes(quizResult.status === 'fulfilled' ? quizResult.value.quizzes || [] : []);
      setLiveSessions(liveResult.status === 'fulfilled' ? liveResult.value.sessions || [] : []);

      if (billingResult.status === 'fulfilled') {
        setOverview(billingResult.value.teacher || null);
      } else {
        setOverview(null);
        setError(billingResult.reason instanceof Error ? billingResult.reason.message : 'Unable to load teacher billing overview.');
      }

      setLoading(false);
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const dueItems = overview?.dueItems || [];
  const liveHours = overview?.liveHours;
  const quickLinks = [
    { title: 'Create a course', detail: 'Publish a new teacher-led course draft for admin review.', path: '/teacher/courses' },
    { title: 'Start a live class', detail: 'Open a realtime classroom for one of your private classes.', path: '/teacher/live' },
    { title: 'Upload materials', detail: 'Add files and YouTube materials for enrolled students.', path: '/teacher/materials' },
    { title: 'Review student work', detail: 'Grade submissions and track quiz responses.', path: '/teacher/students' },
  ];

  const stats = useMemo(() => ([
    { label: 'Courses', value: courses.length, detail: 'Teacher drafts and approved courses' },
    { label: 'Classes', value: classes.length, detail: 'Private classes with invite codes' },
    { label: 'Assignments', value: assignments.length, detail: 'Published assignments for learners' },
    { label: 'Quizzes', value: quizzes.length, detail: 'Quiz assessments created' },
    { label: 'Live Rooms', value: liveSessions.length, detail: 'Active live classrooms' },
    { label: 'Payments Due', value: dueItems.length, detail: dueItems.length ? `${dueItems.length} item${dueItems.length === 1 ? '' : 's'} need payment` : 'No teacher fees are currently due' },
  ]), [assignments.length, classes.length, courses.length, dueItems.length, liveSessions.length, quizzes.length]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.2),transparent_28%),linear-gradient(135deg,#ffffff,#f8fafc_45%,#fff7ed)] px-6 py-8 shadow-xl shadow-slate-200/70">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Teacher Workspace</p>
          <h1 className="mt-3 text-4xl font-bold text-slate-950">Teach, manage, and go live</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            This workspace is focused on teaching operations: courses, classes, materials, assignments, quizzes, students, live classrooms, and the teacher fees that keep those tools active.
          </p>
        </section>

        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

        {loading ? (
          <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-sm text-slate-500 shadow-lg">Loading teaching workspace...</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {stats.map((stat, index) => (
                <div key={stat.label} className={`rounded-[28px] border bg-gradient-to-br px-5 py-5 shadow-lg shadow-slate-200/60 ${cardStyles[index % cardStyles.length]}`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] opacity-70">{stat.label}</p>
                  <p className="mt-4 text-3xl font-bold">{stat.value}</p>
                  <p className="mt-4 text-sm opacity-80">{stat.detail}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-lg shadow-slate-200/60">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Quick Actions</p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-950">Run the teaching day</h2>
                  </div>
                  <Link to="/teacher/settings" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Teaching settings
                  </Link>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {quickLinks.map((item) => (
                    <Link key={item.path} to={item.path} className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
                      <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
                    </Link>
                  ))}
                </div>

                <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Recent course drafts</p>
                  <div className="mt-4 space-y-3">
                    {courses.slice(0, 4).map((course) => (
                      <div key={course.id} className="rounded-2xl bg-white px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{course.title}</p>
                            <p className="mt-1 text-sm text-slate-500">{course.slug || 'slug pending'} • {course.level || 'Foundation'}</p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                            {course.status || 'pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {!courses.length && <p className="text-sm text-slate-500">No courses created yet. Start with a new course draft.</p>}
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-lg shadow-slate-200/60">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Teacher Billing</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-950">Payments and live hours</h2>
                  <div className="mt-5 space-y-3">
                    {dueItems.length ? dueItems.map((item: any) => (
                      <div key={item.key} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                        <p className="font-semibold text-amber-950">{item.label}</p>
                        <p className="mt-1 text-sm text-amber-800">${Number(item.monthly || 0).toFixed(2)} monthly or ${Number(item.yearly || 0).toFixed(2)} yearly</p>
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                        All teacher services are active. No payment is due right now.
                      </div>
                    )}
                  </div>
                  <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
                    <p className="text-sm font-semibold text-slate-900">Live classroom usage</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {liveHours?.mode === 'limited'
                        ? `${liveHours.remainingHours ?? 0} hours remaining this month out of ${liveHours.monthlyLimitHours ?? 0}.`
                        : 'Your live classroom access is currently open with no monthly hour cap.'}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">Reset date: {liveHours?.resetAt ? new Date(liveHours.resetAt).toLocaleString() : 'Not available'}</p>
                  </div>
                  <Link to="/teacher/billing" className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                    Open payments due
                  </Link>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-lg shadow-slate-200/60">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Class Readiness</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-950">Private classes and invites</h2>
                  <div className="mt-5 space-y-3">
                    {classes.slice(0, 4).map((item) => (
                      <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{item.title}</p>
                            <p className="mt-1 text-sm text-slate-500">Invite code: {item.invite_code} • {item.member_count || 0} students</p>
                          </div>
                          <Link to="/teacher/live" className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white">
                            Open live page
                          </Link>
                        </div>
                      </div>
                    ))}
                    {!classes.length && <p className="text-sm text-slate-500">Create a private class to start inviting students.</p>}
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
