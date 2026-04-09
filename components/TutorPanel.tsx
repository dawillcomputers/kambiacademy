import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

type Tab = 'courses' | 'classes' | 'create-course' | 'create-class';

interface TutorCourse {
  id: number; title: string; description: string; level: string; price: number;
  category: string; status: string; created_at: string;
}

interface PrivateClass {
  id: number; title: string; description: string; invite_code: string;
  max_students: number; member_count: number; created_at: string;
}

const TutorPanel: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('courses');
  const [courses, setCourses] = useState<TutorCourse[]>([]);
  const [classes, setClasses] = useState<PrivateClass[]>([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Course form
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseLevel, setCourseLevel] = useState('Foundation');
  const [coursePrice, setCoursePrice] = useState('0');
  const [courseDuration, setCourseDuration] = useState('8 weeks');
  const [courseCategory, setCourseCategory] = useState('General');

  // Class form
  const [classTitle, setClassTitle] = useState('');
  const [classDesc, setClassDesc] = useState('');
  const [classMax, setClassMax] = useState('30');

  useEffect(() => {
    if (tab === 'courses') api.tutorGetCourses().then((d) => setCourses(d.courses)).catch(() => {});
    if (tab === 'classes') api.tutorGetClasses().then((d) => setClasses(d.classes)).catch(() => {});
  }, [tab]);

  const submitCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(''); setErr('');
    try {
      await api.tutorCreateCourse({
        title: courseTitle, description: courseDesc, level: courseLevel,
        price: parseFloat(coursePrice), duration_label: courseDuration, category: courseCategory,
      });
      setMsg('Course submitted for admin review!');
      setCourseTitle(''); setCourseDesc('');
      setTab('courses');
    } catch (e: any) { setErr(e.message); }
  };

  const createClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(''); setErr('');
    try {
      const res = await api.tutorCreateClass({
        title: classTitle, description: classDesc, max_students: parseInt(classMax),
      });
      setMsg(`Class created! Invite code: ${res.invite_code}`);
      setClassTitle(''); setClassDesc('');
      setTab('classes');
    } catch (e: any) { setErr(e.message); }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'courses', label: 'My Courses' },
    { key: 'create-course', label: 'Submit Course' },
    { key: 'classes', label: 'Private Classes' },
    { key: 'create-class', label: 'Create Class' },
  ];

  return (
    <div className="space-y-8">
      <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8 sm:px-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-600">Tutor Dashboard</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-slate-950">Welcome, {user?.name}</h1>
          </div>
          <Link to="/courses" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
            Browse courses &rarr;
          </Link>
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => { setTab(t.key); setMsg(''); setErr(''); }}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${tab === t.key ? 'bg-amber-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {msg && <div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">{msg}</div>}
        {err && <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{err}</div>}
      </section>

      {/* MY COURSES */}
      {tab === 'courses' && (
        <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8">
          <h2 className="font-display text-2xl font-bold text-slate-950 mb-6">My Submitted Courses</h2>
          {courses.length === 0 && <p className="text-sm text-slate-400">You haven't submitted any courses yet.</p>}
          <div className="space-y-4">
            {courses.map((c) => (
              <div key={c.id} className="rounded-2xl border border-white/70 bg-white/85 px-6 py-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{c.title}</h3>
                    <p className="text-sm text-slate-500 mt-1">{c.description}</p>
                    <div className="mt-2 flex gap-3 text-xs text-slate-400">
                      <span>{c.level}</span><span>${c.price}</span><span>{c.category}</span>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${c.status === 'approved' ? 'bg-green-100 text-green-700' : c.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{c.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CREATE COURSE */}
      {tab === 'create-course' && (
        <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8">
          <h2 className="font-display text-2xl font-bold text-slate-950 mb-6">Submit a New Course</h2>
          <form onSubmit={submitCourse} className="max-w-lg space-y-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Title *</label>
              <input value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} required
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900" />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Description *</label>
              <textarea value={courseDesc} onChange={(e) => setCourseDesc(e.target.value)} required rows={4}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Level</label>
                <select value={courseLevel} onChange={(e) => setCourseLevel(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900">
                  <option>Foundation</option><option>Intermediate</option><option>Advanced</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Price ($)</label>
                <input type="number" min="0" value={coursePrice} onChange={(e) => setCoursePrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Duration</label>
                <input value={courseDuration} onChange={(e) => setCourseDuration(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Category</label>
                <input value={courseCategory} onChange={(e) => setCourseCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900" />
              </div>
            </div>
            <button type="submit" className="rounded-full bg-amber-600 px-6 py-2 text-sm font-semibold text-white hover:bg-amber-700">
              Submit for Review
            </button>
          </form>
        </section>
      )}

      {/* PRIVATE CLASSES */}
      {tab === 'classes' && (
        <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8">
          <h2 className="font-display text-2xl font-bold text-slate-950 mb-6">My Private Classes</h2>
          {classes.length === 0 && <p className="text-sm text-slate-400">No private classes yet.</p>}
          <div className="space-y-4">
            {classes.map((c) => (
              <div key={c.id} className="rounded-2xl border border-white/70 bg-white/85 px-6 py-4 shadow-sm">
                <h3 className="font-semibold text-slate-900">{c.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{c.description}</p>
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-indigo-700 font-mono text-xs">
                    Invite: {c.invite_code}
                  </span>
                  <span className="text-slate-500">{c.member_count}/{c.max_students} students</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/join/${c.invite_code}`); setMsg('Invite link copied!'); }}
                    className="text-indigo-600 hover:text-indigo-800 font-medium">
                    Copy Link
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CREATE CLASS */}
      {tab === 'create-class' && (
        <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8">
          <h2 className="font-display text-2xl font-bold text-slate-950 mb-6">Create Private Class</h2>
          <form onSubmit={createClass} className="max-w-lg space-y-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Class Title *</label>
              <input value={classTitle} onChange={(e) => setClassTitle(e.target.value)} required
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900" />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Description</label>
              <textarea value={classDesc} onChange={(e) => setClassDesc(e.target.value)} rows={3}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900" />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Max Students</label>
              <input type="number" min="1" value={classMax} onChange={(e) => setClassMax(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900" />
            </div>
            <button type="submit" className="rounded-full bg-amber-600 px-6 py-2 text-sm font-semibold text-white hover:bg-amber-700">
              Create Class
            </button>
          </form>
        </section>
      )}
    </div>
  );
};

export default TutorPanel;
