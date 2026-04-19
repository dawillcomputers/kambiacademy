import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { api } from '../../../../lib/api';

type Tab = 'listed' | 'enrolled' | 'ai' | 'draft';

interface CourseRecord {
  id: number;
  slug: string;
  title: string;
  description?: string | null;
  level?: string | null;
  price?: number | null;
  duration_label?: string | null;
  category?: string | null;
  status?: string | null;
  enrollment_count?: number;
  created_at?: string;
}

interface CourseForm {
  title: string;
  description: string;
  level: string;
  price: string;
  duration_label: string;
  category: string;
}

const defaultForm: CourseForm = { title: '', description: '', level: 'Foundation', price: '', duration_label: '8 weeks', category: 'General' };

const fmt = (v?: number | null) => {
  const n = Number(v || 0);
  return n > 0 ? `₦${n.toLocaleString()}` : 'Free';
};

const statusStyles: Record<string, string> = {
  approved: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  rejected: 'bg-rose-100 text-rose-700',
  draft: 'bg-slate-100 text-slate-600',
};

const norm = (s?: string | null) => {
  const v = String(s || 'draft').trim().toLowerCase();
  return ['approved', 'pending', 'rejected', 'draft'].includes(v) ? v : 'draft';
};

export default function TeacherCoursesPage() {
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>('listed');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState<CourseForm>(defaultForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<CourseForm>(defaultForm);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await api.tutorGetCourses();
      setCourses((r.courses || []) as CourseRecord[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const listed = useMemo(() => courses.filter(c => norm(c.status) === 'approved'), [courses]);
  const enrolled = useMemo(() => courses.filter(c => norm(c.status) === 'approved' && Number(c.enrollment_count || 0) > 0), [courses]);
  const drafts = useMemo(() => courses.filter(c => ['draft', 'pending', 'rejected'].includes(norm(c.status))), [courses]);
  const aiCourses = useMemo(() => courses.filter(c => c.category?.toLowerCase().includes('ai') || c.title?.toLowerCase().includes('ai')), [courses]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'listed', label: 'Listed Courses', count: listed.length },
    { key: 'enrolled', label: 'Enrolled Courses', count: enrolled.length },
    { key: 'ai', label: 'AI Courses', count: aiCourses.length },
    { key: 'draft', label: 'Draft Courses', count: drafts.length },
  ];

  const visibleCourses = tab === 'listed' ? listed : tab === 'enrolled' ? enrolled : tab === 'ai' ? aiCourses : drafts;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) { setError('Title and description required.'); return; }
    setSaving(true); setError(''); setMessage('');
    try {
      await api.tutorCreateCourse({
        title: form.title.trim(),
        description: form.description.trim(),
        level: form.level || 'Foundation',
        price: Number(form.price || 0),
        duration_label: form.duration_label || '8 weeks',
        category: form.category || 'General',
      });
      setForm(defaultForm);
      setShowCreate(false);
      setMessage('Course submitted for review.');
      setTab('draft');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create course.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId || !editForm.title.trim()) { setError('Title required.'); return; }
    setSaving(true); setError(''); setMessage('');
    try {
      await api.tutorUpdateCourse({
        courseId: editId,
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        level: editForm.level || 'Foundation',
        price: Number(editForm.price || 0),
        duration_label: editForm.duration_label || '8 weeks',
        category: editForm.category || 'General',
      });
      setEditId(null);
      setMessage('Course updated.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update course.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (c: CourseRecord) => {
    setEditId(c.id);
    setEditForm({
      title: c.title || '',
      description: c.description || '',
      level: c.level || 'Foundation',
      price: c.price != null ? String(c.price) : '',
      duration_label: c.duration_label || '8 weeks',
      category: c.category || 'General',
    });
  };

  const updateField = (setter: React.Dispatch<React.SetStateAction<CourseForm>>) =>
    (field: keyof CourseForm, value: string) => setter(prev => ({ ...prev, [field]: value }));

  const CourseFormFields = ({ f, onChange, onSubmit, btnLabel, onCancel }: {
    f: CourseForm;
    onChange: (field: keyof CourseForm, value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    btnLabel: string;
    onCancel?: () => void;
  }) => (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Title</label>
          <input type="text" value={f.title} onChange={e => onChange('title', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Course title" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Category</label>
          <input type="text" value={f.category} onChange={e => onChange('category', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Description</label>
        <textarea value={f.description} onChange={e => onChange('description', e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Level</label>
          <input type="text" value={f.level} onChange={e => onChange('level', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Price (NGN)</label>
          <input type="number" min="0" value={f.price} onChange={e => onChange('price', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="0" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Duration</label>
          <input type="text" value={f.duration_label} onChange={e => onChange('duration_label', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
          {saving ? 'Saving...' : btnLabel}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>}
      </div>
    </form>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Courses</h1>
            <p className="mt-1 text-sm text-slate-500">Create, manage, and track all your courses.</p>
          </div>
          <button onClick={() => { setShowCreate(!showCreate); setEditId(null); }} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            {showCreate ? 'Cancel' : '+ New Course'}
          </button>
        </div>

        {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        {showCreate && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Create New Course</h2>
            <CourseFormFields f={form} onChange={updateField(setForm)} onSubmit={handleCreate} btnLabel="Submit for Review" onCancel={() => setShowCreate(false)} />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.label} <span className="ml-1 text-xs opacity-60">({t.count})</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">Loading courses...</div>
        ) : visibleCourses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            {tab === 'listed' && 'No approved courses yet. Submit a course for review.'}
            {tab === 'enrolled' && 'No courses with student enrollments yet.'}
            {tab === 'draft' && 'No draft courses. Create a new one above.'}
          </div>
        ) : (
          <div className="space-y-4">
            {visibleCourses.map(c => (
              <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">{c.title}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyles[norm(c.status)] || statusStyles.draft}`}>{norm(c.status)}</span>
                      {tab === 'enrolled' && <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">{c.enrollment_count || 0} students</span>}
                    </div>
                    <p className="mt-2 text-sm text-slate-600 line-clamp-2">{c.description || 'No description.'}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                      <span>{c.category || 'General'}</span>
                      <span>{c.level || 'Foundation'}</span>
                      <span>{fmt(c.price)}</span>
                      <span>{c.duration_label || '8 weeks'}</span>
                      <span>Slug: {c.slug}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(c)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Edit</button>
                    {norm(c.status) === 'approved' && (
                      <a href={`/courses/${c.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Preview</a>
                    )}
                  </div>
                </div>

                {editId === c.id && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <CourseFormFields f={editForm} onChange={updateField(setEditForm)} onSubmit={handleUpdate} btnLabel="Save Changes" onCancel={() => setEditId(null)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
