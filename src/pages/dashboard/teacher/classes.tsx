import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { api } from '../../../../lib/api';

interface TeacherClassRecord {
  id: number;
  title: string;
  description?: string | null;
  invite_code: string;
  max_students?: number | null;
  member_count?: number | null;
  member_names?: string | null;
  member_emails?: string | null;
  created_at?: string;
}

interface ClassFormState {
  title: string;
  description: string;
  max_students: string;
}

const defaultForm: ClassFormState = {
  title: '',
  description: '',
  max_students: '30',
};

const parseDelimited = (value?: string | null) =>
  String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString() : 'Recently created';

export default function TeacherClasses() {
  const [classes, setClasses] = useState<TeacherClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [startingClassId, setStartingClassId] = useState<number | null>(null);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState<ClassFormState>(defaultForm);

  const loadClasses = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.tutorGetClasses();
      setClasses((response.classes || []) as TeacherClassRecord[]);
    } catch (loadError) {
      setClasses([]);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load your private classes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadClasses();
  }, []);

  const stats = useMemo(() => {
    const enrolledSeats = classes.reduce((sum, courseClass) => sum + Number(courseClass.member_count || 0), 0);
    const totalSeats = classes.reduce((sum, courseClass) => sum + Number(courseClass.max_students || 0), 0);
    const filledClasses = classes.filter((courseClass) => Number(courseClass.member_count || 0) >= Number(courseClass.max_students || 0) && Number(courseClass.max_students || 0) > 0).length;
    const averageClassSize = classes.length ? Math.round((enrolledSeats / classes.length) * 10) / 10 : 0;

    return [
      { label: 'Private Classes', value: classes.length, detail: 'Dedicated classes with their own invite codes and student roster.' },
      { label: 'Learners Enrolled', value: enrolledSeats, detail: 'Current members across every private class you run.' },
      { label: 'Average Size', value: averageClassSize, detail: totalSeats > 0 ? `Using ${enrolledSeats} of ${totalSeats} available seats.` : 'Seat limits can be set per class.' },
      { label: 'At Capacity', value: filledClasses, detail: 'Classes that have reached or exceeded the configured seat limit.' },
    ];
  }, [classes]);

  const updateForm = (field: keyof ClassFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreateClass = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.title.trim()) {
      setError('Class title is required.');
      return;
    }

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const response = await api.tutorCreateClass({
        title: form.title.trim(),
        description: form.description.trim(),
        max_students: Number(form.max_students || 30),
      });

      setForm(defaultForm);
      setMessage(response?.message || `Class created. Invite code: ${response?.invite_code || ''}`.trim());
      await loadClasses();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create your class.');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);
      setMessage(successMessage);
      setError('');
    } catch {
      setError('Unable to copy to clipboard in this browser session.');
    }
  };

  const handleStartLiveSession = async (courseClass: TeacherClassRecord) => {
    setStartingClassId(courseClass.id);
    setMessage('');
    setError('');

    try {
      const response = await api.startLiveSession(courseClass.id, `Live Class: ${courseClass.title}`);
      setMessage(`Live session #${response.id} started for ${courseClass.title}. Open the live page to manage the room.`);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Unable to start a live class for this group.');
    } finally {
      setStartingClassId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_30%),linear-gradient(135deg,#ffffff,#ecfeff_40%,#f8fafc)] px-6 py-8 shadow-xl shadow-slate-200/70">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Classroom Control</p>
          <h1 className="mt-3 text-4xl font-bold text-slate-950">Run private classes with real invite links</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Create invitation-based classes, track membership, and launch live rooms directly from the dashboard whenever you need a real-time session.
          </p>
        </section>

        {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</div>}
        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat, index) => (
            <div key={stat.label} className={`rounded-[28px] border px-5 py-5 shadow-lg shadow-slate-200/60 ${index % 2 === 0 ? 'border-emerald-200 bg-gradient-to-br from-emerald-100 via-teal-50 to-white text-emerald-950' : 'border-cyan-200 bg-gradient-to-br from-cyan-100 via-sky-50 to-white text-cyan-950'}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] opacity-70">{stat.label}</p>
              <p className="mt-4 text-3xl font-bold">{stat.value}</p>
              <p className="mt-4 text-sm opacity-80">{stat.detail}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-sm text-slate-500 shadow-lg">Loading your classes...</div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-lg shadow-slate-200/60">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Live Classes</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-950">Manage class rosters and invite access</h2>
                </div>
                <Link to="/teacher/live" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  Open live page
                </Link>
              </div>

              <div className="mt-6 space-y-4">
                {classes.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                    No private classes yet. Create one from the form on this page and start inviting students with a generated code.
                  </div>
                ) : (
                  classes.map((courseClass) => {
                    const memberNames = parseDelimited(courseClass.member_names);
                    const memberEmails = parseDelimited(courseClass.member_emails);
                    const joinLink = `${window.location.origin}/join/${courseClass.invite_code}`;
                    const memberCount = Number(courseClass.member_count || 0);
                    const maxStudents = Number(courseClass.max_students || 0);

                    return (
                      <article key={courseClass.id} className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-xl font-bold text-slate-950">{courseClass.title}</h3>
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
                                {memberCount}/{maxStudents || 'No limit'} enrolled
                              </span>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-slate-600">
                              {courseClass.description || 'No class description yet. Add context so students know what the group is for.'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleStartLiveSession(courseClass)}
                            disabled={startingClassId === courseClass.id}
                            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {startingClassId === courseClass.id ? 'Starting live...' : 'Start live session'}
                          </button>
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Invite code</p>
                            <div className="mt-2 flex flex-wrap items-center gap-3">
                              <code className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-900">{courseClass.invite_code}</code>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(courseClass.invite_code, `${courseClass.title} invite code copied.`)}
                                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                {copiedValue === courseClass.invite_code ? 'Copied' : 'Copy code'}
                              </button>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Join link</p>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                              <span className="truncate font-medium text-slate-900">{joinLink}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(joinLink, `${courseClass.title} join link copied.`)}
                                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                {copiedValue === joinLink ? 'Copied' : 'Copy link'}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                          {memberNames.length > 0 ? (
                            memberNames.map((name, index) => (
                              <span key={`${courseClass.id}-${name}-${index}`} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                                {name}
                                {memberEmails[index] ? ` • ${memberEmails[index]}` : ''}
                              </span>
                            ))
                          ) : (
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">No students joined yet</span>
                          )}
                        </div>

                        <div className="mt-4 text-xs text-slate-500">Created {formatDate(courseClass.created_at)}</div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-lg shadow-slate-200/60">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">New Class</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">Create a private class</h2>

                <form className="mt-6 space-y-5" onSubmit={handleCreateClass}>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">Class title</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(event) => updateForm('title', event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                      placeholder="Frontend Coaching Cohort"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(event) => updateForm('description', event.target.value)}
                      rows={5}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                      placeholder="Explain the rhythm of the class, expected attendance, and who should join."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700">Seat limit</label>
                    <input
                      type="number"
                      min="1"
                      value={form.max_students}
                      onChange={(event) => updateForm('max_students', event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? 'Creating class...' : 'Create private class'}
                  </button>
                </form>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-lg shadow-slate-200/60">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Operating Notes</p>
                <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                  <p>Students join these classes through the invite code or direct join link generated after creation.</p>
                  <p>Launching a live session checks your live classroom subscription and prevents duplicate active rooms for the same class.</p>
                  <p>Share class resources from the materials page and use assignments or quizzes to keep cohorts accountable.</p>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}