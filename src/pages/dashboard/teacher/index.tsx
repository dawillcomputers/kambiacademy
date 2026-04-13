import React from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';

export default function TeacherDashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Welcome back 👋</h1>

        <div className="grid grid-cols-4 gap-4">
          <StatCard title="Courses" value="12" />
          <StatCard title="Students" value="320" />
          <StatCard title="Assignments" value="45" />
          <StatCard title="Live Classes" value="6" />
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-sm">
      <h3 className="text-sm text-white/70">{title}</h3>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}