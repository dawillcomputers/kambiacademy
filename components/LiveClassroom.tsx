import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

interface LiveSession {
  id: number;
  class_id: number;
  tutor_id: number;
  title: string;
  status: string;
  started_at: string;
  class_title: string;
  member_count?: number;
}

interface LiveMessage {
  id: number;
  session_id: number;
  user_id: number;
  user_name: string;
  text: string;
  created_at: string;
}

interface Participant {
  id: number;
  name: string;
  role: string;
}

interface LiveClassroomProps {
  sessionId: number;
  onLeave: () => void;
}

const LiveClassroom: React.FC<LiveClassroomProps> = ({ sessionId, onLeave }) => {
  const { user } = useAuth();
  const [session, setSession] = useState<LiveSession | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Media state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [activeSidebar, setActiveSidebar] = useState<'chat' | 'participants' | null>('chat');
  const [sessionTime, setSessionTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const lastMessageIdRef = useRef(0);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load session data
  useEffect(() => {
    const loadSession = async () => {
      try {
        const data = await api.getLiveSession(sessionId);
        setSession(data.session);
        setParticipants(data.participants);
        setMessages(data.messages);
        if (data.messages.length > 0) {
          lastMessageIdRef.current = data.messages[data.messages.length - 1].id;
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, [sessionId]);

  // Start media
  useEffect(() => {
    if (!session) return;
    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        setLocalStream(stream);

        // Audio level monitoring
        const ctx = new AudioContext();
        audioContextRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkLevel = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel((avg / 255) * 100);
          requestAnimationFrame(checkLevel);
        };
        checkLevel();
      } catch (err) {
        console.error('Media access error:', err);
      }
    };
    startMedia();

    return () => {
      audioContextRef.current?.close();
      analyserRef.current = null;
    };
  }, [session]);

  // Attach stream to video
  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = isSharing && screenStream ? screenStream : localStream;
  }, [localStream, screenStream, isSharing]);

  // Session timer
  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => setSessionTime((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [session]);

  // Poll for new messages
  useEffect(() => {
    if (!session) return;
    pollIntervalRef.current = setInterval(async () => {
      try {
        const data = await api.getLiveMessages(sessionId, lastMessageIdRef.current);
        if (data.messages.length > 0) {
          setMessages((prev) => [...prev, ...data.messages]);
          lastMessageIdRef.current = data.messages[data.messages.length - 1].id;
        }
      } catch {}
    }, 3000);
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, [session, sessionId]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup streams on unmount
  useEffect(() => {
    return () => {
      localStream?.getTracks().forEach((t) => t.stop());
      screenStream?.getTracks().forEach((t) => t.stop());
    };
  }, [localStream, screenStream]);

  const toggleMic = useCallback(() => {
    localStream?.getAudioTracks().forEach((t) => (t.enabled = isMuted));
    setIsMuted(!isMuted);
  }, [localStream, isMuted]);

  const toggleCamera = useCallback(() => {
    localStream?.getVideoTracks().forEach((t) => (t.enabled = isCameraOff));
    setIsCameraOff(!isCameraOff);
  }, [localStream, isCameraOff]);

  const toggleScreenShare = useCallback(async () => {
    if (isSharing) {
      screenStream?.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
      setIsSharing(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        stream.getVideoTracks()[0].onended = () => {
          setIsSharing(false);
          setScreenStream(null);
        };
        setScreenStream(stream);
        setIsSharing(true);
      } catch {}
    }
  }, [isSharing, screenStream]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      const stream = isSharing && screenStream ? screenStream : localStream;
      if (!stream) return;
      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recording-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    }
  }, [isRecording, isSharing, screenStream, localStream]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    try {
      const msg = await api.sendLiveMessage(sessionId, inputText.trim());
      setMessages((prev) => [...prev, msg]);
      lastMessageIdRef.current = msg.id;
      setInputText('');
    } catch {}
  };

  const endSession = async () => {
    try {
      await api.endLiveSession(sessionId);
      handleLeave();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleLeave = () => {
    localStream?.getTracks().forEach((t) => t.stop());
    screenStream?.getTracks().forEach((t) => t.stop());
    if (isRecording) mediaRecorderRef.current?.stop();
    onLeave();
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${m}:${String(sec).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 font-semibold mb-4">{error}</p>
        <button onClick={onLeave} className="rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white">
          Go Back
        </button>
      </div>
    );
  }

  const isTutor = user?.role === 'teacher' && session?.tutor_id === user?.id;

  return (
    <div className="flex flex-col h-[85vh] bg-slate-950 text-white rounded-2xl shadow-2xl overflow-hidden border border-slate-800">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-900/80 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-red-400">Live</span>
          </div>
          <span className="text-sm font-semibold text-white/80">{session?.title || session?.class_title}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-white/40">{formatTime(sessionTime)}</span>
          <span className="text-xs text-white/40">{participants.length} in class</span>
          {isTutor && (
            <button onClick={endSession} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition">
              End Session
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Video area */}
        <div className="flex-1 flex flex-col relative bg-black">
          <div className="flex-1 flex items-center justify-center">
            {isCameraOff && !isSharing ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-28 h-28 rounded-full bg-slate-800 flex items-center justify-center text-4xl font-bold text-slate-500 border-2 border-slate-700">
                  {user?.name?.charAt(0) || '?'}
                </div>
                <p className="text-sm text-slate-500">Camera is off</p>
              </div>
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-contain" />
            )}
          </div>

          {/* Audio level bar */}
          {!isMuted && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur rounded-lg px-3 py-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
              <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-green-400 rounded-full transition-all duration-75" style={{ width: `${audioLevel}%` }} />
              </div>
            </div>
          )}

          {/* Hand raised indicator */}
          {isHandRaised && (
            <div className="absolute top-4 right-4 bg-yellow-500 text-black rounded-full p-2 animate-bounce">
              <span className="text-lg">✋</span>
            </div>
          )}

          {/* Control bar */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-center gap-3">
              <CtrlBtn
                icon={isMuted ? MicOffSvg : MicOnSvg}
                label={isMuted ? 'Unmute' : 'Mute'}
                active={isMuted}
                danger={isMuted}
                onClick={toggleMic}
              />
              <CtrlBtn
                icon={isCameraOff ? CamOffSvg : CamOnSvg}
                label={isCameraOff ? 'Start Video' : 'Stop Video'}
                active={isCameraOff}
                danger={isCameraOff}
                onClick={toggleCamera}
              />
              <CtrlBtn
                icon={ScreenSvg}
                label="Share Screen"
                active={isSharing}
                onClick={toggleScreenShare}
              />

              <div className="h-8 w-px bg-white/10" />

              <CtrlBtn
                icon={HandSvg}
                label="Raise Hand"
                active={isHandRaised}
                onClick={() => setIsHandRaised(!isHandRaised)}
              />
              <CtrlBtn
                icon={RecordSvg}
                label={isRecording ? 'Stop Recording' : 'Record'}
                active={isRecording}
                danger={isRecording}
                onClick={toggleRecording}
              />

              <div className="h-8 w-px bg-white/10" />

              <CtrlBtn
                icon={ChatSvg}
                label="Chat"
                active={activeSidebar === 'chat'}
                onClick={() => setActiveSidebar(activeSidebar === 'chat' ? null : 'chat')}
              />
              <CtrlBtn
                icon={PeopleSvg}
                label="Participants"
                active={activeSidebar === 'participants'}
                onClick={() => setActiveSidebar(activeSidebar === 'participants' ? null : 'participants')}
              />

              <div className="h-8 w-px bg-white/10" />

              <button
                onClick={handleLeave}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition shadow-lg shadow-red-500/20"
              >
                <PhoneSvg />
                <span>Leave</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        {activeSidebar && (
          <div className="w-80 flex-shrink-0 border-l border-slate-800 bg-slate-900/50 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/50">
                {activeSidebar === 'chat' ? 'Chat' : 'Participants'}
              </h3>
              <button onClick={() => setActiveSidebar(null)} className="p-1 hover:bg-white/5 rounded-lg transition">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            {activeSidebar === 'chat' ? (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <p className="text-xs">No messages yet</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className={`flex flex-col gap-0.5 ${msg.user_id === user?.id ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-white/40">{msg.user_name}</span>
                          <span className="text-[10px] text-white/20">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className={`px-3 py-2 rounded-xl text-sm max-w-[85%] ${
                          msg.user_id === user?.id
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white/5 text-white/80'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <form onSubmit={sendMessage} className="p-3 border-t border-slate-800">
                  <div className="flex gap-2">
                    <input
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50"
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-semibold transition"
                    >
                      Send
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {participants.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                      {p.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {p.name}
                        {p.id === user?.id && <span className="ml-1.5 text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/50">(You)</span>}
                      </p>
                      <p className="text-[10px] text-white/40 capitalize">{p.role}</p>
                    </div>
                    {p.role === 'teacher' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                        Host
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// SVG Icon components (inline to avoid extra dependencies)
const MicOnSvg = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);
const MicOffSvg = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="2" y1="2" x2="22" y2="22" /><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" /><path d="M5 10v2a7 7 0 0 0 12 5" /><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12" /><line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);
const CamOnSvg = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" /><rect x="2" y="6" width="14" height="12" rx="2" />
  </svg>
);
const CamOffSvg = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.66 5H14a2 2 0 0 1 2 2v2.5l5.248-3.062A.5.5 0 0 1 22 6.86v10.28a.5.5 0 0 1-.752.432L16 14.5" /><path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" /><line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);
const ScreenSvg = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3" /><path d="M8 21h8" /><path d="M12 17v4" /><path d="m17 8 5-5" /><path d="M17 3h5v5" />
  </svg>
);
const HandSvg = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2" /><path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2" /><path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
  </svg>
);
const RecordSvg = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" fill="currentColor" />
  </svg>
);
const ChatSvg = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const PeopleSvg = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const PhoneSvg = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m16 2-4 4-4-4" /><path d="m2 16 4-4-4-4" /><path d="m22 16-4-4 4-4" /><path d="m16 22-4-4-4 4" /><circle cx="12" cy="12" r="2" />
  </svg>
);

// Generic control button
const CtrlBtn: React.FC<{
  icon: React.FC;
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
}> = ({ icon: Icon, label, active, danger, onClick }) => (
  <button
    onClick={onClick}
    title={label}
    className={`p-3 rounded-xl transition-all ${
      danger
        ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
        : active
        ? 'bg-indigo-600 text-white border border-indigo-500'
        : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white'
    }`}
  >
    <Icon />
  </button>
);

export default LiveClassroom;
