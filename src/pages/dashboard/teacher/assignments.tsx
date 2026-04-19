import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { api } from '../../../../lib/api';

type TabType = 'all' | 'create' | 'submissions' | 'review';

interface CourseRecord { id: number; slug: string; title: string }
interface AssignmentRecord {
  id: number; course_slug: string; title: string; description?: string;
  type?: string; due_date?: string; max_score?: number; created_at?: string;
}
interface SubmissionRecord {
  id: number; assignment_id: number; student_id: number; content?: string;
  file_name?: string; file_key?: string; score?: number | null; feedback?: string | null;
  status?: string; submitted_at?: string; graded_at?: string;
  student_name?: string; student_email?: string; assignment_title?: string; course_slug?: string;
}

const formatDate = (v?: string | null) => v ? new Date(v).toLocaleDateString() : '—';

export default function TeacherAssignments() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [formCourse, setFormCourse] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDue, setFormDue] = useState('');
  const [formMax, setFormMax] = useState('100');

  const [gradingId, setGradingId] = useState<number | null>(null);
  const [gradeScore, setGradeScore] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [cRes, aRes, sRes] = await Promise.all([
        api.tutorGetCourses(),
        api.getAssignments(),
        api.getSubmissions(),
      ]);
      setCourses((cRes.courses || []) as CourseRecord[]);
      setAssignments((aRes.assignments || []) as AssignmentRecord[]);
      setSubmissions((sRes.submissions || []) as SubmissionRecord[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCourse || !formTitle.trim()) { setError('Course and title are required.'); return; }
    setSaving(true); setError(''); setMessage('');
    try {
      await api.createAssignment({
        course_slug: formCourse,
        title: formTitle.trim(),
        description: formDesc.trim() || undefined,
        due_date: formDue || undefined,
        max_score: formMax ? Number(formMax) : undefined,
      });
      setFormTitle(''); setFormDesc(''); setFormDue(''); setFormMax('100');
      setMessage('Assignment created.');
      await load();
      setActiveTab('all');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create assignment.');
    } finally { setSaving(false); }
  };

  const handleGrade = async () => {
    if (!gradingId || !gradeScore) return;
    setSaving(true); setError(''); setMessage('');
    try {
      await api.gradeSubmission(gradingId, Number(gradeScore), gradeFeedback.trim() || undefined);
      setGradingId(null); setGradeScore(''); setGradeFeedback('');
      setMessage('Submission graded.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to grade submission.');
    } finally { setSaving(false); }
  };

  const submissionCountFor = (assignmentId: number) =>
    submissions.filter(s => s.assignment_id === assignmentId).length;

  const ungradedSubmissions = submissions.filter(s => s.score === null || s.score === undefined);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Assignments</h1>

        {message && (
          <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-lg">
            {message}
          </div>
        )}
        {error && (
          <div className="bg-rose-500/20 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-1 bg-white/5 p-1 rounded-lg">
          {([
            { key: 'all' as TabType, label: 'All Assignments' },
            { key: 'create' as TabType, label: 'Create Assignment', icon: '➕' },
            { key: 'submissions' as TabType, label: 'Submissions' },
            { key: 'review' as TabType, label: `Review (${ungradedSubmissions.length})` },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.icon && <span className="mr-1">{tab.icon}</span>}
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-white/60">Loading…</div>
        ) : (
          <>
            {activeTab === 'all' && (
              <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden">
                <div className="p-6">
                  {assignments.length === 0 ? (
                    <p className="text-center text-white/50 py-8">No assignments yet. Create one to get started.</p>
                  ) : (
                    <div className="space-y-4">
                      {assignments.map(a => (
                        <div key={a.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                          <div>
                            <h3 className="font-semibold">{a.title}</h3>
                            <p className="text-sm text-white/70">
                              {a.course_slug} • Due: {formatDate(a.due_date)} • {submissionCountFor(a.id)} submissions
                            </p>
                            {a.description && <p className="text-sm text-white/50 mt-1">{a.description}</p>}
                          </div>
                          <div className="flex space-x-2">
                            {a.max_score && (
                              <span className="px-3 py-1 bg-white/10 text-white/70 rounded text-sm">
                                Max: {a.max_score}
                              </span>
                            )}
                            <button
                              onClick={() => setActiveTab('submissions')}
                              className="px-3 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded transition-colors"
                            >
                              View Submissions
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'create' && (
              <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm p-6">
                <h2 className="text-xl font-semibold mb-6">Create New Assignment</h2>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Course</label>
                    <select
                      value={formCourse}
                      onChange={e => setFormCourse(e.target.value)}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select a course</option>
                      {courses.map(c => (
                        <option key={c.slug} value={c.slug}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Assignment Title</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={e => setFormTitle(e.target.value)}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter assignment title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      value={formDesc}
                      onChange={e => setFormDesc(e.target.value)}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      rows={4}
                      placeholder="Describe the assignment requirements"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Due Date</label>
                      <input
                        type="date"
                        value={formDue}
                        onChange={e => setFormDue(e.target.value)}
                        className="w-full p-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Max Score</label>
                      <input
                        type="number"
                        value={formMax}
                        onChange={e => setFormMax(e.target.value)}
                        className="w-full p-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="100"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    {saving ? 'Creating…' : 'Create Assignment'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'submissions' && (
              <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden">
                <div className="p-6">
                  <h2 className="text-lg font-semibold mb-4">All Submissions</h2>
                  {submissions.length === 0 ? (
                    <p className="text-center text-white/50 py-8">No submissions yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-white/20">
                            <th className="p-4 font-semibold">Student</th>
                            <th className="p-4 font-semibold">Assignment</th>
                            <th className="p-4 font-semibold">Submitted</th>
                            <th className="p-4 font-semibold">Score</th>
                            <th className="p-4 font-semibold">Status</th>
                            <th className="p-4 font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {submissions.map(s => (
                            <tr key={s.id} className="border-b border-white/10">
                              <td className="p-4">{s.student_name || s.student_email || `Student #${s.student_id}`}</td>
                              <td className="p-4">{s.assignment_title || `Assignment #${s.assignment_id}`}</td>
                              <td className="p-4 text-sm">{formatDate(s.submitted_at)}</td>
                              <td className="p-4">
                                {s.score != null ? (
                                  <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded">
                                    {s.score}
                                  </span>
                                ) : (
                                  <span className="text-white/50">Pending</span>
                                )}
                              </td>
                              <td className="p-4 text-sm capitalize">{s.status || 'submitted'}</td>
                              <td className="p-4">
                                <button
                                  onClick={() => { setGradingId(s.id); setGradeScore(''); setGradeFeedback(''); setActiveTab('review'); }}
                                  className="px-3 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded transition-colors"
                                >
                                  Grade
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'review' && (
              <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm p-6">
                <h2 className="text-lg font-semibold mb-4">Review &amp; Grade Submissions</h2>
                {ungradedSubmissions.length === 0 ? (
                  <p className="text-center text-white/50 py-8">All submissions have been graded!</p>
                ) : (
                  <div className="space-y-4">
                    {ungradedSubmissions.map(s => (
                      <div key={s.id} className="p-4 bg-white/5 rounded-lg">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold">{s.student_name || `Student #${s.student_id}`}</h3>
                            <p className="text-sm text-white/70">{s.assignment_title || `Assignment #${s.assignment_id}`}</p>
                          </div>
                          <span className="text-sm text-white/50">{formatDate(s.submitted_at)}</span>
                        </div>
                        {s.content && (
                          <div className="mb-4 p-3 bg-white/5 rounded text-sm text-white/80">
                            {s.content}
                          </div>
                        )}
                        {s.file_name && (
                          <p className="text-sm text-indigo-400 mb-4">📎 {s.file_name}</p>
                        )}
                        {gradingId === s.id ? (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium mb-1">Score</label>
                              <input
                                type="number"
                                value={gradeScore}
                                onChange={e => setGradeScore(e.target.value)}
                                className="w-full p-2 bg-white/10 border border-white/20 rounded focus:ring-2 focus:ring-indigo-500"
                                placeholder="e.g. 85"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Feedback</label>
                              <textarea
                                value={gradeFeedback}
                                onChange={e => setGradeFeedback(e.target.value)}
                                className="w-full p-2 bg-white/10 border border-white/20 rounded focus:ring-2 focus:ring-indigo-500"
                                rows={3}
                                placeholder="Provide feedback for the student"
                              />
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={handleGrade}
                                disabled={saving}
                                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2 rounded font-semibold transition-colors"
                              >
                                {saving ? 'Saving…' : 'Submit Grade'}
                              </button>
                              <button
                                onClick={() => setGradingId(null)}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setGradingId(s.id); setGradeScore(''); setGradeFeedback(''); }}
                            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded font-semibold transition-colors"
                          >
                            Grade This
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}