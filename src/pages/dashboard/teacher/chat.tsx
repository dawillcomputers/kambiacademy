import React from 'react';
import ChatSystem from '../../../../components/ChatSystem';
import TeacherDashboardLayout from '../../../components/layout/TeacherDashboardLayout';
import { useAuth } from '../../../../lib/auth';

export default function TeacherChatPage() {
  const { user } = useAuth();

  return (
    <TeacherDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Teacher Chat</h1>
          <p className="mt-1 text-sm text-slate-500">Talk to students, support, and your class room threads from one place.</p>
        </div>

        <div className="h-[calc(100vh-220px)] min-h-[560px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-lg shadow-slate-200/70">
          <ChatSystem
            roomId="kambi-academy-room"
            currentUser={{ id: String(user?.id || 'teacher'), name: user?.name || 'Teacher' }}
            className="h-full"
          />
        </div>
      </div>
    </TeacherDashboardLayout>
  );
}