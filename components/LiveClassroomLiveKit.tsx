import React, { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
  useRoomContext,
} from '@livekit/components-react';
import '@livekit/components-styles';
import type { AuthUser } from '../lib/auth';
import { api } from '../lib/api';

interface LiveClassroomProps {
  sessionId: number;
  user: Pick<AuthUser, 'id' | 'name' | 'role'>;
  onLeave: () => void;
}

function SessionActions({ isTeacher, sessionId, onLeave }: { isTeacher: boolean; sessionId: number; onLeave: () => void }) {
  const room = useRoomContext();

  const leaveRoom = () => {
    room.disconnect();
    onLeave();
  };

  const raiseHand = async () => {
    await room.localParticipant.publishData(
      new TextEncoder().encode(
        JSON.stringify({ type: 'raise_hand', userId: room.localParticipant.identity, sessionId }),
      ),
    );
  };

  const endSession = async () => {
    await api.endLiveSession(sessionId);
    leaveRoom();
  };

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-slate-900/90 px-4 py-3">
      <button
        onClick={raiseHand}
        className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400"
      >
        Raise Hand
      </button>
      <button
        onClick={leaveRoom}
        className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-600"
      >
        Leave Session
      </button>
      {isTeacher && (
        <button
          onClick={endSession}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500"
        >
          End Session
        </button>
      )}
    </div>
  );
}

export default function LiveClassroomLiveKit({ sessionId, user, onLeave }: LiveClassroomProps) {
  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const authToken = localStorage.getItem('auth_token');
        const response = await fetch('/api/livekit-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            session_id: sessionId,
          }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error || 'Failed to get access token');
        }

        const data = await response.json();
        setToken(data.token);
        setServerUrl(data.serverUrl);
      } catch (err) {
        console.error('Error fetching token:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect to live session');
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-white">Connecting to live session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-red-900/20 rounded-lg border border-red-500/20">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg">
        <p className="text-white">No access token available</p>
      </div>
    );
  }

  const isTeacher = user.role === 'teacher';

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={true}
      video={true}
      className="h-[85vh] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950"
      data-lk-theme="default"
    >
      <div className="flex h-full flex-col bg-slate-950">
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-900 px-4 py-3 text-sm text-white/80">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <span className="font-semibold text-white">Live Session {sessionId}</span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs uppercase tracking-wide">{user.role}</span>
          </div>
          <span className="text-xs text-white/50">Audio and video are synchronized through LiveKit</span>
        </div>

        <SessionActions isTeacher={isTeacher} sessionId={sessionId} onLeave={onLeave} />

        <div className="min-h-0 flex-1">
          <VideoConference />
        </div>

        <RoomAudioRenderer />
      </div>
    </LiveKitRoom>
  );
}