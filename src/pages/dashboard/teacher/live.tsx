import React, { useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';

export default function TeacherLive() {
  const [activeSession, setActiveSession] = useState<number | null>(null);

  const liveSessions = [
    { id: 1, title: "Math Live Session", class: "Math Class A", scheduled: "2024-01-15 14:00", status: "scheduled" },
    { id: 2, title: "Physics Q&A", class: "Physics Lab", scheduled: "2024-01-16 16:00", status: "scheduled" },
    { id: 3, title: "Chemistry Review", class: "Chemistry Basics", scheduled: "2024-01-14 10:00", status: "completed" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Live Classes</h1>
          <button className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-semibold transition-colors">
            Schedule New Session
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {liveSessions.map(session => (
            <div key={session.id} className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg">{session.title}</h3>
                  <p className="text-sm text-white/70">{session.class}</p>
                  <p className="text-sm text-white/70">{session.scheduled}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  session.status === 'scheduled' ? 'bg-yellow-500/20 text-yellow-400' :
                  session.status === 'live' ? 'bg-red-500/20 text-red-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {session.status}
                </span>
              </div>

              <div className="flex space-x-2">
                {session.status === 'scheduled' && (
                  <>
                    <button className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold text-sm transition-colors">
                      Start Now
                    </button>
                    <button className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded font-semibold text-sm transition-colors">
                      Edit
                    </button>
                  </>
                )}
                {session.status === 'live' && (
                  <button className="flex-1 bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-semibold text-sm transition-colors">
                    Join Live
                  </button>
                )}
                {session.status === 'completed' && (
                  <>
                    <button className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold text-sm transition-colors">
                      View Recording
                    </button>
                    <button className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded font-semibold text-sm transition-colors">
                      Schedule Again
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {activeSession && (
          <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Live Classroom</h2>
              <button
                onClick={() => setActiveSession(null)}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-semibold transition-colors"
              >
                End Session
              </button>
            </div>

            <div className="bg-black rounded-lg aspect-video mb-4 flex items-center justify-center">
              <div className="text-center text-white/50">
                <div className="text-6xl mb-4">🎥</div>
                <p>Cloudflare Realtime Classroom</p>
                <p className="text-sm">Video feed would appear here</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button className="bg-red-600 hover:bg-red-700 p-3 rounded-lg font-semibold transition-colors">
                Mute All
              </button>
              <button className="bg-blue-600 hover:bg-blue-700 p-3 rounded-lg font-semibold transition-colors">
                Screen Share
              </button>
              <button className="bg-green-600 hover:bg-green-700 p-3 rounded-lg font-semibold transition-colors">
                Raise Hand
              </button>
              <button className="bg-purple-600 hover:bg-purple-700 p-3 rounded-lg font-semibold transition-colors">
                Open Chat
              </button>
            </div>
          </div>
        )}

        <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Schedule New Live Session</h2>
          <form className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Session Title</label>
                <input
                  type="text"
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Math Review Session"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Class</label>
                <select className="w-full p-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-indigo-500">
                  <option>Math Class A</option>
                  <option>Physics Lab</option>
                  <option>Chemistry Basics</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date & Time</label>
                <input
                  type="datetime-local"
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
                <input
                  type="number"
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="60"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-indigo-500"
                rows={3}
                placeholder="Session description and agenda"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Schedule Session
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}