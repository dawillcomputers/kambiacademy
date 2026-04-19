import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { api } from '../../../../lib/api';

type TabType = 'all' | 'create' | 'results';

interface CourseRecord { id: number; slug: string; title: string }
interface QuizRecord {
  id: number; course_slug: string; title: string; description?: string;
  time_limit_minutes?: number; created_at?: string;
}
interface QuizResponseRecord {
  id: number; quiz_id: number; student_id: number; answers?: string;
  score?: number | null; max_score?: number | null; submitted_at?: string;
  student_name?: string; quiz_title?: string; course_slug?: string;
}
interface QuestionForm {
  question_text: string; option_a: string; option_b: string;
  option_c: string; option_d: string; correct_option: string; points: number;
}

const emptyQuestion = (): QuestionForm => ({
  question_text: '', option_a: '', option_b: '', option_c: '', option_d: '',
  correct_option: 'A', points: 1,
});

const formatDate = (v?: string | null) => v ? new Date(v).toLocaleDateString() : '—';

export default function TeacherQuizzes() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [quizzes, setQuizzes] = useState<QuizRecord[]>([]);
  const [responses, setResponses] = useState<QuizResponseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // create form
  const [formCourse, setFormCourse] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formTime, setFormTime] = useState('60');
  const [questions, setQuestions] = useState<QuestionForm[]>([emptyQuestion()]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [cRes, qRes, rRes] = await Promise.all([
        api.tutorGetCourses(),
        api.getQuizzes(),
        api.getQuizResponses(),
      ]);
      setCourses((cRes.courses || []) as CourseRecord[]);
      setQuizzes((qRes.quizzes || []) as QuizRecord[]);
      setResponses((rRes.responses || []) as QuizResponseRecord[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const updateQuestion = (idx: number, field: keyof QuestionForm, value: string | number) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const addQuestion = () => setQuestions(prev => [...prev, emptyQuestion()]);
  const removeQuestion = (idx: number) => setQuestions(prev => prev.filter((_, i) => i !== idx));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCourse || !formTitle.trim()) { setError('Course and title are required.'); return; }
    if (questions.some(q => !q.question_text.trim())) { setError('All questions must have text.'); return; }
    setSaving(true); setError(''); setMessage('');
    try {
      await api.createQuiz({
        course_slug: formCourse,
        title: formTitle.trim(),
        description: formDesc.trim() || undefined,
        time_limit_minutes: formTime ? Number(formTime) : undefined,
        questions: questions.map(q => ({
          question_text: q.question_text.trim(),
          option_a: q.option_a.trim(),
          option_b: q.option_b.trim(),
          option_c: q.option_c.trim(),
          option_d: q.option_d.trim(),
          correct_option: q.correct_option,
          points: q.points,
        })),
      });
      setFormTitle(''); setFormDesc(''); setFormTime('60');
      setQuestions([emptyQuestion()]);
      setMessage('Quiz created.');
      await load();
      setActiveTab('all');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create quiz.');
    } finally { setSaving(false); }
  };

  const responseCountFor = (quizId: number) =>
    responses.filter(r => r.quiz_id === quizId).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Quizzes</h1>

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
            { key: 'all' as TabType, label: 'All Quizzes' },
            { key: 'create' as TabType, label: 'Create Quiz', icon: '➕' },
            { key: 'results' as TabType, label: 'Results' },
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
            {/* All Quizzes */}
            {activeTab === 'all' && (
              <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden">
                <div className="p-6">
                  {quizzes.length === 0 ? (
                    <p className="text-center text-white/50 py-8">No quizzes yet. Create one to get started.</p>
                  ) : (
                    <div className="space-y-4">
                      {quizzes.map(q => (
                        <div key={q.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                          <div>
                            <h3 className="font-semibold">{q.title}</h3>
                            <p className="text-sm text-white/70">
                              {q.course_slug}
                              {q.time_limit_minutes ? ` • ${q.time_limit_minutes} min` : ''}
                              {` • ${responseCountFor(q.id)} responses`}
                            </p>
                            {q.description && <p className="text-sm text-white/50 mt-1">{q.description}</p>}
                          </div>
                          <button
                            onClick={() => setActiveTab('results')}
                            className="px-3 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded transition-colors"
                          >
                            View Results
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Create Quiz */}
            {activeTab === 'create' && (
              <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm p-6">
                <h2 className="text-xl font-semibold mb-6">Create New Quiz</h2>
                <form onSubmit={handleCreate} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
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
                      <label className="block text-sm font-medium mb-2">Time Limit (minutes)</label>
                      <input
                        type="number"
                        value={formTime}
                        onChange={e => setFormTime(e.target.value)}
                        className="w-full p-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="60"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Quiz Title</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={e => setFormTitle(e.target.value)}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter quiz title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      value={formDesc}
                      onChange={e => setFormDesc(e.target.value)}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      rows={3}
                      placeholder="Describe the quiz"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Questions ({questions.length})</h3>
                      <button
                        type="button"
                        onClick={addQuestion}
                        className="bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded text-sm font-semibold transition-colors"
                      >
                        Add Question
                      </button>
                    </div>
                    <div className="space-y-4">
                      {questions.map((q, idx) => (
                        <div key={idx} className="p-4 bg-white/5 rounded-lg">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-sm font-medium text-white/70">Question {idx + 1}</span>
                            {questions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeQuestion(idx)}
                                className="text-rose-400 hover:text-rose-300 text-sm"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <div className="mb-3">
                            <input
                              type="text"
                              value={q.question_text}
                              onChange={e => updateQuestion(idx, 'question_text', e.target.value)}
                              className="w-full p-2 bg-white/10 border border-white/20 rounded focus:ring-2 focus:ring-indigo-500"
                              placeholder="Question text"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            {(['A', 'B', 'C', 'D'] as const).map(letter => (
                              <div key={letter}>
                                <label className="block text-xs text-white/70 mb-1">{letter})</label>
                                <input
                                  type="text"
                                  value={q[`option_${letter.toLowerCase()}` as keyof QuestionForm] as string}
                                  onChange={e => updateQuestion(idx, `option_${letter.toLowerCase()}` as keyof QuestionForm, e.target.value)}
                                  className="w-full p-2 bg-white/10 border border-white/20 rounded focus:ring-2 focus:ring-indigo-500"
                                  placeholder={`Option ${letter}`}
                                />
                              </div>
                            ))}
                          </div>
                          <div className="flex space-x-4">
                            <div>
                              <label className="block text-xs text-white/70 mb-1">Correct Answer</label>
                              <select
                                value={q.correct_option}
                                onChange={e => updateQuestion(idx, 'correct_option', e.target.value)}
                                className="p-2 bg-white/10 border border-white/20 rounded focus:ring-2 focus:ring-indigo-500"
                              >
                                <option>A</option>
                                <option>B</option>
                                <option>C</option>
                                <option>D</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-white/70 mb-1">Points</label>
                              <input
                                type="number"
                                value={q.points}
                                onChange={e => updateQuestion(idx, 'points', Number(e.target.value))}
                                className="p-2 bg-white/10 border border-white/20 rounded focus:ring-2 focus:ring-indigo-500 w-20"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    {saving ? 'Creating…' : 'Create Quiz'}
                  </button>
                </form>
              </div>
            )}

            {/* Results */}
            {activeTab === 'results' && (
              <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden">
                <div className="p-6">
                  <h2 className="text-lg font-semibold mb-4">Quiz Results</h2>
                  {responses.length === 0 ? (
                    <p className="text-center text-white/50 py-8">No quiz responses yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-white/20">
                            <th className="p-4 font-semibold">Student</th>
                            <th className="p-4 font-semibold">Quiz</th>
                            <th className="p-4 font-semibold">Score</th>
                            <th className="p-4 font-semibold">Submitted</th>
                          </tr>
                        </thead>
                        <tbody>
                          {responses.map(r => (
                            <tr key={r.id} className="border-b border-white/10">
                              <td className="p-4">{r.student_name || `Student #${r.student_id}`}</td>
                              <td className="p-4">{r.quiz_title || `Quiz #${r.quiz_id}`}</td>
                              <td className="p-4">
                                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded">
                                  {r.score != null && r.max_score ? `${r.score}/${r.max_score}` : r.score ?? '—'}
                                </span>
                              </td>
                              <td className="p-4 text-sm">{formatDate(r.submitted_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}