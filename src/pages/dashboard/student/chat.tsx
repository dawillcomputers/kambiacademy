import React from 'react';
import { User } from '../../../../types';
import ChatSystem from '../../../../components/ChatSystem';

interface StudentChatProps {
  user: User;
}

const StudentChat: React.FC<StudentChatProps> = ({ user }) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Classroom Chat</h1>
        <p className="text-gray-600">Talk to tutors, classmates, and support staff in the live chat room.</p>
      </div>

      <div className="h-[680px] rounded-3xl border border-gray-200 bg-white shadow-sm">
        <ChatSystem
          roomId="kambi-academy-room"
          currentUser={{ id: user.id, name: user.name }}
          className="h-full"
        />
      </div>
    </div>
  );
};

export default StudentChat;
