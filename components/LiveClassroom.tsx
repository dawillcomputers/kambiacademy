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

const MicOffIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 text-rose-400" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
    <line x1="12" y1="19" x2="12" y2="23" />
  </svg>
);

interface TileEntry {
  participant: LiveRoomParticipant;
  self: boolean;
  stream: MediaStream | null;
}

function ControlButton({
  active,
  onClick,
  label,
  tone = 'neutral',
  title,
}: {
  active?: boolean;
  onClick: () => void;
  label: React.ReactNode;
  tone?: 'neutral' | 'on' | 'off' | 'danger';
  title?: string;
}) {
  const toneClass = tone === 'danger'
    ? 'bg-rose-600 text-white hover:bg-rose-500'
    : active
      ? 'bg-white text-slate-900 hover:bg-slate-200'
      : tone === 'off'
        ? 'bg-rose-500/20 text-rose-200 hover:bg-rose-500/30'
        : 'bg-white/10 text-white hover:bg-white/20';
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${toneClass}`}
    >
      {label}
    </button>
  );
}

function VideoTile({
  participant,
  self,
  stream,
  mirror,
  sinkId,
  pinned,
  onTogglePin,
  compact,
}: {
  participant: LiveRoomParticipant;
  self?: boolean;
  stream?: MediaStream | null;
  mirror?: boolean;
  sinkId?: string;
  pinned?: boolean;
  onTogglePin?: () => void;
  compact?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasVideo = Boolean(stream?.getVideoTracks().length);
  const hasAudioOnly = !hasVideo && Boolean(stream?.getAudioTracks().length);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = hasVideo ? stream || null : null;
    }

    if (audioRef.current) {
      audioRef.current.srcObject = !hasVideo ? stream || null : null;
    }
  }, [hasVideo, stream]);

  // Route playback to the participant's chosen speaker where the browser allows it.
  useEffect(() => {
    if (self || !sinkId) {
      return;
    }

    const apply = (element: (HTMLMediaElement & { setSinkId?: (id: string) => Promise<void> }) | null) => {
      if (element && typeof element.setSinkId === 'function') {
        element.setSinkId(sinkId).catch(() => undefined);
      }
    };

    apply(videoRef.current);
    apply(audioRef.current);
  }, [self, sinkId, hasVideo]);

  return (
    <div className="group relative h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-lg">
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={self}
          className={`h-full w-full bg-black object-cover ${self && mirror ? '-scale-x-100' : ''}`}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#0f172a_0%,#0b3a52_100%)]">
          <div className="text-center">
            <div className={`mx-auto flex items-center justify-center rounded-full bg-white/10 font-semibold text-white ${compact ? 'h-10 w-10 text-sm' : 'h-16 w-16 text-xl'}`}>
              {toInitials(participant.name)}
            </div>
            {!compact && <p className="mt-3 text-xs text-white/60">{hasAudioOnly ? 'Audio only' : 'Camera off'}</p>}
          </div>
        </div>
      )}
      {hasAudioOnly ? <audio ref={audioRef} autoPlay /> : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/75 to-transparent px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-medium text-white">
            {participant.name}{self ? ' (You)' : ''}
          </span>
          {!participant.media.audioEnabled && <MicOffIcon />}
        </div>
        {participant.handRaised && <span className="text-base leading-none">✋</span>}
      </div>

      {onTogglePin && (
        <button
          onClick={onTogglePin}
          title={pinned ? 'Unpin' : 'Pin to main stage'}
          className="pointer-events-auto absolute right-2 top-2 rounded-lg bg-black/55 px-2 py-1 text-xs font-medium text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/75 group-hover:opacity-100"
        >
          {pinned ? 'Unpin' : 'Pin'}
        </button>
      )}
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

  // Presentation / settings state.
  const [expanded, setExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'speaker'>('grid');
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelTab, setPanelTab] = useState<'chat' | 'people'>('chat');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mirror, setMirror] = useState(true);
  const [hideSelf, setHideSelf] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

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

  // Keep the latest chat message in view.
  useEffect(() => {
    if (panelOpen && panelTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [messages, panelOpen, panelTab]);

  // Track native (browser) fullscreen so the button label stays accurate.
  useEffect(() => {
    const handler = () => setIsNativeFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleNativeFullscreen = useCallback(() => {
    const element = rootRef.current;
    if (!element) {
      return;
    }

    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
    } else {
      void element.requestFullscreen?.();
    }
  }, []);

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

  const stageTiles = useMemo<TileEntry[]>(() => {
    const tiles: TileEntry[] = [];
    if (selfParticipant && !hideSelf) {
      tiles.push({ participant: selfParticipant, self: true, stream: media.previewStream });
    }
    otherParticipants.forEach((participant) => {
      tiles.push({ participant, self: false, stream: remoteStreamsByParticipant.get(participant.participantId) || null });
    });
    return tiles;
  }, [selfParticipant, hideSelf, otherParticipants, media.previewStream, remoteStreamsByParticipant]);

  const featuredTile = useMemo(() => (
    stageTiles.find((tile) => tile.participant.participantId === pinnedId)
    || stageTiles.find((tile) => !tile.self && Boolean(tile.stream?.getVideoTracks().length))
    || stageTiles[0]
    || null
  ), [stageTiles, pinnedId]);

  const filmstripTiles = useMemo(() => stageTiles.filter((tile) => tile !== featuredTile), [stageTiles, featuredTile]);

  const gridColsClass = stageTiles.length <= 1
    ? 'grid-cols-1'
    : stageTiles.length <= 4
      ? 'grid-cols-1 sm:grid-cols-2'
      : stageTiles.length <= 9
        ? 'grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-2 lg:grid-cols-4';

  const leaveRoom = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
    }
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

  const connectionDot = connectionState === 'connected' ? 'bg-emerald-500' : connectionState === 'error' ? 'bg-rose-500' : 'bg-amber-400';
  const selectClass = 'w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none';

  return (
    <div
      ref={rootRef}
      className={
        expanded
          ? 'fixed inset-0 z-[60] bg-slate-950'
          : 'relative h-[80vh] overflow-hidden rounded-[28px] border border-slate-200/80 bg-slate-950 shadow-[0_32px_120px_rgba(15,23,42,0.25)]'
      }
    >
      <div className="flex h-full flex-col text-white">
        {/* Top bar */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-900/80 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${connectionDot}`} />
            <div className="min-w-0">
              <p className="truncate font-semibold leading-tight">{joinData.session.title}</p>
              <p className="truncate text-xs text-slate-400">{joinData.session.classTitle} · {connectionState} · {stageTiles.length} on stage</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-full border border-white/15">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${viewMode === 'grid' ? 'bg-white text-slate-900' : 'text-white hover:bg-white/10'}`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('speaker')}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${viewMode === 'speaker' ? 'bg-white text-slate-900' : 'text-white hover:bg-white/10'}`}
              >
                Speaker
              </button>
            </div>
            <button
              onClick={() => setSettingsOpen((open) => !open)}
              title="Settings"
              className={`rounded-full px-3 py-1.5 text-sm transition-colors ${settingsOpen ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              ⚙️
            </button>
            <button
              onClick={() => setPanelOpen((open) => !open)}
              title={panelOpen ? 'Hide chat & people' : 'Show chat & people'}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors ${panelOpen ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              💬
            </button>
            <button
              onClick={toggleNativeFullscreen}
              title={isNativeFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/20"
            >
              {isNativeFullscreen ? '🗗' : '⛶'}
            </button>
            <button
              onClick={() => setExpanded((value) => !value)}
              title={expanded ? 'Minimize to dashboard' : 'Expand to full window'}
              className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/20"
            >
              {expanded ? '🗕' : '🗖'}
            </button>
          </div>
        </header>

        {/* Body: stage + side panel */}
        <div className="relative flex min-h-0 flex-1">
          <main className="flex min-h-0 flex-1 flex-col">
            <div className="relative min-h-0 flex-1 bg-slate-950 p-2 sm:p-3">
              {stageTiles.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/15 text-center text-slate-400">
                  Waiting for participants to join the room…
                </div>
              ) : viewMode === 'speaker' && featuredTile ? (
                <div className="flex h-full min-h-0 flex-col gap-2">
                  <div className="min-h-0 flex-1">
                    <VideoTile
                      participant={featuredTile.participant}
                      self={featuredTile.self}
                      stream={featuredTile.stream}
                      mirror={mirror}
                      sinkId={media.selectedSpeakerId}
                      pinned={featuredTile.participant.participantId === pinnedId}
                      onTogglePin={() => setPinnedId((current) => (current === featuredTile.participant.participantId ? null : featuredTile.participant.participantId))}
                    />
                  </div>
                  {filmstripTiles.length > 0 && (
                    <div className="flex shrink-0 gap-2 overflow-x-auto pb-1">
                      {filmstripTiles.map((tile) => (
                        <div key={tile.participant.participantId} className="h-24 w-40 shrink-0 sm:h-28 sm:w-48">
                          <VideoTile
                            participant={tile.participant}
                            self={tile.self}
                            stream={tile.stream}
                            mirror={mirror}
                            sinkId={media.selectedSpeakerId}
                            compact
                            pinned={tile.participant.participantId === pinnedId}
                            onTogglePin={() => setPinnedId(tile.participant.participantId)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className={`grid h-full min-h-0 auto-rows-fr gap-2 sm:gap-3 ${gridColsClass}`}>
                  {stageTiles.map((tile) => (
                    <VideoTile
                      key={tile.participant.participantId}
                      participant={tile.participant}
                      self={tile.self}
                      stream={tile.stream}
                      mirror={mirror}
                      sinkId={media.selectedSpeakerId}
                      pinned={tile.participant.participantId === pinnedId}
                      onTogglePin={() => setPinnedId((current) => (current === tile.participant.participantId ? null : tile.participant.participantId))}
                    />
                  ))}
                </div>
              )}

              {(media.error || error) && (
                <div className="pointer-events-none absolute inset-x-0 top-2 mx-auto w-fit max-w-[90%] rounded-full bg-rose-600/90 px-4 py-1.5 text-xs font-medium text-white shadow-lg">
                  {media.error || error}
                </div>
              )}

              {/* Settings drawer */}
              {settingsOpen && (
                <div className="absolute right-3 top-3 z-30 w-72 rounded-2xl border border-white/15 bg-slate-900/95 p-4 shadow-2xl backdrop-blur">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">Settings</p>
                    <button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">Camera</label>
                      <select
                        className={selectClass}
                        value={media.selectedCameraId}
                        onChange={(event) => { void media.selectCamera(event.target.value); }}
                        disabled={!media.devices.cameras.length}
                      >
                        {media.devices.cameras.length === 0 && <option>No camera detected</option>}
                        {media.devices.cameras.map((device, index) => (
                          <option key={device.deviceId || index} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">Microphone</label>
                      <select
                        className={selectClass}
                        value={media.selectedMicrophoneId}
                        onChange={(event) => { void media.selectMicrophone(event.target.value); }}
                        disabled={!media.devices.microphones.length}
                      >
                        {media.devices.microphones.length === 0 && <option>No microphone detected</option>}
                        {media.devices.microphones.map((device, index) => (
                          <option key={device.deviceId || index} value={device.deviceId}>{device.label || `Microphone ${index + 1}`}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">Speaker</label>
                      <select
                        className={selectClass}
                        value={media.selectedSpeakerId}
                        onChange={(event) => media.selectSpeaker(event.target.value)}
                        disabled={!media.devices.speakers.length}
                      >
                        {media.devices.speakers.length === 0 && <option>System default</option>}
                        {media.devices.speakers.map((device, index) => (
                          <option key={device.deviceId || index} value={device.deviceId}>{device.label || `Speaker ${index + 1}`}</option>
                        ))}
                      </select>
                    </div>
                    <label className="flex cursor-pointer items-center justify-between text-sm text-slate-200">
                      <span>Mirror my video</span>
                      <input type="checkbox" checked={mirror} onChange={(event) => setMirror(event.target.checked)} className="h-4 w-4 accent-sky-500" />
                    </label>
                    <label className="flex cursor-pointer items-center justify-between text-sm text-slate-200">
                      <span>Hide my self-view</span>
                      <input type="checkbox" checked={hideSelf} onChange={(event) => setHideSelf(event.target.checked)} className="h-4 w-4 accent-sky-500" />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Control bar */}
            <footer className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 bg-slate-900/80 px-3 py-3">
              <ControlButton
                active={media.audioEnabled}
                tone={media.audioEnabled ? 'on' : 'off'}
                onClick={() => { void media.toggleAudio(); }}
                label={`🎙️ ${media.audioEnabled ? 'Mute' : 'Unmute'}`}
                title="Toggle microphone"
              />
              <ControlButton
                active={media.videoEnabled}
                tone={media.videoEnabled ? 'on' : 'off'}
                onClick={() => { void media.toggleVideo(); }}
                label={`📷 ${media.videoEnabled ? 'Stop video' : 'Start video'}`}
                title="Toggle camera"
              />
              <ControlButton
                active={media.screenShareEnabled}
                onClick={() => { void media.toggleScreenShare(); }}
                label={`🖥️ ${media.screenShareEnabled ? 'Stop share' : 'Share'}`}
                title="Share your screen"
              />
              <ControlButton
                active={handRaised}
                onClick={() => { void sendServerEvent({ type: 'hand.raise', raised: !handRaised }); }}
                label={`✋ ${handRaised ? 'Lower' : 'Raise'}`}
                title="Raise or lower your hand"
              />
              <ControlButton
                onClick={() => setSettingsOpen((open) => !open)}
                active={settingsOpen}
                label="⚙️ Settings"
                title="Open settings"
              />
              <ControlButton
                onClick={leaveRoom}
                label="Leave"
                title="Leave the session"
              />
              {isTeacher && (
                <ControlButton
                  tone="danger"
                  onClick={() => { void endSession(); }}
                  label="End session"
                  title="End the session for everyone"
                />
              )}
            </footer>
          </main>

          {/* Side panel */}
          {panelOpen && (
            <aside className="absolute inset-y-0 right-0 z-20 flex w-full max-w-sm flex-col border-l border-white/10 bg-slate-900 lg:static lg:w-80">
              <div className="flex items-center gap-1 border-b border-white/10 p-2">
                <button
                  onClick={() => setPanelTab('chat')}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${panelTab === 'chat' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Chat
                </button>
                <button
                  onClick={() => setPanelTab('people')}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${panelTab === 'people' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  People ({room?.participants.length || 0})
                </button>
                <button
                  onClick={() => setPanelOpen(false)}
                  className="rounded-lg px-2 py-2 text-slate-400 hover:text-white lg:hidden"
                  title="Close panel"
                >
                  ✕
                </button>
              </div>

              {panelTab === 'people' ? (
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                  {sortParticipants(room?.participants || []).map((participant) => (
                    <div key={participant.participantId} className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white">{toInitials(participant.name)}</div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{participant.name}</p>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{participant.role}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-slate-300">
                        {participant.handRaised && <span title="Hand raised">✋</span>}
                        {!participant.media.audioEnabled && <MicOffIcon />}
                        <button
                          onClick={() => setPinnedId((current) => (current === participant.participantId ? null : participant.participantId))}
                          title={pinnedId === participant.participantId ? 'Unpin' : 'Pin to main stage'}
                          className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${pinnedId === participant.participantId ? 'bg-sky-500 text-white' : 'bg-white/10 text-slate-200 hover:bg-white/20'}`}
                        >
                          {pinnedId === participant.participantId ? 'Pinned' : 'Pin'}
                        </button>
                      </div>
                    </div>
                  ))}
                  {!(room?.participants || []).length && <p className="text-sm text-slate-500">No participants yet.</p>}
                </div>
              ) : (
                <>
                  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
                    {messages.map((message) => (
                      <div key={message.id} className="rounded-xl bg-white/5 px-3 py-2">
                        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                          <span className="font-semibold text-slate-300">{message.userName}</span>
                          <span>{formatClock(message.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-100">{message.text}</p>
                      </div>
                    ))}
                    {!messages.length && <p className="text-sm text-slate-500">No messages yet. Say hello!</p>}
                    <div ref={chatEndRef} />
                  </div>
                  <form onSubmit={sendMessage} className="border-t border-white/10 p-3">
                    <div className="flex gap-2">
                      <input
                        value={draftMessage}
                        onChange={(event) => setDraftMessage(event.target.value)}
                        placeholder="Type a message…"
                        className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="rounded-full bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400"
                      >
                        Send
                      </button>
                    </div>
                  </form>
                </>
              )}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
