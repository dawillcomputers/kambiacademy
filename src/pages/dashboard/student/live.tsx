import React, { useMemo, useState } from 'react';
import { User } from '../../../../types';
import Button from '../../../../components/Button';
import Card from '../../../../components/Card';
import LiveClassroom from '../../../../components/LiveClassroom';

interface StudentLiveProps {
  user: User;
  liveSessions: any[];
  onSessionClosed: () => Promise<void>;
}

const StudentLive: React.FC<StudentLiveProps> = ({ user, liveSessions, onSessionClosed }) => {
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'live'>('all');

  const normalizedSessions = useMemo(() => liveSessions.map((session) => ({
    id: Number(session.id),
    title: session.title || session.class_title || 'Live Session',
    classTitle: session.class_title || session.title || 'Live Class',
    startedAt: session.started_at || new Date().toISOString(),
    participants: Number(session.member_count || 0),
    status: session.status || 'active',
  })), [liveSessions]);

  if (activeSessionId !== null) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Live Classroom</h1>
            <p className="text-slate-600">You are connected to a realtime teacher session.</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setActiveSessionId(null);
              void onSessionClosed();
            }}
          >
            Leave session list
          </Button>
        </div>
        <LiveClassroom
          sessionId={activeSessionId}
          user={{ id: Number(user.id), name: user.name, role: user.role }}
          onLeave={() => {
            setActiveSessionId(null);
            void onSessionClosed();
          }}
        />
      </div>
    );
  }

  const filteredSessions = normalizedSessions.filter((session) => filter === 'all' || session.status === 'active');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Live Classes</h1>
        <p className="text-slate-600">Join the live sessions your teachers are running right now.</p>
      </div>

      <Card className="p-4">
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'All Active Rooms' },
            { key: 'live', label: 'Joinable Now' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as 'all' | 'live')}
              className={`px-4 py-2 rounded-lg font-medium ${filter === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      {filteredSessions.length ? (
        <div className="space-y-4">
          {filteredSessions.map((session) => (
            <Card key={session.id} className="p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-[0.24em] text-red-600">Live now</span>
                  </div>
                  <h3 className="mt-3 text-xl font-bold text-slate-900">{session.title}</h3>
                  <p className="mt-1 text-slate-600">{session.classTitle}</p>
                  <p className="mt-2 text-sm text-slate-500">Started {new Date(session.startedAt).toLocaleString()} • {session.participants} participants</p>
                </div>
                <Button onClick={() => setActiveSessionId(session.id)}>Join Classroom</Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-10 text-center bg-yellow-50 border-yellow-200">
          <h2 className="text-xl font-bold text-slate-900 mb-2">No live classes are running</h2>
          <p className="text-sm text-slate-600">When your teacher starts a session, it will appear here and you can join directly.</p>
        </Card>
      )}
    </div>
  );
};

export default StudentLive;