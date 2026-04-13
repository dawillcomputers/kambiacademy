import React from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';

export default function TeacherCourses() {
  const courses = [
    { id: 1, title: "Mathematics", status: "Approved" },
    { id: 2, title: "Physics", status: "Pending" },
    { id: 3, title: "Chemistry", status: "Draft" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">My Courses</h1>

        <div className="grid grid-cols-3 gap-6">
          {courses.map(course => (
            <div key={course.id} className="bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-sm">
              <h3 className="font-bold text-lg">{course.title}</h3>
              <span className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
                course.status === 'Approved' ? 'bg-green-500/20 text-green-400' :
                course.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {course.status}
              </span>
            </div>
          ))}

          <div className="flex items-center justify-center border-dashed border-2 border-white/20 rounded-2xl cursor-pointer hover:border-white/40 transition-colors">
            <div className="text-center">
              <div className="text-4xl mb-2">➕</div>
              <div className="font-semibold">Create Course</div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}