import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import LiveClassroom from './LiveClassroom';

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

type Tab = 'courses' | 'assignments' | 'submissions' | 'quizzes' | 'materials' | 'live';

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

  // Quiz state
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [quizResponses, setQuizResponses] = useState<any[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<any | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<any[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<{ score: number; max_score: number; percentage: number } | null>(null);

  // Materials state
  const [materials, setMaterials] = useState<any[]>([]);

  // Live session state
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

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
    if (tab === 'quizzes') {
      api.getQuizzes().then((d) => setQuizzes(d.quizzes)).catch(() => {});
      api.getQuizResponses().then((d) => setQuizResponses(d.responses)).catch(() => {});
    }
    if (tab === 'materials') api.getMaterials().then((d) => setMaterials(d.materials)).catch(() => {});
    if (tab === 'live') api.getLiveSessions().then((d) => setLiveSessions(d.sessions)).catch(() => {});
  }, [tab]);

  const getProgressForCourse = (slug: string) => progress.find((p) => p.course_slug === slug);
  const submittedIds = new Set(submissions.map((s) => s.assignment_id));
  const completedQuizIds = new Set(quizResponses.map((r: any) => r.quiz_id));

  const getYouTubeId = (url: string) => {
    const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const openQuiz = async (quiz: any) => {
    try {
      const data = await api.getQuiz(quiz.id);
      setActiveQuiz(data.quiz);
      setActiveQuestions(data.questions);
      setQuizAnswers({});
      setQuizResult(null);
    } catch (e: any) { setErr(e.message); }
  };

  const submitQuiz = async () => {
    if (!activeQuiz) return;
    setQuizSubmitting(true); setErr('');
    try {
      const answers = Object.entries(quizAnswers).map(([qId, opt]) => ({
        question_id: parseInt(qId),
        selected_option: opt,
      }));
      const result = await api.submitQuizResponse(activeQuiz.id, answers);
      setQuizResult({ score: result.score, max_score: result.max_score, percentage: result.percentage });
      api.getQuizResponses().then((d) => setQuizResponses(d.responses)).catch(() => {});
    } catch (e: any) { setErr(e.message); }
    finally { setQuizSubmitting(false); }
  };

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
    { key: 'materials', label: 'Materials' },
    { key: 'assignments', label: 'Assignments' },
    { key: 'submissions', label: 'My Submissions' },
    { key: 'quizzes', label: 'Quizzes' },
    { key: 'live', label: '🔴 Live Classes' },
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

      {/* MATERIALS TAB */}
      {tab === 'materials' && (
        <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8">
          <h2 className="font-display text-2xl font-bold text-slate-950 mb-6">Course Materials</h2>
          {materials.length === 0 ? (
            <p className="text-sm text-slate-400">No materials available yet. Enroll in a course to see materials.</p>
          ) : (
            <div className="space-y-4">
              {materials.map((m: any) => {
                const isYouTube = m.type === 'youtube' && m.youtube_url;
                const ytId = isYouTube ? getYouTubeId(m.youtube_url) : null;
                const isImage = m.mime_type?.startsWith('image/');
                const isVideo = m.mime_type?.startsWith('video/');
                const token = localStorage.getItem('auth_token');
                const downloadUrl = `${api.getMaterialDownloadUrl(m.id)}&token=${token || ''}`;

                return (
                  <div key={m.id} className="rounded-2xl border border-white/70 bg-white/85 px-6 py-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{isYouTube ? '🎬' : isImage ? '🖼️' : isVideo ? '🎥' : m.mime_type === 'application/pdf' ? '📄' : '📎'}</span>
                          <h3 className="font-semibold text-slate-900">{m.title}</h3>
                        </div>
                        {m.description && <p className="text-sm text-slate-500 mt-1">{m.description}</p>}
                        <div className="mt-1 flex gap-3 text-xs text-slate-400">
                          <span className="capitalize">{m.course_slug.replace(/-/g, ' ')}</span>
                          {m.file_size && <span>{formatFileSize(m.file_size)}</span>}
                          <span>{new Date(m.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {!isYouTube && (
                        <a href={downloadUrl} target="_blank" rel="noopener noreferrer"
                          className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
                          {isImage || m.mime_type === 'application/pdf' ? 'View' : 'Download'}
                        </a>
                      )}
                    </div>

                    {/* YouTube embed */}
                    {ytId && (
                      <div className="mt-3 aspect-video rounded-xl overflow-hidden bg-black">
                        <iframe
                          src={`https://www.youtube.com/embed/${ytId}`}
                          title={m.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="w-full h-full"
                        />
                      </div>
                    )}

                    {/* Image preview */}
                    {isImage && (
                      <div className="mt-3">
                        <img src={downloadUrl} alt={m.title} className="max-h-64 rounded-xl object-contain" />
                      </div>
                    )}

                    {/* Video player */}
                    {isVideo && !isYouTube && (
                      <div className="mt-3 rounded-xl overflow-hidden bg-black">
                        <video controls className="w-full max-h-96">
                          <source src={downloadUrl} type={m.mime_type} />
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* QUIZZES TAB */}
      {tab === 'quizzes' && (
        <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8">
          <h2 className="font-display text-2xl font-bold text-slate-950 mb-6">Quizzes</h2>

          {/* Active Quiz / Taking a Quiz */}
          {activeQuiz && !quizResult && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold text-slate-900">{activeQuiz.title}</h3>
                  {activeQuiz.description && <p className="text-sm text-slate-500 mt-1">{activeQuiz.description}</p>}
                  {activeQuiz.time_limit_minutes && (
                    <p className="text-xs text-amber-600 mt-1">⏱ Time limit: {activeQuiz.time_limit_minutes} minutes</p>
                  )}
                </div>
                <button onClick={() => { setActiveQuiz(null); setActiveQuestions([]); }}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
              </div>

              {activeQuestions.map((q: any, idx: number) => (
                <div key={q.id} className="rounded-2xl border border-slate-200 bg-white/85 p-5">
                  <p className="font-semibold text-slate-900 mb-3">
                    <span className="text-slate-400 text-sm mr-2">Q{idx + 1}.</span>
                    {q.question_text}
                    <span className="text-xs text-slate-400 ml-2">({q.points} pt{q.points > 1 ? 's' : ''})</span>
                  </p>
                  <div className="space-y-2">
                    {['a', 'b', 'c', 'd'].map((opt) => (
                      <label key={opt}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition ${quizAnswers[q.id] === opt ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <input type="radio" name={`q-${q.id}`} value={opt}
                          checked={quizAnswers[q.id] === opt}
                          onChange={() => setQuizAnswers({ ...quizAnswers, [q.id]: opt })}
                          className="accent-emerald-600" />
                        <span className="text-xs font-bold text-slate-400 uppercase">{opt}.</span>
                        <span className="text-sm text-slate-700">{q[`option_${opt}`]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <button onClick={submitQuiz} disabled={quizSubmitting || Object.keys(quizAnswers).length === 0}
                className="rounded-full bg-emerald-600 px-8 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                {quizSubmitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            </div>
          )}

          {/* Quiz Result */}
          {quizResult && (
            <div className="text-center py-8">
              <div className="mx-auto w-32 h-32 rounded-full border-8 border-emerald-100 flex items-center justify-center mb-4">
                <span className="font-display text-3xl font-bold text-emerald-600">{quizResult.percentage}%</span>
              </div>
              <h3 className="font-display text-xl font-bold text-slate-900">Quiz Complete!</h3>
              <p className="text-slate-500 mt-1">You scored {quizResult.score} out of {quizResult.max_score}</p>
              <button onClick={() => { setActiveQuiz(null); setActiveQuestions([]); setQuizResult(null); }}
                className="mt-4 rounded-full bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                Back to Quizzes
              </button>
            </div>
          )}

          {/* Available Quizzes List */}
          {!activeQuiz && !quizResult && (
            <>
              {quizzes.length === 0 ? (
                <p className="text-sm text-slate-400">No quizzes available yet. Enroll in a course to see quizzes.</p>
              ) : (
                <div className="space-y-4">
                  {quizzes.map((q: any) => {
                    const done = completedQuizIds.has(q.id);
                    const resp = quizResponses.find((r: any) => r.quiz_id === q.id);
                    return (
                      <div key={q.id} className="rounded-2xl border border-white/70 bg-white/85 px-6 py-4 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-slate-900">{q.title}</h3>
                            {q.description && <p className="text-sm text-slate-500 mt-1">{q.description}</p>}
                            <div className="mt-2 flex gap-3 text-xs text-slate-400">
                              <span className="capitalize">Course: {q.course_slug.replace(/-/g, ' ')}</span>
                              {q.time_limit_minutes && <span>⏱ {q.time_limit_minutes} min</span>}
                              <span>{q.question_count || 0} questions</span>
                            </div>
                          </div>
                          <div className="text-right">
                            {done ? (
                              <div>
                                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">Completed</span>
                                {resp && <p className="mt-2 text-lg font-bold text-slate-900">{resp.score}/{resp.max_score}</p>}
                              </div>
                            ) : (
                              <button onClick={() => openQuiz(q)}
                                className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
                                Take Quiz
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* LIVE CLASSES TAB */}
      {tab === 'live' && (
        activeSessionId ? (
          <LiveClassroom sessionId={activeSessionId} onLeave={() => { setActiveSessionId(null); api.getLiveSessions().then((d) => setLiveSessions(d.sessions)).catch(() => {}); }} />
        ) : (
          <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8">
            <h2 className="font-display text-2xl font-bold text-slate-950 mb-6">Live Classes</h2>
            {liveSessions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400">
                    <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" /><rect x="2" y="6" width="14" height="12" rx="2" />
                  </svg>
                </div>
                <p className="text-slate-500 font-medium">No live sessions right now</p>
                <p className="text-sm text-slate-400 mt-1">When your teacher starts a live class, it will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {liveSessions.map((s: any) => (
                  <div key={s.id} className="rounded-2xl border border-red-200 bg-red-50/50 px-6 py-4 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                          </span>
                          <span className="text-xs font-bold uppercase tracking-wider text-red-600">Live Now</span>
                        </div>
                        <h3 className="font-semibold text-slate-900">{s.title || s.class_title}</h3>
                        <p className="text-sm text-slate-500 mt-1">{s.class_title} &middot; {s.member_count || 0} members</p>
                        <p className="text-xs text-slate-400 mt-1">Started: {new Date(s.started_at).toLocaleString()}</p>
                      </div>
                      <button
                        onClick={() => setActiveSessionId(s.id)}
                        className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700">
                        Join Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      )}
    </div>
  );
};

export default StudentPanel;
