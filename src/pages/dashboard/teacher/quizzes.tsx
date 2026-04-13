import React, { useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';

type TabType = 'all' | 'create' | 'results';

export default function TeacherQuizzes() {
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const quizzes = [
    { id: 1, title: "Math Quiz 1", course: "Mathematics", questions: 10, responses: 25 },
    { id: 2, title: "Physics Fundamentals", course: "Physics", questions: 15, responses: 18 },
  ];

  const results = [
    { student: "John Doe", quiz: "Math Quiz 1", score: "85%", submitted: "2024-01-10" },
    { student: "Jane Smith", quiz: "Physics Fundamentals", score: "92%", submitted: "2024-01-12" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Quizzes</h1>

        {/* Tabs */}
        <div className="flex space-x-1 bg-white/5 p-1 rounded-lg">
          {[
            { key: 'all' as TabType, label: 'All Quizzes' },
            { key: 'create' as TabType, label: 'Create Quiz', icon: '➕' },
            { key: 'results' as TabType, label: 'Results' },
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
                {quizzes.map(quiz => (
                  <div key={quiz.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div>
                      <h3 className="font-semibold">{quiz.title}</h3>
                      <p className="text-sm text-white/70">{quiz.course} • {quiz.questions} questions • {quiz.responses} responses</p>
                    </div>
                    <div className="flex space-x-2">
                      <button className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors">
                        Edit
                      </button>
                      <button className="px-3 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded transition-colors">
                        View Results
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
            <h2 className="text-xl font-semibold mb-6">Create New Quiz</h2>
            <form className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Course</label>
                  <select className="w-full p-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-indigo-500">
                    <option>Mathematics</option>
                    <option>Physics</option>
                    <option>Chemistry</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Time Limit (minutes)</label>
                  <input
                    type="number"
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="60"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Quiz Title</label>
                <input
                  type="text"
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter quiz title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Describe the quiz"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Questions</h3>
                  <button
                    type="button"
                    className="bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded text-sm font-semibold transition-colors"
                  >
                    Add Question
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="mb-3">
                      <input
                        type="text"
                        className="w-full p-2 bg-white/10 border border-white/20 rounded focus:ring-2 focus:ring-indigo-500"
                        placeholder="Question text"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs text-white/70 mb-1">A)</label>
                        <input
                          type="text"
                          className="w-full p-2 bg-white/10 border border-white/20 rounded focus:ring-2 focus:ring-indigo-500"
                          placeholder="Option A"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/70 mb-1">B)</label>
                        <input
                          type="text"
                          className="w-full p-2 bg-white/10 border border-white/20 rounded focus:ring-2 focus:ring-indigo-500"
                          placeholder="Option B"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/70 mb-1">C)</label>
                        <input
                          type="text"
                          className="w-full p-2 bg-white/10 border border-white/20 rounded focus:ring-2 focus:ring-indigo-500"
                          placeholder="Option C"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/70 mb-1">D)</label>
                        <input
                          type="text"
                          className="w-full p-2 bg-white/10 border border-white/20 rounded focus:ring-2 focus:ring-indigo-500"
                          placeholder="Option D"
                        />
                      </div>
                    </div>
                    <div className="flex space-x-4">
                      <div>
                        <label className="block text-xs text-white/70 mb-1">Correct Answer</label>
                        <select className="p-2 bg-white/10 border border-white/20 rounded focus:ring-2 focus:ring-indigo-500">
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
                          defaultValue="1"
                          className="p-2 bg-white/10 border border-white/20 rounded focus:ring-2 focus:ring-indigo-500 w-20"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Create Quiz
              </button>
            </form>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Quiz Results</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="p-4 font-semibold">Student</th>
                      <th className="p-4 font-semibold">Quiz</th>
                      <th className="p-4 font-semibold">Score</th>
                      <th className="p-4 font-semibold">Submitted</th>
                      <th className="p-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => (
                      <tr key={index} className="border-b border-white/10">
                        <td className="p-4">{result.student}</td>
                        <td className="p-4">{result.quiz}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded">
                            {result.score}
                          </span>
                        </td>
                        <td className="p-4 text-sm">{result.submitted}</td>
                        <td className="p-4">
                          <button className="px-3 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded transition-colors">
                            Review Answers
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
      </div>
    </DashboardLayout>
  );
}