import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { api } from '../../../../lib/api';

interface TeacherCourseRecord {
  id: number;
  slug: string;
  title: string;
  description?: string | null;
  level?: string | null;
  price?: number | null;
  duration_label?: string | null;
  category?: string | null;
  status?: string | null;
  created_at?: string;
}

interface CourseFormState {
  title: string;
  description: string;
  level: string;
  price: string;
  duration_label: string;
  category: string;
}

const currencyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

const statusStyles: Record<string, string> = {
  approved: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  rejected: 'bg-rose-100 text-rose-700',
  draft: 'bg-slate-100 text-slate-700',
};

const defaultForm: CourseFormState = {
  title: '',
  description: '',
  level: 'Foundation',
  price: '',
  duration_label: '8 weeks',
  category: 'General',
};

const normalizeStatus = (status?: string | null) => {
  const normalized = String(status || 'draft').trim().toLowerCase();
  if (normalized === 'approved' || normalized === 'pending' || normalized === 'rejected' || normalized === 'draft') {
    return normalized;
  }
  return 'draft';
};

const labelize = (value?: string | null) => {
  const cleaned = String(value || '').trim();
  if (!cleaned) {
    return 'Not set';
  }

  return cleaned
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
};

const formatPrice = (value?: number | null) => {
  const numericValue = Number(value || 0);
  return numericValue > 0 ? currencyFormatter.format(numericValue) : 'Free';
};

const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString() : 'Recently created';

export default function TeacherCourses() {
  const [courses, setCourses] = useState<TeacherCourseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState<CourseFormState>(defaultForm);
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
  const [editingForm, setEditingForm] = useState<CourseFormState>(defaultForm);

  const loadCourses = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.tutorGetCourses();
      setCourses((response.courses || []) as TeacherCourseRecord[]);
    } catch (loadError) {
      setCourses([]);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load your courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCourses();
  }, []);

  const stats = useMemo(() => {
    const approved = courses.filter((course) => normalizeStatus(course.status) === 'approved').length;
    const pending = courses.filter((course) => normalizeStatus(course.status) === 'pending').length;
    const totalRevenue = courses.reduce((sum, course) => sum + Number(course.price || 0), 0);

    return [
      { label: 'Submitted Courses', value: courses.length, detail: 'Every course draft you have sent into the review pipeline.' },
      { label: 'Approved', value: approved, detail: 'Courses already cleared for students to enroll in.' },
      { label: 'In Review', value: pending, detail: 'Drafts waiting for admin approval or revision.' },
      { label: 'Listed Value', value: formatPrice(totalRevenue), detail: 'Combined pricing across your active course catalog.' },
    ];
  }, [courses]);

  const updateForm = (field: keyof CourseFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateEditingForm = (field: keyof CourseFormState, value: string) => {
    setEditingForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreateCourse = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.title.trim() || !form.description.trim()) {
      setError('Course title and description are required.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await api.tutorCreateCourse({
        title: form.title.trim(),
        description: form.description.trim(),
        level: form.level.trim() || 'Foundation',
        price: Number(form.price || 0),
        duration_label: form.duration_label.trim() || '8 weeks',
        category: form.category.trim() || 'General',
      });

      setForm(defaultForm);
      setMessage(response?.message || 'Course submitted for review.');
      await loadCourses();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to submit your course.');
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (course: TeacherCourseRecord) => {
    setEditingCourseId(course.id);
    setEditingForm({
      title: course.title || '',
      description: course.description || '',
      level: course.level || 'Foundation',
      price: course.price !== null && course.price !== undefined ? String(course.price) : '',
      duration_label: course.duration_label || '8 weeks',
      category: course.category || 'General',
    });
    setMessage('');
    setError('');
  };

  const cancelEditing = () => {
    setEditingCourseId(null);
    setEditingForm(defaultForm);
  };

  const handleUpdateCourse = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingCourseId) {
      return;
    }

    if (!editingForm.title.trim() || !editingForm.description.trim()) {
      setError('Course title and description are required.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await api.tutorUpdateCourse({
        courseId: editingCourseId,
        title: editingForm.title.trim(),
        description: editingForm.description.trim(),
        level: editingForm.level.trim() || 'Foundation',
        price: Number(editingForm.price || 0),
        duration_label: editingForm.duration_label.trim() || '8 weeks',
        category: editingForm.category.trim() || 'General',
      });

      setMessage(response?.message || 'Course updated.');
      cancelEditing();
      await loadCourses();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update this course.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_30%),linear-gradient(135deg,#ffffff,#eff6ff_45%,#f8fafc)] px-6 py-8 shadow-xl shadow-slate-200/70">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Course Studio</p>
          <h1 className="mt-3 text-4xl font-bold text-slate-950">Build and manage your teaching catalog</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Submit new course drafts, track approval status, and keep existing course information current without leaving the teacher dashboard.
          </p>
        </section>

        {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</div>}
        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat, index) => (
            <div key={stat.label} className={`rounded-[28px] border px-5 py-5 shadow-lg shadow-slate-200/60 ${index % 2 === 0 ? 'border-sky-200 bg-gradient-to-br from-sky-100 via-blue-50 to-white text-sky-950' : 'border-amber-200 bg-gradient-to-br from-amber-100 via-orange-50 to-white text-amber-950'}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] opacity-70">{stat.label}</p>
              <p className="mt-4 text-3xl font-bold">{stat.value}</p>
              <p className="mt-4 text-sm opacity-80">{stat.detail}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-sm text-slate-500 shadow-lg">Loading your courses...</div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-lg shadow-slate-200/60">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Course Queue</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-950">Submitted courses and review state</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
                  {courses.length} total
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {courses.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                    No courses submitted yet. Use the form on this page to publish your first draft for review.
                  </div>
                ) : (
                  courses.map((course) => {
                    const normalizedStatus = normalizeStatus(course.status);

                    return (
                      <article key={course.id} className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-xl font-bold text-slate-950">{course.title}</h3>
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${statusStyles[normalizedStatus] || statusStyles.draft}`}>
                                {normalizedStatus}
                              </span>
                            </div>
                            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                              {course.description || 'No description has been added yet for this course.'}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => startEditing(course)}
                              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
                            >
                              Edit course
                            </button>
                            <Link
                              to={`/courses/${course.slug}`}
                              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                              Preview
                            </Link>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Category</p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">{labelize(course.category)}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Level</p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">{labelize(course.level)}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Duration</p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">{course.duration_label || '8 weeks'}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Price</p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">{formatPrice(course.price)}</p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                          <span>Slug: {course.slug}</span>
                          <span>Created {formatDate(course.created_at)}</span>
                        </div>

                        {editingCourseId === course.id && (
                          <form className="mt-5 space-y-4 rounded-3xl border border-slate-200 bg-white px-5 py-5" onSubmit={handleUpdateCourse}>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <label className="block text-sm font-semibold text-slate-700">Course title</label>
                                <input
                                  type="text"
                                  value={editingForm.title}
                                  onChange={(event) => updateEditingForm('title', event.target.value)}
                                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-slate-700">Category</label>
                                <input
                                  type="text"
                                  value={editingForm.category}
                                  onChange={(event) => updateEditingForm('category', event.target.value)}
                                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-slate-700">Description</label>
                              <textarea
                                value={editingForm.description}
                                onChange={(event) => updateEditingForm('description', event.target.value)}
                                rows={4}
                                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                              />
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                              <div>
                                <label className="block text-sm font-semibold text-slate-700">Level</label>
                                <input
                                  type="text"
                                  value={editingForm.level}
                                  onChange={(event) => updateEditingForm('level', event.target.value)}
                                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-slate-700">Price (NGN)</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={editingForm.price}
                                  onChange={(event) => updateEditingForm('price', event.target.value)}
                                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-slate-700">Duration</label>
                                <input
                                  type="text"
                                  value={editingForm.duration_label}
                                  onChange={(event) => updateEditingForm('duration_label', event.target.value)}
                                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                                />
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                              <button
                                type="submit"
                                disabled={saving}
                                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {saving ? 'Saving changes...' : 'Save changes'}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditing}
                                className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-lg shadow-slate-200/60">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">New Submission</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">Draft a new course</h2>

                <form className="mt-6 space-y-5" onSubmit={handleCreateCourse}>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">Course title</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(event) => updateForm('title', event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                      placeholder="Advanced Data Analysis"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(event) => updateForm('description', event.target.value)}
                      rows={5}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                      placeholder="Describe outcomes, weekly structure, and the projects students will complete."
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Level</label>
                      <input
                        type="text"
                        value={form.level}
                        onChange={(event) => updateForm('level', event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Category</label>
                      <input
                        type="text"
                        value={form.category}
                        onChange={(event) => updateForm('category', event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Price (NGN)</label>
                      <input
                        type="number"
                        min="0"
                        value={form.price}
                        onChange={(event) => updateForm('price', event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                        placeholder="25000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Duration label</label>
                      <input
                        type="text"
                        value={form.duration_label}
                        onChange={(event) => updateForm('duration_label', event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? 'Submitting course...' : 'Submit course for review'}
                  </button>
                </form>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-lg shadow-slate-200/60">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Review Checklist</p>
                <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                  <p>Write outcomes that explain what students will be able to do by the end of the course.</p>
                  <p>Keep pricing realistic for the scope and include a duration label that matches your delivery plan.</p>
                  <p>Use the preview action after approval to verify the public course page before sharing it widely.</p>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}