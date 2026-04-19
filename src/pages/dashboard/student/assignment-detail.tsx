import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Assignment, Course, Submission, User } from '../../../../types';
import { api } from '../../../../lib/api';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';

interface StudentAssignmentDetailProps {
  user: User;
  courses: Course[];
  assignments: Assignment[];
  submissions: Submission[];
  onSubmitted: () => Promise<void>;
}

const StudentAssignmentDetail: React.FC<StudentAssignmentDetailProps> = ({ user, courses, assignments, submissions, onSubmitted }) => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const assignment = useMemo(() => {
    const record = assignments.find((item) => item.id === assignmentId);
    if (!record) {
      return null;
    }

    const course = courses.find((item) => item.id === record.courseId);
    return {
      ...record,
      courseTitle: course?.title || 'Course',
      courseSlug: course?.slug || record.courseId,
    };
  }, [assignmentId, assignments, courses]);

  const submission = submissions.find(
    (item) => item.assignmentId === assignmentId && item.studentId === String(user.id)
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!assignmentId || (!content.trim() && !file)) {
      return;
    }

    setSubmitting(true);
    setStatusMessage('');
    try {
      await api.submitAssignment(Number(assignmentId), content.trim() || undefined, file || undefined);
      setStatusMessage('Assignment submitted successfully.');
      setContent('');
      setFile(null);
      await onSubmitted();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to submit assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!assignment) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <h2 className="text-2xl font-semibold mb-3">Assignment not found</h2>
        <p className="text-gray-600 mb-6">Please return to your assignments list and select one of your active tasks.</p>
        <Link to="/student/assignments" className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">
          Back to assignments
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{assignment.title}</h1>
          <p className="text-gray-600">{assignment.courseTitle}</p>
        </div>
        <div className="space-y-2 text-right">
          <p className="text-sm text-gray-500">Due date</p>
          <p className="text-lg font-semibold text-slate-900">{assignment.dueDate}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Assignment details</h2>
          <p className="text-gray-600 mb-6">{assignment.description || 'No description provided.'}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Max score</p>
              <p className="text-lg font-semibold text-slate-900">{assignment.maxScore || 'N/A'}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Course</p>
              <p className="text-lg font-semibold text-slate-900">{assignment.courseTitle}</p>
            </div>
          </div>

          {submission ? (
            <div className="mt-6 rounded-2xl bg-green-50 p-4 text-sm text-green-800">
              <p className="font-semibold">Submission received</p>
              <p>{submission.content || submission.fileName || 'No submission details are available.'}</p>
              {submission.grade !== null && submission.grade !== undefined && <p className="mt-2">Grade: {submission.grade}</p>}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-2xl bg-yellow-50 p-4 text-sm text-yellow-900">
              <div>
                <p className="font-semibold">Submit your work</p>
                <p className="mt-1 text-yellow-800">Send a written answer, upload a file, or use both.</p>
              </div>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={6}
                className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-slate-900"
                placeholder="Paste your response, notes, or a link to your work."
              />
              <input
                type="file"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-slate-900"
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-yellow-800">Accepted file uploads are checked by the server on submission.</span>
                <Button type="submit" disabled={submitting || (!content.trim() && !file)}>
                  {submitting ? 'Submitting...' : 'Submit Assignment'}
                </Button>
              </div>
              {statusMessage && <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">{statusMessage}</div>}
            </form>
          )}
        </Card>

        <Card className="p-6 bg-blue-50">
          <h2 className="text-xl font-semibold mb-4">Need help?</h2>
          <p className="text-gray-700 mb-4">If you are stuck, send a quick message in chat or ask your tutor for feedback.</p>
          <Link to="/student/chat">
            <Button className="w-full">Open chat</Button>
          </Link>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/student/assignments">
          <Button variant="secondary">Back to assignments</Button>
        </Link>
        <Link to={`/student/courses/${assignment.courseId}`}>
          <Button>Go to course</Button>
        </Link>
      </div>
    </div>
  );
};

export default StudentAssignmentDetail;
