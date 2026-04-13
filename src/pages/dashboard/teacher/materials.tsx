import React from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';

export default function TeacherMaterials() {
  const materials = [
    { id: 1, title: "Introduction to Algebra", type: "PDF", course: "Mathematics" },
    { id: 2, title: "Newton's Laws Video", type: "Video", course: "Physics" },
    { id: 3, title: "Periodic Table Quiz", type: "Document", course: "Chemistry" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Materials</h1>
          <button className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-semibold transition-colors">
            Upload Material
          </button>
        </div>

        <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">All Materials</h2>
            <div className="space-y-3">
              {materials.map(material => (
                <div key={material.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                      📄
                    </div>
                    <div>
                      <h3 className="font-semibold">{material.title}</h3>
                      <p className="text-sm text-white/70">{material.type} • {material.course}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors">
                      Edit
                    </button>
                    <button className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}