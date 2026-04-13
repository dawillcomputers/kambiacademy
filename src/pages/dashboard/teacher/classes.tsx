import React from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';

export default function TeacherClasses() {
  const classes = [
    { id: 1, title: "Math Class A", students: 25, inviteCode: "MATH2024A" },
    { id: 2, title: "Physics Lab", students: 18, inviteCode: "PHYS2024B" },
    { id: 3, title: "Chemistry Basics", students: 22, inviteCode: "CHEM2024C" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Classes</h1>
          <button className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-semibold transition-colors">
            Create Class
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map(cls => (
            <div key={cls.id} className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm">
              <h3 className="font-bold text-lg mb-2">{cls.title}</h3>
              <div className="space-y-2 mb-4">
                <p className="text-sm text-white/70">{cls.students} students</p>
                <p className="text-sm text-white/70">Code: <span className="font-mono bg-white/10 px-2 py-1 rounded">{cls.inviteCode}</span></p>
              </div>
              <div className="flex space-x-2">
                <button className="flex-1 bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded font-semibold text-sm transition-colors">
                  Open Chat
                </button>
                <button className="flex-1 bg-green-600 hover:bg-green-700 px-3 py-2 rounded font-semibold text-sm transition-colors">
                  Start Live
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Class Materials & Requests</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  📹
                </div>
                <div>
                  <h3 className="font-semibold">Student Request: Video Tutorial</h3>
                  <p className="text-sm text-white/70">Sarah Johnson requested a video on quadratic equations</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded transition-colors">
                  Approve
                </button>
                <button className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors">
                  Deny
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  📚
                </div>
                <div>
                  <h3 className="font-semibold">Upload Class Material</h3>
                  <p className="text-sm text-white/70">Share documents, videos, or resources with your class</p>
                </div>
              </div>
              <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded font-semibold transition-colors">
                Upload
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}