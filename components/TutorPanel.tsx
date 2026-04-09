import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

type Tab = 'courses' | 'classes' | 'create-course' | 'create-class' | 'assignments' | 'submissions' | 'quizzes' | 'create-quiz' | 'quiz-results';

interface TutorCourse {
  id: number; title: string; slug?: string; description: string; level: string; price: number;
  category: string; status: string; created_at: string;
}

interface PrivateClass {
  id: number; title: string; description: string; invite_code: string;
  max_students: number; member_count: number; created_at: string;
}

interface Assignment {
  id: number; course_slug: string; title: string; description: string; type: string; due_date: string; max_score: number;
}

interface Submission {
  id: number; assignment_id: number; student_id: number; student_name: string; content: string;
  file_name: string; score: number | null; feedback: string | null; status: string;
  submitted_at: string; assignment_title?: string; course_slug?: string; max_score?: number;
}

const TutorPanel: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('courses');
  const [courses, setCourses] = useState<TutorCourse[]>([]);
  const [classes, setClasses] = useState<PrivateClass[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
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

  // Assignment form
  const [asnCourse, setAsnCourse] = useState('');
  const [asnTitle, setAsnTitle] = useState('');
  const [asnDesc, setAsnDesc] = useState('');
  const [asnType, setAsnType] = useState('file');
  const [asnDue, setAsnDue] = useState('');
  const [asnMax, setAsnMax] = useState('100');

  // Grading
  const [gradeTarget, setGradeTarget] = useState<Submission | null>(null);
  const [gradeScore, setGradeScore] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [grading, setGrading] = useState(false);

  // Quiz state
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [quizResponses, setQuizResponses] = useState<any[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);

  // Quiz creation form
  const [quizCourse, setQuizCourse] = useState('');
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDesc, setQuizDesc] = useState('');
  const [quizTimeLimit, setQuizTimeLimit] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<Array<{ question_text: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_option: string; points: number }>>([
    { question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'a', points: 1 },
  ]);

  useEffect(() => {
    if (tab === 'courses') api.tutorGetCourses().then((d) => setCourses(d.courses)).catch(() => {});
    if (tab === 'classes') api.tutorGetClasses().then((d) => setClasses(d.classes)).catch(() => {});
    if (tab === 'assignments') {
      api.getAssignments().then((d) => setAssignments(d.assignments)).catch(() => {});
      api.tutorGetCourses().then((d) => setCourses(d.courses)).catch(() => {});
    }
    if (tab === 'submissions') api.getSubmissions().then((d) => setSubmissions(d.submissions)).catch(() => {});
    if (tab === 'quizzes' || tab === 'create-quiz') {
      api.getQuizzes().then((d) => setQuizzes(d.quizzes)).catch(() => {});
      api.tutorGetCourses().then((d) => setCourses(d.courses)).catch(() => {});
    }
    if (tab === 'quiz-results') api.getQuizResponses().then((d) => setQuizResponses(d.responses)).catch(() => {});
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

  const createAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(''); setErr('');
    try {
      await api.createAssignment({
        course_slug: asnCourse, title: asnTitle, description: asnDesc,
        type: asnType, due_date: asnDue || undefined, max_score: parseInt(asnMax),
      });
      setMsg('Assignment created!');
      setAsnTitle(''); setAsnDesc(''); setAsnDue('');
      setTab('assignments');
    } catch (e: any) { setErr(e.message); }
  };

  const handleGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeTarget) return;
    setGrading(true);
    try {
      await api.gradeSubmission(gradeTarget.id, parseInt(gradeScore), gradeFeedback || undefined);
      setMsg('Submission graded!');
      setGradeTarget(null); setGradeScore(''); setGradeFeedback('');
      api.getSubmissions().then((d) => setSubmissions(d.submissions));
    } catch (e: any) { setErr(e.message); }
    finally { setGrading(false); }
  };

  const addQuestion = () => {
    setQuizQuestions([...quizQuestions, { question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'a', points: 1 }]);
  };

  const removeQuestion = (idx: number) => {
    if (quizQuestions.length <= 1) return;
    setQuizQuestions(quizQuestions.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, field: string, value: string | number) => {
    setQuizQuestions(quizQuestions.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const createQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(''); setErr('');
    try {
      await api.createQuiz({
        course_slug: quizCourse,
        title: quizTitle,
        description: quizDesc || undefined,
        time_limit_minutes: quizTimeLimit ? parseInt(quizTimeLimit) : undefined,
        questions: quizQuestions,
      });
      setMsg('Quiz created successfully!');
      setQuizTitle(''); setQuizDesc(''); setQuizTimeLimit('');
      setQuizQuestions([{ question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'a', points: 1 }]);
      setTab('quizzes');
    } catch (e: any) { setErr(e.message); }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'courses', label: 'My Courses' },
    { key: 'create-course', label: 'Submit Course' },
    { key: 'assignments', label: 'Assignments' },
    { key: 'submissions', label: 'Grade Submissions' },
    { key: 'quizzes', label: 'Quizzes' },
    { key: 'create-quiz', label: 'Create Quiz' },
    { key: 'quiz-results', label: 'Quiz Results' },
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
              className={`rounded-full px-5 py-2 text-sm font-semibold transition whitespace-nowrap ${tab === t.key ? 'bg-amber-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
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

      {/* ASSIGNMENTS TAB */}
      {tab === 'assignments' && (
        <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8">
          <h2 className="font-display text-2xl font-bold text-slate-950 mb-6">My Assignments</h2>
          {assignments.length > 0 && (
            <div className="space-y-4 mb-8">
              {assignments.map((a) => (
                <div key={a.id} className="rounded-2xl border border-white/70 bg-white/85 px-6 py-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">{a.title}</h3>
                      <p className="text-sm text-slate-500 mt-1">{a.description}</p>
                      <div className="mt-2 flex gap-3 text-xs text-slate-400">
                        <span className="capitalize">Course: {a.course_slug.replace(/-/g, ' ')}</span>
                        <span>Type: {a.type}</span>
                        {a.due_date && <span>Due: {new Date(a.due_date).toLocaleDateString()}</span>}
                        <span>Max: {a.max_score}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h3 className="font-display text-xl font-bold text-slate-950 mb-4">Create Assignment</h3>
          <form onSubmit={createAssignment} className="max-w-lg space-y-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Course *</label>
              <select value={asnCourse} onChange={(e) => setAsnCourse(e.target.value)} required
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900">
                <option value="">Select a course...</option>
                {courses.filter(c => c.status === 'approved').map((c) => (
                  <option key={c.id} value={c.slug || c.title.toLowerCase().replace(/\s+/g, '-')}>{c.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Title *</label>
              <input value={asnTitle} onChange={(e) => setAsnTitle(e.target.value)} required
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900" />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Description</label>
              <textarea value={asnDesc} onChange={(e) => setAsnDesc(e.target.value)} rows={3}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Type</label>
                <select value={asnType} onChange={(e) => setAsnType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900">
                  <option value="file">File Upload</option>
                  <option value="text">Text Only</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Due Date</label>
                <input type="date" value={asnDue} onChange={(e) => setAsnDue(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Max Score</label>
                <input type="number" min="1" value={asnMax} onChange={(e) => setAsnMax(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900" />
              </div>
            </div>
            <button type="submit" className="rounded-full bg-amber-600 px-6 py-2 text-sm font-semibold text-white hover:bg-amber-700">
              Create Assignment
            </button>
          </form>
        </section>
      )}

      {/* SUBMISSIONS / GRADING TAB */}
      {tab === 'submissions' && (
        <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8">
          <h2 className="font-display text-2xl font-bold text-slate-950 mb-6">Student Submissions</h2>
          {submissions.length === 0 ? (
            <p className="text-sm text-slate-400">No submissions yet.</p>
          ) : (
            <div className="space-y-4">
              {submissions.map((s) => (
                <div key={s.id} className="rounded-2xl border border-white/70 bg-white/85 px-6 py-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">{s.student_name}</h3>
                      {s.assignment_title && (
                        <p className="text-sm text-slate-500 mt-1">Assignment: {s.assignment_title}</p>
                      )}
                      {s.content && <p className="text-sm text-slate-600 mt-2 line-clamp-3">{s.content}</p>}
                      {s.file_name && <p className="text-sm text-indigo-600 mt-1">📎 {s.file_name}</p>}
                      <p className="text-xs text-slate-400 mt-1">Submitted: {new Date(s.submitted_at).toLocaleString()}</p>
                      {s.feedback && (
                        <div className="mt-2 rounded-lg bg-green-50 px-3 py-2">
                          <p className="text-xs font-semibold text-green-700">Your Feedback:</p>
                          <p className="text-sm text-green-600">{s.feedback}</p>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      {s.status === 'graded' ? (
                        <div>
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">Graded</span>
                          <p className="mt-2 text-lg font-bold text-slate-900">{s.score}/{s.max_score || 100}</p>
                        </div>
                      ) : (
                        <button onClick={() => { setGradeTarget(s); setGradeScore(''); setGradeFeedback(''); }}
                          className="rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700">
                          Grade
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Grade Modal */}
          {gradeTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                <h3 className="font-display text-xl font-bold text-slate-950 mb-1">Grade Submission</h3>
                <p className="text-sm text-slate-500 mb-4">Student: {gradeTarget.student_name}</p>
                {gradeTarget.content && (
                  <div className="mb-4 rounded-xl bg-slate-50 p-3 max-h-40 overflow-y-auto">
                    <p className="text-sm text-slate-700">{gradeTarget.content}</p>
                  </div>
                )}
                {gradeTarget.file_name && (
                  <p className="text-sm text-indigo-600 mb-4">📎 {gradeTarget.file_name}</p>
                )}
                <form onSubmit={handleGrade} className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Score (max {gradeTarget.max_score || 100})</label>
                    <input type="number" min="0" max={gradeTarget.max_score || 100} value={gradeScore}
                      onChange={(e) => setGradeScore(e.target.value)} required
                      className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Feedback (optional)</label>
                    <textarea value={gradeFeedback} onChange={(e) => setGradeFeedback(e.target.value)} rows={3}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900"
                      placeholder="Write feedback for the student..." />
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" disabled={grading}
                      className="rounded-full bg-amber-600 px-6 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
                      {grading ? 'Saving...' : 'Submit Grade'}
                    </button>
                    <button type="button" onClick={() => setGradeTarget(null)}
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

      {/* QUIZZES LIST */}
      {tab === 'quizzes' && (
        <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8">
          <h2 className="font-display text-2xl font-bold text-slate-950 mb-6">My Quizzes</h2>
          {quizzes.length === 0 ? (
            <p className="text-sm text-slate-400">You haven't created any quizzes yet.</p>
          ) : (
            <div className="space-y-4">
              {quizzes.map((q: any) => (
                <div key={q.id} className="rounded-2xl border border-white/70 bg-white/85 px-6 py-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">{q.title}</h3>
                      {q.description && <p className="text-sm text-slate-500 mt-1">{q.description}</p>}
                      <div className="mt-2 flex gap-3 text-xs text-slate-400">
                        <span className="capitalize">Course: {q.course_slug.replace(/-/g, ' ')}</span>
                        {q.time_limit_minutes && <span>Time: {q.time_limit_minutes} min</span>}
                        <span>{q.question_count || 0} questions</span>
                        <span>Created: {new Date(q.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* CREATE QUIZ */}
      {tab === 'create-quiz' && (
        <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8">
          <h2 className="font-display text-2xl font-bold text-slate-950 mb-6">Create a Quiz</h2>
          <form onSubmit={createQuiz} className="space-y-6">
            <div className="max-w-lg space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Course *</label>
                <select value={quizCourse} onChange={(e) => setQuizCourse(e.target.value)} required
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900">
                  <option value="">Select a course...</option>
                  {courses.filter(c => c.status === 'approved').map((c) => (
                    <option key={c.id} value={c.slug || c.title.toLowerCase().replace(/\s+/g, '-')}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Quiz Title *</label>
                <input value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} required
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Description</label>
                <textarea value={quizDesc} onChange={(e) => setQuizDesc(e.target.value)} rows={2}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Time Limit (minutes, optional)</label>
                <input type="number" min="1" value={quizTimeLimit} onChange={(e) => setQuizTimeLimit(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900" placeholder="No limit" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-xl font-bold text-slate-950">Questions</h3>
                <button type="button" onClick={addQuestion}
                  className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                  + Add Question
                </button>
              </div>

              <div className="space-y-6">
                {quizQuestions.map((q, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-200 bg-white/85 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-slate-700">Question {idx + 1}</span>
                      {quizQuestions.length > 1 && (
                        <button type="button" onClick={() => removeQuestion(idx)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium">Remove</button>
                      )}
                    </div>
                    <div className="space-y-3">
                      <input value={q.question_text} onChange={(e) => updateQuestion(idx, 'question_text', e.target.value)}
                        required placeholder="Enter your question..."
                        className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-900" />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 w-4">A</span>
                          <input value={q.option_a} onChange={(e) => updateQuestion(idx, 'option_a', e.target.value)}
                            required placeholder="Option A"
                            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 w-4">B</span>
                          <input value={q.option_b} onChange={(e) => updateQuestion(idx, 'option_b', e.target.value)}
                            required placeholder="Option B"
                            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 w-4">C</span>
                          <input value={q.option_c} onChange={(e) => updateQuestion(idx, 'option_c', e.target.value)}
                            required placeholder="Option C"
                            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 w-4">D</span>
                          <input value={q.option_d} onChange={(e) => updateQuestion(idx, 'option_d', e.target.value)}
                            required placeholder="Option D"
                            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Correct Answer</label>
                          <select value={q.correct_option} onChange={(e) => updateQuestion(idx, 'correct_option', e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900">
                            <option value="a">A</option><option value="b">B</option>
                            <option value="c">C</option><option value="d">D</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Points</label>
                          <input type="number" min="1" value={q.points}
                            onChange={(e) => updateQuestion(idx, 'points', parseInt(e.target.value) || 1)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="rounded-full bg-amber-600 px-6 py-2 text-sm font-semibold text-white hover:bg-amber-700">
              Create Quiz
            </button>
          </form>
        </section>
      )}

      {/* QUIZ RESULTS */}
      {tab === 'quiz-results' && (
        <section className="section-shell surface-ring rounded-[32px] border border-white/70 px-6 py-8">
          <h2 className="font-display text-2xl font-bold text-slate-950 mb-6">Quiz Results</h2>
          {quizResponses.length === 0 ? (
            <p className="text-sm text-slate-400">No quiz submissions yet.</p>
          ) : (
            <div className="space-y-4">
              {quizResponses.map((r: any) => (
                <div key={r.id} className="rounded-2xl border border-white/70 bg-white/85 px-6 py-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">{r.student_name}</h3>
                      <p className="text-sm text-slate-500 mt-1">Quiz: {r.quiz_title}</p>
                      <div className="mt-1 flex gap-3 text-xs text-slate-400">
                        <span className="capitalize">{(r.course_slug || '').replace(/-/g, ' ')}</span>
                        <span>Submitted: {new Date(r.submitted_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">{r.score}/{r.max_score}</p>
                      <p className="text-xs text-slate-400">{r.max_score > 0 ? Math.round((r.score / r.max_score) * 100) : 0}%</p>
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

export default TutorPanel;
