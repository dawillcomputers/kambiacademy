import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import AICourses from '../student/ai-courses';
import { api } from '../../../../lib/api';
import { Course } from '../../../../types';

const toCourseDraftPayload = (course: Course) => ({
  title: course.title,
  description: course.description,
  level: course.level,
  price: course.price,
  duration_label: course.durationLabel,
  category: course.category || 'AI Course',
});

export default function TeacherAI() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.tutorGetCourses();
      setCourses(response.courses || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load your course drafts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  const stats = useMemo(() => {
    const approved = courses.filter((course) => course.status === 'approved').length;
    const pending = courses.filter((course) => course.status !== 'approved').length;
    const aiTagged = courses.filter((course) => {
      const title = String(course.title || '').toLowerCase();
      const category = String(course.category || '').toLowerCase();
      return title.includes('ai') || category.includes('ai');
    }).length;

    return [
      { label: 'Total Drafts', value: courses.length, detail: 'All teacher course drafts and approved courses.' },
      { label: 'Pending Review', value: pending, detail: 'Drafts still waiting for admin review.' },
      { label: 'Approved', value: approved, detail: 'Teacher courses already approved for students.' },
      { label: 'AI Tagged', value: aiTagged, detail: 'Courses already marked as AI-generated or AI-related.' },
    ];
  }, [courses]);

  const createDraftFromAI = useCallback(async (course: Course) => {
    if (creating) {
      return;
    }

    setCreating(true);
    setMessage('');
    setError('');

    try {
      const response = await api.tutorCreateCourse(toCourseDraftPayload(course));
      setMessage(response?.slug
        ? `AI draft created successfully with slug ${response.slug}.`
        : 'AI draft created successfully.');
      await loadCourses();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create an AI draft right now.');
    } finally {
      setCreating(false);
    }
  }, [creating, loadCourses]);

  const recentCourses = useMemo(() => courses.slice(0, 4), [courses]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_28%),linear-gradient(135deg,#ffffff,#f8fafc_45%,#eef2ff)] px-6 py-8 shadow-xl shadow-slate-200/70">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">AI Teaching Studio</p>
          <h1 className="mt-3 text-4xl font-bold text-slate-950">Generate course ideas and save them as teacher drafts</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Use AI to sketch a course structure, then send the draft straight into your teacher workflow for review, editing, and publication.
          </p>
        </section>

        {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</div>}
        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat, index) => (
            <div key={stat.label} className={`rounded-[28px] border px-5 py-5 shadow-lg shadow-slate-200/60 ${index % 2 === 0 ? 'border-sky-200 bg-gradient-to-br from-sky-100 via-cyan-50 to-white text-sky-950' : 'border-violet-200 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-white text-violet-950'}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] opacity-70">{stat.label}</p>
              <p className="mt-4 text-3xl font-bold">{stat.value}</p>
              <p className="mt-4 text-sm opacity-80">{stat.detail}</p>
            </div>
          ))}
        </div>

        <AICourses
          onRequestPayment={(course) => { void createDraftFromAI(course); }}
          actionLabel={creating ? 'Creating draft...' : 'Create AI Draft'}
          title="AI Course Draft Generator"
          subtitle="Generate an AI outline, then save it directly as a teacher draft for review."
        />

        <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-lg shadow-slate-200/60">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Recent Drafts</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">Latest teacher courses</h2>
            </div>
            {loading && <span className="text-sm text-slate-500">Refreshing...</span>}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {recentCourses.map((course) => (
              <div key={course.id} className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{course.status || 'pending'}</p>
                <h3 className="mt-3 text-lg font-semibold text-slate-950">{course.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{course.category || 'General'} • {course.level || 'Foundation'}</p>
                <p className="mt-3 text-sm text-slate-500">{course.slug || 'slug pending'}</p>
              </div>
            ))}
            {!recentCourses.length && (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-sm text-slate-500 md:col-span-2 xl:col-span-4">
                No teacher course drafts yet. Use the AI generator above to create the first draft.
              </div>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}