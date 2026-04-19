import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { api } from '../../../../lib/api';

interface StudentRow {
  key: string;
  name: string;
  email: string;
  classes: string[];
  submissions: number;
  gradedSubmissions: number;
  quizAttempts: number;
  averageQuizScore: number | null;
  latestActivityAt: string | null;
}

interface ActivityRow {
  id: string;
  type: 'assignment' | 'quiz';
  studentName: string;
  studentEmail: string;
  title: string;
  occurredAt: string;
  detail: string;
}

const parseDelimited = (value?: string | null) =>
  String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const formatDateTime = (value?: string | null) => value ? new Date(value).toLocaleString() : 'No activity yet';

export default function TeacherStudents() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadStudents = async () => {
      setLoading(true);
      setError('');

      const [classResult, submissionResult, quizResult] = await Promise.allSettled([
        api.tutorGetClasses(),
        api.getSubmissions(),
        api.getQuizResponses(),
      ]);

      if (cancelled) {
        return;
      }

      if (classResult.status === 'rejected' && submissionResult.status === 'rejected' && quizResult.status === 'rejected') {
        setError('Unable to load student activity for your classes.');
        setStudents([]);
        setRecentActivity([]);
        setLoading(false);
        return;
      }

      const classes = classResult.status === 'fulfilled' ? classResult.value.classes || [] : [];
      const submissions = submissionResult.status === 'fulfilled' ? submissionResult.value.submissions || [] : [];
      const quizResponses = quizResult.status === 'fulfilled' ? quizResult.value.responses || [] : [];

      const studentMap = new Map<string, {
        key: string;
        name: string;
        email: string;
        classes: Set<string>;
        submissions: number;
        gradedSubmissions: number;
        quizAttempts: number;
        quizScoreTotal: number;
        latestActivityAt: string | null;
      }>();

      const ensureStudent = (key: string, name?: string, email?: string) => {
        const existing = studentMap.get(key);
        if (existing) {
          if (!existing.name && name) existing.name = name;
          if (!existing.email && email) existing.email = email;
          return existing;
        }

        const created = {
          key,
          name: name || 'Student',
          email: email || '',
          classes: new Set<string>(),
          submissions: 0,
          gradedSubmissions: 0,
          quizAttempts: 0,
          quizScoreTotal: 0,
          latestActivityAt: null as string | null,
        };

        studentMap.set(key, created);
        return created;
      };

      classes.forEach((courseClass) => {
        const names = parseDelimited(courseClass.member_names);
        const emails = parseDelimited(courseClass.member_emails);
        const totalMembers = Math.max(names.length, emails.length);

        for (let index = 0; index < totalMembers; index += 1) {
          const name = names[index] || `Student ${index + 1}`;
          const email = emails[index] || '';
          const key = email || `class-${courseClass.id}-member-${index}`;
          const student = ensureStudent(key, name, email);
          student.classes.add(courseClass.title || 'Private class');
        }
      });

      submissions.forEach((submission) => {
        const key = submission.student_email || `student-${submission.student_id}`;
        const student = ensureStudent(key, submission.student_name, submission.student_email);
        student.submissions += 1;
        if (submission.score !== null && submission.score !== undefined) {
          student.gradedSubmissions += 1;
        }
        if (submission.submitted_at && (!student.latestActivityAt || new Date(submission.submitted_at).getTime() > new Date(student.latestActivityAt).getTime())) {
          student.latestActivityAt = submission.submitted_at;
        }
      });

      quizResponses.forEach((response) => {
        const key = response.student_email || `student-${response.student_id}`;
        const student = ensureStudent(key, response.student_name, response.student_email);
        student.quizAttempts += 1;
        if (Number(response.max_score || 0) > 0) {
          student.quizScoreTotal += (Number(response.score || 0) / Number(response.max_score)) * 100;
        }
        if (response.submitted_at && (!student.latestActivityAt || new Date(response.submitted_at).getTime() > new Date(student.latestActivityAt).getTime())) {
          student.latestActivityAt = response.submitted_at;
        }
      });

      const nextStudents = Array.from(studentMap.values())
        .map((student) => ({
          key: student.key,
          name: student.name,
          email: student.email,
          classes: Array.from(student.classes).sort(),
          submissions: student.submissions,
          gradedSubmissions: student.gradedSubmissions,
          quizAttempts: student.quizAttempts,
          averageQuizScore: student.quizAttempts ? Math.round((student.quizScoreTotal / student.quizAttempts) * 10) / 10 : null,
          latestActivityAt: student.latestActivityAt,
        }))
        .sort((left, right) => {
          const rightTime = right.latestActivityAt ? new Date(right.latestActivityAt).getTime() : 0;
          const leftTime = left.latestActivityAt ? new Date(left.latestActivityAt).getTime() : 0;
          if (rightTime !== leftTime) {
            return rightTime - leftTime;
          }
          return left.name.localeCompare(right.name);
        });

      const nextActivity = [
        ...submissions.map((submission) => ({
          id: `submission-${submission.id}`,
          type: 'assignment' as const,
          studentName: submission.student_name || 'Student',
          studentEmail: submission.student_email || '',
          title: submission.assignment_title || 'Assignment',
          occurredAt: submission.submitted_at || '',
          detail: submission.score !== null && submission.score !== undefined
            ? `Scored ${submission.score}`
            : 'Waiting for grading',
        })),
        ...quizResponses.map((response) => ({
          id: `quiz-${response.id}`,
          type: 'quiz' as const,
          studentName: response.student_name || 'Student',
          studentEmail: response.student_email || '',
          title: response.quiz_title || 'Quiz',
          occurredAt: response.submitted_at || '',
          detail: Number(response.max_score || 0) > 0
            ? `${Math.round((Number(response.score || 0) / Number(response.max_score)) * 100)}% score`
            : 'Quiz attempt recorded',
        })),
      ]
        .filter((item) => item.occurredAt)
        .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
        .slice(0, 10);

      setStudents(nextStudents);
      setRecentActivity(nextActivity);
      setLoading(false);
    };

    void loadStudents();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return students;
    }

    return students.filter((student) => {
      const haystack = [student.name, student.email, student.classes.join(' ')].join(' ').toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [query, students]);

  const stats = useMemo(() => {
    const activeStudents = students.filter((student) => student.latestActivityAt).length;
    const totalSubmissions = students.reduce((sum, student) => sum + student.submissions, 0);
    const totalQuizAttempts = students.reduce((sum, student) => sum + student.quizAttempts, 0);

    return [
      { label: 'Students', value: students.length, detail: 'Learners across your private classes and graded work.' },
      { label: 'Active Learners', value: activeStudents, detail: 'Students with recorded submission or quiz activity.' },
      { label: 'Submissions', value: totalSubmissions, detail: 'Assignment submissions across all your courses.' },
      { label: 'Quiz Attempts', value: totalQuizAttempts, detail: 'Quiz responses recorded for your assessments.' },
    ];
  }, [students]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_28%),linear-gradient(135deg,#ffffff,#f8fafc_45%,#eff6ff)] px-6 py-8 shadow-xl shadow-slate-200/70">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Student Overview</p>
          <h1 className="mt-3 text-4xl font-bold text-slate-950">See who is learning across your classes</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Track class membership, assignment submissions, quiz attempts, and the most recent student activity across your teaching workspace.
          </p>
        </section>

        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat, index) => (
            <div key={stat.label} className={`rounded-[28px] border px-5 py-5 shadow-lg shadow-slate-200/60 ${index % 2 === 0 ? 'border-emerald-200 bg-gradient-to-br from-emerald-100 via-teal-50 to-white text-emerald-950' : 'border-sky-200 bg-gradient-to-br from-sky-100 via-cyan-50 to-white text-sky-950'}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] opacity-70">{stat.label}</p>
              <p className="mt-4 text-3xl font-bold">{stat.value}</p>
              <p className="mt-4 text-sm opacity-80">{stat.detail}</p>
            </div>
          ))}
        </div>

        <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-lg shadow-slate-200/60">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Roster</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">Students in your classes</h2>
            </div>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by student name, email, or class"
              className="w-full rounded-full border border-slate-200 px-4 py-3 text-sm text-slate-700 lg:max-w-md"
            />
          </div>

          {loading ? (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-10 text-sm text-slate-500">Loading student activity...</div>
          ) : filteredStudents.length ? (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm text-slate-600">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-3 py-3">Student</th>
                    <th className="px-3 py-3">Classes</th>
                    <th className="px-3 py-3">Submissions</th>
                    <th className="px-3 py-3">Quiz Attempts</th>
                    <th className="px-3 py-3">Average Quiz Score</th>
                    <th className="px-3 py-3">Latest Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.key} className="border-b border-slate-100 align-top">
                      <td className="px-3 py-4">
                        <p className="font-semibold text-slate-900">{student.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{student.email || 'No email recorded'}</p>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex flex-wrap gap-2">
                          {student.classes.length ? student.classes.map((courseClass) => (
                            <span key={`${student.key}-${courseClass}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              {courseClass}
                            </span>
                          )) : <span className="text-xs text-slate-400">No class membership listed</span>}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <p className="font-semibold text-slate-900">{student.submissions}</p>
                        <p className="mt-1 text-xs text-slate-500">{student.gradedSubmissions} graded</p>
                      </td>
                      <td className="px-3 py-4 font-semibold text-slate-900">{student.quizAttempts}</td>
                      <td className="px-3 py-4">
                        {student.averageQuizScore !== null ? (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {student.averageQuizScore.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">No quiz data yet</span>
                        )}
                      </td>
                      <td className="px-3 py-4 text-slate-500">{formatDateTime(student.latestActivityAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-sm text-slate-500">
              No students matched your search yet.
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-lg shadow-slate-200/60">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Recent Activity</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">Latest submissions and quiz attempts</h2>

          <div className="mt-6 grid gap-3">
            {recentActivity.length ? recentActivity.map((activity) => (
              <div key={activity.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{activity.type === 'assignment' ? 'Assignment' : 'Quiz'}</p>
                    <h3 className="mt-1 font-semibold text-slate-900">{activity.studentName} • {activity.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{activity.studentEmail || 'No email recorded'} • {activity.detail}</p>
                  </div>
                  <p className="text-sm text-slate-500">{formatDateTime(activity.occurredAt)}</p>
                </div>
              </div>
            )) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-sm text-slate-500">
                No recent student activity has been recorded yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}