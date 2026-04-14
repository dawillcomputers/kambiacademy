import React from 'react';
import { User, Submission, Course } from '../../../../types';
import Card from '../../../../components/Card';

interface StudentSubmissionsProps {
  user: User;
  submissions: Submission[];
  courses: Course[];
}

const StudentSubmissions: React.FC<StudentSubmissionsProps> = ({ user, submissions, courses }) => {
  const userSubmissions = submissions.filter(s => s.studentId === user.id);

  const getStatusColor = (grade: string | null) => {
    if (!grade) return 'bg-yellow-100 text-yellow-800';
    const score = grade.replace(/[^0-9]/g, '');
    const numScore = parseInt(score);
    if (numScore >= 80) return 'bg-green-100 text-green-800';
    if (numScore >= 60) return 'bg-blue-100 text-blue-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">My Submissions</h1>
        <p className="text-gray-600">View all your assignment submissions and grades</p>
      </div>

      {/* Submissions List */}
      <div className="space-y-4">
        {userSubmissions.map(submission => {
          // Find the course and assignment for this submission
          const course = courses.find(c => c.id === submission.courseId);
          const assignment = course?.assignments.find(a => a.id === submission.assignmentId);

          return (
            <Card key={submission.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-2">
                    {assignment?.title || 'Assignment'}
                  </h3>
                  <p className="text-gray-600 mb-2">
                    {course?.title || 'Course'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Submitted on {new Date(submission.submittedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(submission.grade)}`}>
                  {submission.grade || 'Pending Grade'}
                </span>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Your Submission</h4>
                <div className="text-sm text-gray-700">
                  {submission.content.startsWith('http') ? (
                    <a
                      href={submission.content}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      {submission.content}
                    </a>
                  ) : (
                    <pre className="whitespace-pre-wrap font-mono text-xs bg-white p-3 rounded border">
                      {submission.content}
                    </pre>
                  )}
                </div>
              </div>

              {assignment && (
                <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
                  <span>Max Score: {assignment.maxScore} points</span>
                  {submission.grade && (
                    <span>Scored: {submission.grade}</span>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {userSubmissions.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📤</div>
          <h3 className="text-xl font-semibold mb-2">No Submissions Yet</h3>
          <p className="text-gray-600">
            You haven't submitted any assignments yet. Check your assignments page to get started.
          </p>
        </div>
      )}

      {/* Submission Stats */}
      {userSubmissions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {userSubmissions.length}
            </div>
            <div className="text-gray-600">Total Submissions</div>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {userSubmissions.filter(s => s.grade).length}
            </div>
            <div className="text-gray-600">Graded</div>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-yellow-600 mb-2">
              {userSubmissions.filter(s => !s.grade).length}
            </div>
            <div className="text-gray-600">Pending Grade</div>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {userSubmissions.filter(s => s.grade).length > 0
                ? Math.round(userSubmissions.filter(s => s.grade).reduce((acc, s) => {
                    const score = parseInt(s.grade?.replace(/[^0-9]/g, '') || '0');
                    return acc + score;
                  }, 0) / userSubmissions.filter(s => s.grade).length)
                : 0}%
            </div>
            <div className="text-gray-600">Average Grade</div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StudentSubmissions;