import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

interface Enrollment {
  course_slug: string; amount_paid: number; created_at: string;
}

interface Progress {
  course_slug: string; module_index: number; section_id: string; progress_pct: number; updated_at: string;
}

const StudentPanel: React.FC = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getEnrollments().then((d) => setEnrollments(d.enrollments)),
      api.getProgress().then((d) => setProgress(d.progress)),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getProgressForCourse = (slug: string) => progress.find((p) => p.course_slug === slug);

  if (loading) {
    return (
      <div className="section-shell surface-ring rounded-[32px] border border-white/60 px-6 py-16 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8 sm:px-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-600">Student Dashboard</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-slate-950">Welcome, {user?.name}</h1>
          </div>
          <Link to="/courses" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
            Browse courses &rarr;
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[24px] border border-white/70 bg-white/85 px-5 py-5 shadow-lg shadow-slate-200/50">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Enrolled Courses</p>
            <p className="mt-3 font-display text-3xl font-bold text-slate-950">{enrollments.length}</p>
          </div>
          <div className="rounded-[24px] border border-white/70 bg-white/85 px-5 py-5 shadow-lg shadow-slate-200/50">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">In Progress</p>
            <p className="mt-3 font-display text-3xl font-bold text-slate-950">
              {progress.filter((p) => p.progress_pct > 0 && p.progress_pct < 100).length}
            </p>
          </div>
          <div className="rounded-[24px] border border-white/70 bg-white/85 px-5 py-5 shadow-lg shadow-slate-200/50">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Completed</p>
            <p className="mt-3 font-display text-3xl font-bold text-slate-950">
              {progress.filter((p) => p.progress_pct >= 100).length}
            </p>
          </div>
        </div>
      </section>

      <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8">
        <h2 className="font-display text-2xl font-bold text-slate-950 mb-6">My Courses</h2>
        {enrollments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 mb-4">You haven't enrolled in any courses yet.</p>
            <Link to="/courses" className="rounded-full bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
              Browse Courses
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {enrollments.map((e) => {
              const prog = getProgressForCourse(e.course_slug);
              const pct = prog?.progress_pct || 0;
              return (
                <div key={e.course_slug} className="rounded-2xl border border-white/70 bg-white/85 px-6 py-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 capitalize">{e.course_slug.replace(/-/g, ' ')}</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Enrolled {new Date(e.created_at).toLocaleDateString()}
                        {prog && prog.module_index > 0 && ` • Module ${prog.module_index}`}
                      </p>
                    </div>
                    <Link to={`/courses/${e.course_slug}`}
                      className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
                      {pct > 0 ? 'Continue' : 'Start'}
                    </Link>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Progress</span>
                      <span>{Math.round(pct)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default StudentPanel;
