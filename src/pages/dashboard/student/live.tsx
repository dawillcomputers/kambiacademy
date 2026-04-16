import React, { useState } from 'react';
import { User } from '../../../../types';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';

interface LiveSession {
  id: string;
  title: string;
  courseTitle: string;
  instructor: string;
  scheduledTime: Date;
  duration: number; // in minutes
  status: 'upcoming' | 'live' | 'ended';
  participants: number;
  description?: string;
}

interface StudentLiveProps {
  user: User;
}

const StudentLive: React.FC<StudentLiveProps> = ({ user }) => {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'live'>('all');

  // Mock live sessions data
  const liveSessions: LiveSession[] = [
    {
      id: '1',
      title: 'React Hooks Deep Dive',
      courseTitle: 'Advanced React and TypeScript',
      instructor: 'Dr. Evelyn Reed',
      scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      duration: 90,
      status: 'upcoming',
      participants: 25,
      description: 'Master advanced React hooks patterns and best practices'
    },
    {
      id: '2',
      title: 'UI/UX Design Principles',
      courseTitle: 'UI/UX Design Fundamentals',
      instructor: 'Dr. Evelyn Reed',
      scheduledTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      duration: 60,
      status: 'live',
      participants: 32,
      description: 'Learn core design principles for better user experiences'
    },
    {
      id: '3',
      title: 'JavaScript Fundamentals Review',
      courseTitle: 'Introduction to Web Development',
      instructor: 'Dr. Evelyn Reed',
      scheduledTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
      duration: 75,
      status: 'ended',
      participants: 28,
      description: 'Review essential JavaScript concepts'
    }
  ];

  const filteredSessions = liveSessions.filter(session => {
    if (filter === 'all') return true;
    return session.status === filter;
  });

  const liveSessionExists = liveSessions.some(session => session.status === 'live');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-100 text-red-800';
      case 'upcoming': return 'bg-green-100 text-green-800';
      case 'ended': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Live Classes</h1>
        <p className="text-black">Join interactive live sessions with your instructors</p>
      </div>

      {/* Filter Tabs */}
      <Card className="p-4">
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'All Sessions' },
            { key: 'live', label: 'Live Now' },
            { key: 'upcoming', label: 'Upcoming' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      {!liveSessionExists && (
        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <h2 className="text-xl font-bold text-slate-900 mb-2">No Live Class Available</h2>
          <p className="text-sm text-slate-600">
            There are no live sessions running right now. Check upcoming sessions or request a new class.
          </p>
        </Card>
      )}

      {/* Live Sessions */}
      <div className="space-y-4">
        {filteredSessions.map(session => (
          <Card key={session.id} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-lg">{session.title}</h3>
                  {session.status === 'live' && (
                    <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full animate-pulse">
                      🔴 LIVE
                    </span>
                  )}
                </div>
                <p className="text-slate-900 mb-2">{session.courseTitle}</p>
                <p className="text-sm text-slate-900 mb-3">by {session.instructor}</p>
                {session.description && (
                  <p className="text-slate-900 mb-4">{session.description}</p>
                )}
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-slate-900">
                <div className="flex items-center gap-4">
                  <span>📅 {formatTime(session.scheduledTime)}</span>
                  <span>⏱️ {session.duration} minutes</span>
                  <span>👥 {session.participants} participants</span>
                </div>
              </div>
              <Button
                variant={session.status === 'live' ? 'primary' : 'secondary'}
                disabled={session.status !== 'live'}
                onClick={() => {
                  if (session.status === 'live') {
                    alert('Live video is not available in this demo yet. Please join through the scheduled class link.');
                  }
                }}
              >
                {session.status === 'live' ? 'Join Live Class' :
                 session.status === 'upcoming' ? 'Scheduled' : 'Ended'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredSessions.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎥</div>
          <h3 className="text-xl font-semibold mb-2">No Live Sessions Found</h3>
          <p className="text-gray-600">
            {filter === 'all'
              ? "There are no live sessions scheduled at the moment."
              : `No ${filter} live sessions found.`
            }
          </p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 text-center hover:shadow-lg transition-shadow cursor-pointer">
          <div className="text-4xl mb-4">📝</div>
          <h3 className="font-bold mb-2 text-slate-900">Request Class</h3>
          <p className="text-slate-900 text-sm">Request a live session on a specific topic</p>
        </Card>
        <Card className="p-6 text-center hover:shadow-lg transition-shadow cursor-pointer">
          <div className="text-4xl mb-4">📚</div>
          <h3 className="font-bold mb-2 text-slate-900">Study Groups</h3>
          <p className="text-slate-900 text-sm">Join study groups for collaborative learning</p>
        </Card>
        <Card className="p-6 text-center hover:shadow-lg transition-shadow cursor-pointer">
          <div className="text-4xl mb-4">💬</div>
          <h3 className="font-bold mb-2 text-slate-900">Q&A Sessions</h3>
          <p className="text-slate-900 text-sm">Get your questions answered live</p>
        </Card>
      </div>

      {/* Live Class Tips */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Live Class Tips 💡</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-sky-900 mb-2">Before Class</h3>
            <ul className="text-sm text-slate-900 space-y-1">
              <li>• Test your camera and microphone</li>
              <li>• Ensure stable internet connection</li>
              <li>• Prepare questions in advance</li>
              <li>• Review relevant materials</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-sky-900 mb-2">During Class</h3>
            <ul className="text-sm text-slate-900 space-y-1">
              <li>• Stay engaged and participate</li>
              <li>• Use the chat for questions</li>
              <li>• Take notes actively</li>
              <li>• Respect other participants</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StudentLive;