
import React, { useState, useMemo, useEffect, useRef } from 'react';
// FIX: Import Course and Enrollment types to use in props
import { User, Message, Course, Enrollment } from '../types';
import Button from './Button';

interface MessagesProps {
  currentUser: User;
  users: User[];
  messages: Message[];
  onSendMessage: (receiverId: string, text: string) => void;
  // FIX: Add courses and enrollments to props
  courses: Course[];
  enrollments: Enrollment[];
  onBack: () => void;
  canGoBack: boolean;
}

const Messages: React.FC<MessagesProps> = ({ currentUser, users, messages, onSendMessage, courses, enrollments, onBack, canGoBack }) => {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const contacts = useMemo(() => {
    if (currentUser.role === 'student') {
        const admin = users.find(u => u.role === 'admin');
        const enrolledCourseIds = currentUser.enrolledCourses || [];
        // FIX: Use courses prop instead of a non-existent variable
        const instructors = users.filter(u => u.role === 'teacher' && courses.some(c => enrolledCourseIds.includes(c.id) && c.instructorId === u.id));
        return [admin, ...instructors].filter((u): u is User => !!u);
    }
    if (currentUser.role === 'teacher') {
        // Find students enrolled in this teacher's courses
        // FIX: Use courses and enrollments props instead of mock data
        const taughtCourseIds = courses.filter(c => c.instructorId === currentUser.id).map(c => c.id);
        const studentIds = new Set<string>();
        enrollments.forEach(e => {
            if (taughtCourseIds.includes(e.courseId)) {
                studentIds.add(e.studentId);
            }
        });
        return users.filter(u => studentIds.has(u.id));
    }
    // Admin can see all users
    return users.filter(u => u.id !== currentUser.id);
  }, [currentUser, users, courses, enrollments]);

  useEffect(() => {
    if (contacts.length > 0 && !selectedContactId) {
      setSelectedContactId(contacts[0].id);
    }
  }, [contacts, selectedContactId]);

  const conversation = useMemo(() => {
    if (!selectedContactId) return [];
    return messages
      .filter(m => 
        (m.senderId === currentUser.id && m.receiverId === selectedContactId) || 
        (m.senderId === selectedContactId && m.receiverId === currentUser.id)
      )
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [messages, currentUser.id, selectedContactId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim() && selectedContactId) {
      onSendMessage(selectedContactId, messageText);
      setMessageText('');
    }
  };
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const selectedContact = users.find(u => u.id === selectedContactId);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Messages</h1>
        {canGoBack && <Button variant="secondary" onClick={onBack}>&larr; Back</Button>}
      </div>
      <div className="flex h-[calc(80vh-60px)] bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Contact List */}
        <div className="w-1/3 border-r bg-slate-50 overflow-y-auto">
          <h2 className="text-lg font-bold p-4 border-b">Contacts</h2>
          <ul>
            {contacts.map(contact => (
              <li key={contact.id} onClick={() => setSelectedContactId(contact.id)}
                className={`p-4 cursor-pointer flex items-center space-x-3 ${selectedContactId === contact.id ? 'bg-indigo-100' : 'hover:bg-slate-100'}`}>
                <div className="w-10 h-10 bg-indigo-200 rounded-full flex items-center justify-center font-bold text-indigo-700">{contact.name.charAt(0)}</div>
                <div>
                  <p className="font-semibold">{contact.name}</p>
                  <p className="text-xs text-slate-500">{contact.role}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Chat Window */}
        <div className="w-2/3 flex flex-col">
          {selectedContact ? (
            <>
              <div className="p-4 border-b flex items-center space-x-3">
                 <div className="w-10 h-10 bg-indigo-200 rounded-full flex items-center justify-center font-bold text-indigo-700">{selectedContact.name.charAt(0)}</div>
                 <div>
                    <h3 className="text-lg font-bold">{selectedContact.name}</h3>
                 </div>
              </div>
              <div className="flex-grow p-4 overflow-y-auto bg-slate-100 space-y-4">
                {conversation.map(msg => (
                  <div key={msg.id} className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md p-3 rounded-2xl ${msg.senderId === currentUser.id ? 'bg-indigo-600 text-white' : 'bg-white'}`}>
                      <p>{msg.text}</p>
                      <p className={`text-xs mt-1 ${msg.senderId === currentUser.id ? 'text-indigo-200' : 'text-slate-400'}`}>{new Date(msg.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="p-4 border-t flex items-center space-x-3">
                <input type="text" value={messageText} onChange={e => setMessageText(e.target.value)} placeholder="Type a message..." className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                <Button type="submit">Send</Button>
              </form>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-500">Select a contact to start messaging.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
