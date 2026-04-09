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

interface Assignment {
  id: number; course_slug: string; title: string; description: string; type: string; due_date: string; max_score: number;
}

interface Submission {
  id: number; assignment_id: number; content: string; file_name: string; score: number | null;
  feedback: string | null; status: string; submitted_at: string; assignment_title: string; course_slug: string; max_score: number;
}

type Tab = 'courses' | 'assignments' | 'submissions';

const StudentPanel: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('courses');
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Submit form state
  const [submitTarget, setSubmitTarget] = useState<Assignment | null>(null);
  const [submitText, setSubmitText] = useState('');
  const [submitFile, setSubmitFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getEnrollments().then((d) => setEnrollments(d.enrollments)),
      api.getProgress().then((d) => setProgress(d.progress)),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === 'assignments') api.getAssignments().then((d) => setAssignments(d.assignments)).catch(() => {});
    if (tab === 'submissions') api.getSubmissions().then((d) => setSubmissions(d.submissions)).catch(() => {});
  }, [tab]);

  const getProgressForCourse = (slug: string) => progress.find((p) => p.course_slug === slug);
  const submittedIds = new Set(submissions.map((s) => s.assignment_id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitTarget) return;
    setMsg(''); setErr(''); setSubmitting(true);
    try {
      await api.submitAssignment(submitTarget.id, submitText || undefined, submitFile || undefined);
      setMsg('Assignment submitted successfully!');
      setSubmitTarget(null); setSubmitText(''); setSubmitFile(null);
      api.getSubmissions().then((d) => setSubmissions(d.submissions));
    } catch (e: any) { setErr(e.message); }
    finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="section-shell surface-ring rounded-[32px] border border-white/60 px-6 py-16 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'courses', label: 'My Courses' },
    { key: 'assignments', label: 'Assignments' },
    { key: 'submissions', label: 'My Submissions' },
  ];

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

        <div className="mt-6 flex gap-2 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => { setTab(t.key); setMsg(''); setErr(''); }}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${tab === t.key ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {msg && <div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">{msg}</div>}
        {err && <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{err}</div>}
      </section>

      {/* COURSES TAB */}
      {tab === 'courses' && (
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
      )}

      {/* ASSIGNMENTS TAB */}
      {tab === 'assignments' && (
        <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8">
          <h2 className="font-display text-2xl font-bold text-slate-950 mb-6">Assignments</h2>
          {assignments.length === 0 ? (
            <p className="text-sm text-slate-400">No assignments available yet. Enroll in a course to see assignments.</p>
          ) : (
            <div className="space-y-4">
              {assignments.map((a) => {
                const alreadySubmitted = submittedIds.has(a.id);
                return (
                  <div key={a.id} className="rounded-2xl border border-white/70 bg-white/85 px-6 py-4 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900">{a.title}</h3>
                        <p className="text-sm text-slate-500 mt-1">{a.description}</p>
                        <div className="mt-2 flex gap-3 text-xs text-slate-400">
                          <span className="capitalize">Course: {a.course_slug.replace(/-/g, ' ')}</span>
                          <span>Type: {a.type}</span>
                          {a.due_date && <span>Due: {new Date(a.due_date).toLocaleDateString()}</span>}
                          <span>Max Score: {a.max_score}</span>
                        </div>
                      </div>
                      {alreadySubmitted ? (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">Submitted</span>
                      ) : (
                        <button onClick={() => { setSubmitTarget(a); setMsg(''); setErr(''); }}
                          className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
                          Submit
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Submit Modal */}
          {submitTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                <h3 className="font-display text-xl font-bold text-slate-950 mb-1">Submit: {submitTarget.title}</h3>
                <p className="text-sm text-slate-500 mb-4">{submitTarget.description}</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {(submitTarget.type === 'text' || submitTarget.type === 'file') && (
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Your Answer / Notes</label>
                      <textarea value={submitText} onChange={(e) => setSubmitText(e.target.value)}
                        rows={4} className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900"
                        placeholder="Type your answer here..." />
                    </div>
                  )}
                  {submitTarget.type === 'file' && (
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Upload File (max 10MB)</label>
                      <input type="file" onChange={(e) => setSubmitFile(e.target.files?.[0] || null)}
                        className="w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-emerald-700 hover:file:bg-emerald-100" />
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button type="submit" disabled={submitting}
                      className="rounded-full bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                      {submitting ? 'Submitting...' : 'Submit Assignment'}
                    </button>
                    <button type="button" onClick={() => setSubmitTarget(null)}
                      className="rounded-full border border-slate-200 px-6 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
      )}

      {/* SUBMISSIONS TAB */}
      {tab === 'submissions' && (
        <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8">
          <h2 className="font-display text-2xl font-bold text-slate-950 mb-6">My Submissions</h2>
          {submissions.length === 0 ? (
            <p className="text-sm text-slate-400">You haven't submitted any assignments yet.</p>
          ) : (
            <div className="space-y-4">
              {submissions.map((s) => (
                <div key={s.id} className="rounded-2xl border border-white/70 bg-white/85 px-6 py-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">{s.assignment_title}</h3>
                      <p className="text-xs text-slate-400 mt-1 capitalize">
                        {s.course_slug.replace(/-/g, ' ')} • Submitted {new Date(s.submitted_at).toLocaleDateString()}
                      </p>
                      {s.content && <p className="text-sm text-slate-600 mt-2 line-clamp-2">{s.content}</p>}
                      {s.file_name && <p className="text-sm text-indigo-600 mt-1">📎 {s.file_name}</p>}
                      {s.feedback && (
                        <div className="mt-2 rounded-lg bg-indigo-50 px-3 py-2">
                          <p className="text-xs font-semibold text-indigo-700">Tutor Feedback:</p>
                          <p className="text-sm text-indigo-600">{s.feedback}</p>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${s.status === 'graded' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {s.status}
                      </span>
                      {s.score !== null && (
                        <p className="mt-2 text-lg font-bold text-slate-900">{s.score}/{s.max_score}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default StudentPanel;
