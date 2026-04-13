import React, { useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';

type TabType = 'all' | 'create' | 'submissions' | 'review';

export default function TeacherAssignments() {
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const assignments = [
    { id: 1, title: "Algebra Homework", course: "Mathematics", dueDate: "2024-01-15", submissions: 25 },
    { id: 2, title: "Physics Lab Report", course: "Physics", dueDate: "2024-01-20", submissions: 18 },
  ];

  const submissions = [
    { id: 1, student: "John Doe", assignment: "Algebra Homework", submitted: "2024-01-10", grade: null },
    { id: 2, student: "Jane Smith", assignment: "Physics Lab Report", submitted: "2024-01-12", grade: "A" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Assignments</h1>

        {/* Tabs */}
        <div className="flex space-x-1 bg-white/5 p-1 rounded-lg">
          {[
            { key: 'all' as TabType, label: 'All Assignments' },
            { key: 'create' as TabType, label: 'Create Assignment', icon: '➕' },
            { key: 'submissions' as TabType, label: 'Submissions' },
            { key: 'review' as TabType, label: 'Review + Comments' },
          ].map(tab => (
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

        {/* Tab Content */}
        {activeTab === 'all' && (
          <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden">
            <div className="p-6">
              <div className="space-y-4">
                {assignments.map(assignment => (
                  <div key={assignment.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div>
                      <h3 className="font-semibold">{assignment.title}</h3>
                      <p className="text-sm text-white/70">{assignment.course} • Due: {assignment.dueDate} • {assignment.submissions} submissions</p>
                    </div>
                    <div className="flex space-x-2">
                      <button className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors">
                        Edit
                      </button>
                      <button className="px-3 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded transition-colors">
                        View Submissions
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'create' && (
          <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm p-6">
            <h2 className="text-xl font-semibold mb-6">Create New Assignment</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Course</label>
                <select className="w-full p-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-indigo-500">
                  <option>Mathematics</option>
                  <option>Physics</option>
                  <option>Chemistry</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Assignment Title</label>
                <input
                  type="text"
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter assignment title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
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
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Max Score</label>
                  <input
                    type="number"
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="100"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Create Assignment
              </button>
            </form>
          </div>
        )}

        {activeTab === 'submissions' && (
          <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">All Submissions</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="p-4 font-semibold">Student</th>
                      <th className="p-4 font-semibold">Assignment</th>
                      <th className="p-4 font-semibold">Submitted</th>
                      <th className="p-4 font-semibold">Grade</th>
                      <th className="p-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map(submission => (
                      <tr key={submission.id} className="border-b border-white/10">
                        <td className="p-4">{submission.student}</td>
                        <td className="p-4">{submission.assignment}</td>
                        <td className="p-4 text-sm">{submission.submitted}</td>
                        <td className="p-4">
                          {submission.grade ? (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded">
                              {submission.grade}
                            </span>
                          ) : (
                            <span className="text-white/50">Pending</span>
                          )}
                        </td>
                        <td className="p-4">
                          <button className="px-3 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded transition-colors">
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'review' && (
          <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Review & Grade Submissions</h2>
            <div className="space-y-4">
              {submissions.filter(s => !s.grade).map(submission => (
                <div key={submission.id} className="p-4 bg-white/5 rounded-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold">{submission.student}</h3>
                      <p className="text-sm text-white/70">{submission.assignment}</p>
                    </div>
                    <span className="text-sm text-white/50">{submission.submitted}</span>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Grade</label>
                    <input
                      type="text"
                      className="w-full p-2 bg-white/10 border border-white/20 rounded focus:ring-2 focus:ring-indigo-500"
                      placeholder="A, B+, 95/100"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Feedback</label>
                    <textarea
                      className="w-full p-2 bg-white/10 border border-white/20 rounded focus:ring-2 focus:ring-indigo-500"
                      rows={3}
                      placeholder="Provide feedback for the student"
                    />
                  </div>
                  <button className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded font-semibold transition-colors">
                    Submit Grade
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}