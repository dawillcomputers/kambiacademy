import React, { useState, useEffect } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useRoomContext,
  Chat,
  useChat
} from "@livekit/components-react";
import "@livekit/components-styles";

interface LiveClassroomProps {
  sessionId: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
  onLeave: () => void;
}

function Controls() {
  const room = useRoomContext();

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  useEffect(() => {
    setIsMuted(!room.localParticipant.isMicrophoneEnabled);
    setIsCameraOff(!room.localParticipant.isCameraEnabled);
  }, [room.localParticipant.isMicrophoneEnabled, room.localParticipant.isCameraEnabled]);

  return (
    <div className="flex gap-3 p-4 bg-white/10 backdrop-blur-sm rounded-lg">
      <button
        onClick={() => room.localParticipant.setMicrophoneEnabled(isMuted)}
        className={`px-4 py-2 rounded font-semibold transition-colors ${
          isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        {isMuted ? 'Unmute' : 'Mute'}
      </button>

      <button
        onClick={() => room.localParticipant.setCameraEnabled(isCameraOff)}
        className={`px-4 py-2 rounded font-semibold transition-colors ${
          isCameraOff ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        {isCameraOff ? 'Camera On' : 'Camera Off'}
      </button>

      <button
        onClick={() => room.localParticipant.setScreenShareEnabled(
          !room.localParticipant.isScreenShareEnabled
        )}
        className={`px-4 py-2 rounded font-semibold transition-colors ${
          room.localParticipant.isScreenShareEnabled
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-white/20 hover:bg-white/30'
        }`}
      >
        Screen Share
      </button>

      <button
        onClick={() => {
          // Raise hand via data channel
          room.localParticipant.publishData(
            JSON.stringify({ type: "raise_hand", userId: room.localParticipant.identity })
          );
        }}
        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded font-semibold transition-colors"
      >
        ✋ Raise Hand
      </button>
    </div>
  );
}

function TeacherControls({ onEndSession }: { onEndSession: () => void }) {
  const room = useRoomContext();

  const muteAllStudents = () => {
    room.remoteParticipants.forEach(participant => {
      if (participant.metadata && JSON.parse(participant.metadata).role === 'student') {
        participant.setMicrophoneEnabled(false);
      }
    });
  };

  return (
    <div className="flex gap-3 p-4 bg-red-900/20 backdrop-blur-sm rounded-lg border border-red-500/20">
      <button
        onClick={muteAllStudents}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded font-semibold transition-colors"
      >
        Mute All Students
      </button>
      <button
        onClick={onEndSession}
        className="px-4 py-2 bg-red-700 hover:bg-red-800 rounded font-semibold transition-colors"
      >
        End Session
      </button>
    </div>
  );
}

export default function LiveClassroom({ sessionId, user, onLeave }: LiveClassroomProps) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch("/api/livekit-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            room: `session-${sessionId}`,
            identity: user.id,
            name: user.name,
            role: user.role,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get access token');
        }

        const data = await response.json();
        setToken(data.token);
      } catch (err) {
        console.error('Error fetching token:', err);
        setError('Failed to connect to live session');
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, [sessionId, user]);

  const handleEndSession = async () => {
    try {
      // Call your API to end the session
      await fetch(`/api/live-sessions/${sessionId}/end`, { method: 'POST' });
      onLeave();
    } catch (err) {
      console.error('Error ending session:', err);
      onLeave();
    }
  };

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
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      <div className="p-4 bg-gray-800 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-white font-semibold">LIVE SESSION</span>
          </div>
          <span className="text-white/70">Session {sessionId}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowChat(!showChat)}
            className={`px-3 py-1 rounded font-semibold transition-colors ${
              showChat ? 'bg-indigo-600' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            💬 Chat
          </button>
          <button
            onClick={onLeave}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded font-semibold transition-colors"
          >
            Leave
          </button>
        </div>
      </div>

      <div className="flex">
        <div className={`flex-1 ${showChat ? 'mr-80' : ''}`}>
          <LiveKitRoom
            token={token}
            serverUrl={import.meta.env.VITE_LIVEKIT_URL || "wss://your-livekit-server.livekit.cloud"}
            connect={true}
            video={true}
            audio={true}
            className="h-96"
          >
            <div className="relative h-full">
              <VideoConference />
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <Controls />
                {isTeacher && (
                  <div className="mt-2">
                    <TeacherControls onEndSession={handleEndSession} />
                  </div>
                )}
              </div>
            </div>
            <RoomAudioRenderer />
          </LiveKitRoom>
        </div>

        {showChat && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-3 border-b border-gray-700">
              <h3 className="text-white font-semibold">Live Chat</h3>
            </div>
            <div className="flex-1">
              <Chat />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}