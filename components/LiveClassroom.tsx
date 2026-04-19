import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AuthUser } from '../lib/auth';
import { api } from '../lib/api';
import type {
  LiveRoomParticipant,
  LiveRoomSnapshot,
  RealtimeChatMessage,
  RealtimeJoinResponse,
  RoomClientEvent,
  RoomServerEvent,
} from '../lib/liveClassroomProtocol';
import { useClassroomMedia } from './live-classroom/media';

interface LiveClassroomProps {
  sessionId: number;
  user: Pick<AuthUser, 'id' | 'name' | 'role'>;
  onLeave: () => void;
}

const formatClock = (value: string) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const toInitials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || 'U';

const mergeParticipant = (participants: LiveRoomParticipant[], nextParticipant: LiveRoomParticipant) => {
  const existingIndex = participants.findIndex((participant) => participant.participantId === nextParticipant.participantId);
  if (existingIndex === -1) {
    return [...participants, nextParticipant];
  }

  const nextParticipants = [...participants];
  nextParticipants[existingIndex] = nextParticipant;
  return nextParticipants;
};

const sortParticipants = (participants: LiveRoomParticipant[]) => [...participants].sort((left, right) => {
  if (left.role === right.role) {
    return left.name.localeCompare(right.name);
  }

  if (left.role === 'teacher') {
    return -1;
  }

  if (right.role === 'teacher') {
    return 1;
  }

  return left.name.localeCompare(right.name);
});

function ParticipantCard({ participant, self, stream }: { participant: LiveRoomParticipant; self?: boolean; stream?: MediaStream | null }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasVideo = Boolean(stream?.getVideoTracks().length);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = hasVideo ? stream || null : null;
    }

    if (audioRef.current) {
      audioRef.current.srcObject = !hasVideo ? stream || null : null;
    }
  }, [hasVideo, stream]);

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_16px_50px_rgba(15,23,42,0.09)] transition-transform duration-300 hover:-translate-y-1">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-cyan-300 to-amber-300 opacity-70" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
              {toInitials(participant.name)}
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-slate-950">{participant.name}</p>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                {participant.role}
                {self ? ' / you' : ''}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="rounded-full bg-slate-100 px-2.5 py-1">Mic {participant.media.audioEnabled ? 'on' : 'off'}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1">Cam {participant.media.videoEnabled ? 'on' : 'off'}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1">Share {participant.media.screenShareEnabled ? 'on' : 'off'}</span>
          </div>
        </div>
        {participant.handRaised && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Hand Raised</span>
        )}
      </div>
      <div className="mt-5 rounded-3xl bg-[linear-gradient(135deg,#0f172a_0%,#0b4a6f_48%,#164e63_100%)] p-6 text-white">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-white/70">
          <span>{participant.connectionState}</span>
          <span>{formatClock(participant.joinedAt)}</span>
        </div>
        <div className="mt-6 overflow-hidden rounded-[22px] border border-white/10 bg-black/30">
          {hasVideo ? (
            <video ref={videoRef} autoPlay playsInline muted={self} className="h-[240px] w-full bg-black object-cover" />
          ) : (
            <div className="flex h-[240px] items-center justify-center">
              <div className="text-center">
                <p className="font-display text-4xl font-semibold">{toInitials(participant.name)}</p>
                <p className="mt-2 max-w-xs text-sm text-white/70">
                  {stream?.getAudioTracks().length
                    ? 'Audio is live. Video is currently unavailable for this participant.'
                    : 'Waiting for media from this participant.'}
                </p>
              </div>
            </div>
          )}
          {!hasVideo && stream?.getAudioTracks().length ? <audio ref={audioRef} autoPlay /> : null}
        </div>
      </div>
    </div>
  );
}

export default function LiveClassroom({ sessionId, user, onLeave }: LiveClassroomProps) {
  const [joinData, setJoinData] = useState<RealtimeJoinResponse | null>(null);
  const [room, setRoom] = useState<LiveRoomSnapshot | null>(null);
  const [messages, setMessages] = useState<RealtimeChatMessage[]>([]);
  const [draftMessage, setDraftMessage] = useState('');
  const [connectionState, setConnectionState] = useState<'joining' | 'connecting' | 'connected' | 'disconnected' | 'error'>('joining');
  const [error, setError] = useState('');
  const socketRef = useRef<WebSocket | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);

  const media = useClassroomMedia({
    classroomSessionId: sessionId,
    currentParticipantId: joinData?.participant.participantId ?? null,
    participants: room?.participants || [],
    config: joinData?.media ?? null,
  });

  const sendServerEvent = useCallback((event: RoomServerEvent) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    socket.send(JSON.stringify(event));
    return true;
  }, []);

  const handleRoomEvent = useCallback((event: RoomClientEvent) => {
    switch (event.type) {
      case 'presence.sync':
        setRoom(event.room);
        break;
      case 'participant.joined':
      case 'participant.updated':
        setRoom((currentRoom) => {
          const nextParticipants = sortParticipants(mergeParticipant(currentRoom?.participants || [], event.participant));
          return {
            roomId: currentRoom?.roomId || `live-session-${sessionId}`,
            sessionId: currentRoom?.sessionId || sessionId,
            participants: nextParticipants,
            notices: currentRoom?.notices || [],
            updatedAt: new Date().toISOString(),
          };
        });
        break;
      case 'participant.left':
        setRoom((currentRoom) => {
          if (!currentRoom) {
            return currentRoom;
          }

          return {
            ...currentRoom,
            participants: currentRoom.participants.filter((participant) => participant.participantId !== event.participantId),
            updatedAt: new Date().toISOString(),
          };
        });
        break;
      case 'chat.message':
        setMessages((currentMessages) => {
          if (currentMessages.some((message) => message.id === event.message.id)) {
            return currentMessages;
          }

          return [...currentMessages, event.message];
        });
        break;
      case 'room.notice':
        setRoom((currentRoom) => {
          if (!currentRoom) {
            return currentRoom;
          }

          return {
            ...currentRoom,
            notices: [...currentRoom.notices.slice(-7), event.notice],
            updatedAt: new Date().toISOString(),
          };
        });
        break;
      case 'room.pong':
        break;
      default:
        break;
    }
  }, [sessionId]);

  useEffect(() => {
    let active = true;

    const connectRoom = async () => {
      try {
        setConnectionState('joining');
        setError('');

        const response = await api.joinLiveRoom(sessionId);
        if (!active) {
          return;
        }

        setJoinData(response);
        setMessages(response.chatHistory);
        setConnectionState('connecting');

        const socket = new WebSocket(response.socketUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          if (!active) {
            return;
          }

          setConnectionState('connected');
        };

        socket.onmessage = (event) => {
          if (!active) {
            return;
          }

          try {
            handleRoomEvent(JSON.parse(event.data) as RoomClientEvent);
          } catch {
            setError('Received an invalid realtime event payload.');
          }
        };

        socket.onerror = () => {
          if (!active) {
            return;
          }

          setConnectionState('error');
          setError('The realtime signaling channel disconnected.');
        };

        socket.onclose = () => {
          if (!active) {
            return;
          }

          setConnectionState((currentState) => (currentState === 'error' ? currentState : 'disconnected'));
        };
      } catch (err) {
        if (!active) {
          return;
        }

        setConnectionState('error');
        setError(err instanceof Error ? err.message : 'Failed to connect to the classroom');
      }
    };

    void connectRoom();

    return () => {
      active = false;
      socketRef.current?.close();
      socketRef.current = null;
      media.stop();
    };
  }, [handleRoomEvent, media.stop, sessionId]);

  useEffect(() => {
    if (!previewRef.current) {
      return;
    }

    previewRef.current.srcObject = media.previewStream;
  }, [media.previewStream]);

  useEffect(() => {
    if (connectionState !== 'connected') {
      return;
    }

    sendServerEvent({
      type: 'media.update',
      media: {
        audioEnabled: media.audioEnabled,
        videoEnabled: media.videoEnabled,
        screenShareEnabled: media.screenShareEnabled,
      },
      mediaSessionId: media.mediaSessionId || undefined,
      publications: media.publications,
    });
  }, [connectionState, media.audioEnabled, media.mediaSessionId, media.publications, media.screenShareEnabled, media.videoEnabled, sendServerEvent]);

  const remoteStreamsByParticipant = useMemo(() => new Map(media.remoteStreams.map((entry) => [entry.participantId, entry.stream])), [media.remoteStreams]);

  const fallbackConnectionState: LiveRoomParticipant['connectionState'] = connectionState === 'connected' ? 'connected' : 'connecting';

  const selfParticipant = useMemo(() => (
    room?.participants.find((participant) => participant.participantId === joinData?.participant.participantId)
    || (joinData ? {
      participantId: joinData.participant.participantId,
      userId: joinData.participant.userId,
      name: joinData.participant.name,
      role: joinData.participant.role,
      joinedAt: joinData.session.startedAt,
      handRaised: false,
      connectionState: fallbackConnectionState,
      media: joinData.participant.media,
      mediaSessionId: joinData.participant.mediaSessionId,
      publications: joinData.participant.publications,
    } : null)
  ), [fallbackConnectionState, joinData, room]);

  const otherParticipants = useMemo(() => (
    (room?.participants || []).filter((participant) => participant.participantId !== joinData?.participant.participantId)
  ), [joinData?.participant.participantId, room]);

  const handRaised = Boolean(selfParticipant?.handRaised);
  const isTeacher = user.role === 'teacher';

  const leaveRoom = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
    media.stop();
    onLeave();
  }, [media, onLeave]);

  const endSession = useCallback(async () => {
    await api.endLiveSession(sessionId);
    leaveRoom();
  }, [leaveRoom, sessionId]);

  const sendMessage = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draftMessage.trim();
    if (!text) {
      return;
    }

    const sent = sendServerEvent({ type: 'chat.send', text });
    if (sent) {
      setDraftMessage('');
    }
  }, [draftMessage, sendServerEvent]);

  if (!joinData && connectionState === 'joining') {
    return (
      <div className="flex h-64 items-center justify-center rounded-[28px] border border-slate-200 bg-white/80 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-sky-500" />
          <p className="font-medium text-slate-700">Initializing the realtime classroom…</p>
        </div>
      </div>
    );
  }

  if (!joinData && error) {
    return (
      <div className="flex h-64 items-center justify-center rounded-[28px] border border-rose-200 bg-rose-50/90 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="text-center">
          <p className="mb-4 text-rose-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-full bg-slate-950 px-4 py-2 font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!joinData) {
    return (
      <div className="flex h-64 items-center justify-center rounded-[28px] border border-slate-200 bg-white/80 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <p className="text-slate-700">No classroom join state is available.</p>
      </div>
    );
  }

  return (
    <div className="h-[85vh] overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/80 shadow-[0_32px_120px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="grid h-full min-h-0 lg:grid-cols-[minmax(0,1.35fr)_360px]">
        <section className="flex min-h-0 flex-col border-b border-slate-200/70 lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-200/70 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.32),transparent_32%),linear-gradient(135deg,#f8fafc,#eef2ff_48%,#fff7ed)] px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex h-3 w-3 rounded-full ${connectionState === 'connected' ? 'bg-emerald-500' : connectionState === 'error' ? 'bg-rose-500' : 'bg-amber-400'}`} />
                  <p className="font-display text-2xl font-semibold text-slate-950">{joinData.session.title}</p>
                </div>
                <p className="mt-1 text-sm text-slate-600">{joinData.session.classTitle} · {joinData.media.vendor} managed SFU · {connectionState}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-slate-600 shadow-sm">
                <p className="font-medium text-slate-900">{media.providerLabel}</p>
                <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">{media.providerDescription}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200/70 bg-white/70 px-5 py-4">
            <button
              onClick={() => {
                void sendServerEvent({ type: 'hand.raise', raised: !handRaised });
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${handRaised ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-slate-950 text-white hover:bg-slate-800'}`}
            >
              {handRaised ? 'Lower Hand' : 'Raise Hand'}
            </button>
            <button
              onClick={() => {
                void media.toggleAudio();
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${media.audioEnabled ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              Mic {media.audioEnabled ? 'On' : 'Off'}
            </button>
            <button
              onClick={() => {
                void media.toggleVideo();
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${media.videoEnabled ? 'bg-sky-100 text-sky-700 hover:bg-sky-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              Camera {media.videoEnabled ? 'On' : 'Off'}
            </button>
            <button
              onClick={() => {
                void media.toggleScreenShare();
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${media.screenShareEnabled ? 'bg-violet-100 text-violet-700 hover:bg-violet-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              {media.screenShareEnabled ? 'Stop Share' : 'Share Screen'}
            </button>
            <button
              onClick={leaveRoom}
              className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-300"
            >
              Leave Session
            </button>
            {isTeacher && (
              <button
                onClick={() => {
                  void endSession();
                }}
                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-500"
              >
                End Session
              </button>
            )}
          </div>

          <div className="grid min-h-0 flex-1 gap-4 p-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
            <div className="flex min-h-0 flex-col gap-4">
              <div className="relative overflow-hidden rounded-[30px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.22),transparent_28%),linear-gradient(160deg,#0f172a_0%,#082f49_58%,#111827_100%)] p-5 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-white/60">Local Preview</p>
                    <p className="mt-2 font-display text-3xl font-semibold">{selfParticipant?.name || user.name}</p>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-white/70">{media.status}</span>
                </div>
                <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-black/30">
                  {media.previewStream ? (
                    <video ref={previewRef} autoPlay playsInline muted className="h-[320px] w-full bg-black object-cover" />
                  ) : (
                    <div className="flex h-[320px] items-center justify-center">
                      <div className="text-center">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-2xl font-semibold text-white">
                          {toInitials(user.name)}
                        </div>
                        <p className="mt-4 text-sm text-white/70">Local media preview will appear here after browser permissions are granted.</p>
                      </div>
                    </div>
                  )}
                </div>
                {media.error && <p className="mt-3 text-sm text-rose-200">{media.error}</p>}
                {error && <p className="mt-2 text-sm text-amber-200">{error}</p>}
              </div>

              <div className="min-h-0 rounded-[30px] border border-slate-200/80 bg-white/80 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-xl font-semibold text-slate-950">Participant Grid</p>
                    <p className="text-sm text-slate-500">The Durable Object room state and the Cloudflare Realtime peer connection are now feeding these participant tiles.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{otherParticipants.length} remote</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {selfParticipant && <ParticipantCard participant={selfParticipant} self stream={media.previewStream} />}
                  {otherParticipants.map((participant) => (
                    <ParticipantCard key={participant.participantId} participant={participant} stream={remoteStreamsByParticipant.get(participant.participantId) || null} />
                  ))}
                  {!selfParticipant && !otherParticipants.length && (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
                      Waiting for the room snapshot from the Durable Object.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <aside className="flex min-h-0 flex-col overflow-hidden rounded-[30px] bg-slate-950 text-slate-100 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
              <div className="border-b border-white/10 px-5 py-4">
                <p className="font-display text-xl font-semibold">Live Control</p>
                <p className="mt-1 text-sm text-slate-400">Participants, notices, and classroom chat are now driven by the realtime room service.</p>
              </div>

              <div className="grid min-h-0 flex-1 grid-rows-[auto_auto_minmax(0,1fr)_auto]">
                <div className="border-b border-white/10 px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Participants</p>
                  <div className="mt-3 space-y-3">
                    {sortParticipants(room?.participants || []).map((participant) => (
                      <div key={participant.participantId} className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-white">{participant.name}</p>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{participant.role}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                          <span>{participant.media.audioEnabled ? 'Mic' : 'Muted'}</span>
                          <span>{participant.media.videoEnabled ? 'Cam' : 'No Cam'}</span>
                          <span>{participant.publications.length} track{participant.publications.length === 1 ? '' : 's'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-b border-white/10 px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Recent Notices</p>
                  <div className="mt-3 space-y-2">
                    {(room?.notices || []).slice(-4).map((notice) => (
                      <div key={notice.id} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
                        <p>{notice.message}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatClock(notice.createdAt)}</p>
                      </div>
                    ))}
                    {!(room?.notices || []).length && <p className="text-sm text-slate-500">Room notices will appear here.</p>}
                  </div>
                </div>

                <div className="min-h-0 overflow-y-auto px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Chat</p>
                  <div className="mt-3 space-y-3">
                    {messages.map((message) => (
                      <div key={message.id} className="rounded-2xl bg-white/5 px-4 py-3">
                        <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                          <span className="font-semibold uppercase tracking-[0.18em] text-slate-300">{message.userName}</span>
                          <span>{formatClock(message.createdAt)}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-100">{message.text}</p>
                      </div>
                    ))}
                    {!messages.length && <p className="text-sm text-slate-500">Room chat is empty.</p>}
                  </div>
                </div>

                <form onSubmit={sendMessage} className="border-t border-white/10 px-5 py-4">
                  <div className="flex gap-3">
                    <input
                      value={draftMessage}
                      onChange={(event) => setDraftMessage(event.target.value)}
                      placeholder="Send a room update..."
                      className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="rounded-full bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400"
                    >
                      Send
                    </button>
                  </div>
                </form>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}