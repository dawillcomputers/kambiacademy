import React, { useState } from 'react';
import { User, Course, Submission } from '../../../../types';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';

interface StudentAssignmentsProps {
  user: User;
  courses: Course[];
  submissions: Submission[];
}

const StudentAssignments: React.FC<StudentAssignmentsProps> = ({ user, courses, submissions }) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');

  const enrolledCourses = courses.filter(c => user.enrolledCourses?.includes(c.id));

  const assignments = enrolledCourses.flatMap(course =>
    course.assignments.map(assignment => {
      const submission = submissions.find(s => s.assignmentId === assignment.id && s.studentId === user.id);
      return {
        ...assignment,
        courseTitle: course.title,
        courseId: course.id,
        submitted: !!submission,
        submission,
        status: submission?.grade ? 'graded' : submission ? 'submitted' : 'pending'
      };
    })
  );

  const filteredAssignments = assignments.filter(assignment => {
    if (filter === 'all') return true;
    return assignment.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'graded': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">My Assignments</h1>
        <p className="text-gray-600">See all your homework and projects from every course</p>
      </div>

      {/* Filter Tabs */}
      <Card className="p-4">
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'All Assignments', count: assignments.length },
            { key: 'pending', label: 'Not Done Yet', count: assignments.filter(a => a.status === 'pending').length },
            { key: 'submitted', label: 'Submitted', count: assignments.filter(a => a.status === 'submitted').length },
            { key: 'graded', label: 'Graded', count: assignments.filter(a => a.status === 'graded').length }
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      </Card>

      {/* Assignments List */}
      <div className="space-y-4">
        {filteredAssignments.map(assignment => (
          <Card key={assignment.id} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-2">{assignment.title}</h3>
                <p className="text-gray-600 mb-3">{assignment.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{assignment.courseTitle}</span>
                  <span>Due: {assignment.dueDate}</span>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>
                {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
              </span>
            </div>

            {assignment.submission && (
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-semibold mb-2">Your Submission</h4>
                <p className="text-sm text-gray-600 mb-2">{assignment.submission.content}</p>
                <p className="text-xs text-gray-500">
                  Submitted on {new Date(assignment.submission.submittedAt).toLocaleDateString()}
                </p>
                {assignment.submission.grade && (
                  <div className="mt-2">
                    <span className="font-semibold">Grade: </span>
                    <span className="text-green-600 font-bold">{assignment.submission.grade}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Max Score: {assignment.maxScore} points
              </div>
              <Button
                size="small"
                variant={assignment.submitted ? 'secondary' : 'primary'}
                disabled={assignment.submitted}
              >
                {assignment.submitted ? 'Submitted' : 'Submit Assignment'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredAssignments.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold mb-2">No Assignments Found</h3>
          <p className="text-gray-600">
            {filter === 'all'
              ? "You don't have any assignments yet."
              : `No ${filter} assignments found.`
            }
          </p>
        </div>
      )}

      {/* Assignment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {assignments.filter(a => a.status === 'submitted').length}
          </div>
          <div className="text-gray-600">Submitted</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {assignments.filter(a => a.status === 'graded').length}
          </div>
          <div className="text-gray-600">Graded</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-yellow-600 mb-2">
            {assignments.filter(a => a.status === 'pending').length}
          </div>
          <div className="text-gray-600">Pending</div>
        </Card>
      </div>
    </div>
  );
};

export default StudentAssignments;