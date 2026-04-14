import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Course, Submission, User } from '../../../../types';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';

interface StudentAssignmentDetailProps {
  user: User;
  courses: Course[];
  submissions: Submission[];
}

const StudentAssignmentDetail: React.FC<StudentAssignmentDetailProps> = ({ user, courses, submissions }) => {
  const { assignmentId } = useParams<{ assignmentId: string }>();

  const assignment = courses
    .flatMap((course) =>
      (course.assignments || []).map((item) => ({
        ...item,
        courseTitle: course.title,
        courseId: course.id,
        courseSlug: course.slug,
      }))
    )
    .find((item) => item.id === assignmentId);

  const submission = submissions.find(
    (item) => item.assignmentId === assignmentId && item.studentId === user.id
  );

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
              <p>{submission.content || 'No submission details are available.'}</p>
              {submission.grade && <p className="mt-2">Grade: {submission.grade}</p>}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl bg-yellow-50 p-4 text-sm text-yellow-800">
              <p className="font-semibold">No submission yet</p>
              <p>Use the assignment list to submit your work, or ask your tutor if you need help.</p>
            </div>
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
