
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Course, LiveClassLink, Enrollment } from '../types';
import Card from './Card';
import Button from './Button';
// Fix: Added ClockIcon to the imported icons
import { ClassroomIcon, MeetIcon, ZoomIcon, MicOnIcon, MicOffIcon, CameraOnIcon, CameraOffIcon, ScreenShareIcon, HangUpIcon, UsersIcon, ClockIcon } from './icons/Icons';

type SessionInfo = LiveClassLink & { courseTitle: string; courseId: string; };

interface LiveClassroomProps {
  currentUser: User;
  courses: Course[];
  users: User[];
  enrollments: Enrollment[];
  onBack: () => void;
  canGoBack: boolean;
}

const ControlButton: React.FC<{ onClick: () => void; children: React.ReactNode; className?: string; variant?: 'secondary' | 'danger' | 'primary' | 'info'; isActive?: boolean; }> = ({ onClick, children, className, variant = 'secondary', isActive = false }) => {
    const variantStyles = {
        secondary: isActive ? 'bg-indigo-600 text-white' : 'bg-slate-700/80 text-white hover:bg-slate-600',
        danger: 'bg-red-600 text-white hover:bg-red-700',
        primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
        info: 'bg-blue-600 text-white hover:bg-blue-700',
    };
    
    return (
        <button 
            onClick={onClick} 
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-110 active:scale-90 ${variantStyles[variant]} ${className}`}
        >
            {children}
        </button>
    );
};

const LiveClassroom: React.FC<LiveClassroomProps> = ({ currentUser, courses, users, enrollments, onBack, canGoBack }) => {
  const [activeSession, setActiveSession] = useState<SessionInfo | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [showParticipants, setShowParticipants] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);

  const relevantCourses = currentUser.role === 'teacher'
    ? courses.filter(c => c.instructorId === currentUser.id)
    : courses.filter(c => currentUser.enrolledCourses?.includes(c.id));
    
  const upcomingClasses = useMemo(() => relevantCourses.flatMap(c => 
    c.liveClassLinks.map(link => ({...link, courseTitle: c.title, courseId: c.id }))
  ), [relevantCourses]);

  const participants = useMemo(() => {
    if (!activeSession) return [];
    const course = courses.find(c => c.id === activeSession.courseId);
    if (!course) return [];

    const instructor = users.find(u => u.id === course.instructorId);
    const studentIds = new Set(enrollments
      .filter(e => e.courseId === activeSession.courseId)
      .map(e => e.studentId));
    const students = users.filter(u => studentIds.has(u.id));
    
    const allParticipants = [instructor, ...students].filter((p): p is User => !!p);
    if (!allParticipants.some(p => p.id === currentUser.id)) {
        allParticipants.push(currentUser);
    }
    return [...new Map(allParticipants.map(item => [item['id'], item])).values()];
  }, [activeSession, courses, users, enrollments, currentUser]);


  const handleJoinClass = async (session: SessionInfo) => {
    window.open(session.url, '_blank', 'noopener,noreferrer');
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        setIsCameraOn(true);
        setActiveSession(session);
    } catch (err) {
        console.error("Error accessing media devices.", err);
        alert("Could not access camera and microphone. Please check your browser permissions.");
    }
  };
  
  const handleLeaveClass = () => {
      localStream?.getTracks().forEach(track => track.stop());
      screenStream?.getTracks().forEach(track => track.stop());
      setLocalStream(null);
      setScreenStream(null);
      setActiveSession(null);
      setIsSharingScreen(false);
      setIsCameraOn(false);
  }

  const toggleMic = () => {
      if (localStream) {
          localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
          setIsMicMuted(!isMicMuted);
      }
  }
  
  const toggleCamera = () => {
      if (localStream) {
          localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
          setIsCameraOn(!isCameraOn);
      }
  }

  const toggleScreenShare = async () => {
    if (isSharingScreen) {
        screenStream?.getTracks().forEach(track => track.stop());
        setScreenStream(null);
        setIsSharingScreen(false);
    } else {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            stream.getVideoTracks()[0].onended = () => {
                setIsSharingScreen(false);
                setScreenStream(null);
            };
            setScreenStream(stream);
            setIsSharingScreen(true);
        } catch (err) {
            console.error("Error sharing screen.", err);
        }
    }
  };

  useEffect(() => {
    const currentVideoRef = videoRef.current;
    if (currentVideoRef) {
      if (isSharingScreen && screenStream) {
        currentVideoRef.srcObject = screenStream;
      } else {
        currentVideoRef.srcObject = localStream;
      }
    }
  }, [isSharingScreen, screenStream, localStream, activeSession]);
  
  const getPlatformIcon = (platform: 'Zoom' | 'Google Meet' | 'Google Classroom') => {
    switch (platform) {
      case 'Zoom': return <ZoomIcon />;
      case 'Google Meet': return <MeetIcon />;
      case 'Google Classroom': return <ClassroomIcon />;
    }
  };

  if (activeSession) {
      return (
        <div className="flex h-[80vh] bg-slate-900 text-white rounded-2xl shadow-xl overflow-hidden border border-slate-700">
            {/* Main Video Panel */}
            <div className="flex-grow flex flex-col relative bg-black">
                <div className="flex-grow flex items-center justify-center">
                    <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-contain"></video>
                    {!isCameraOn && !isSharingScreen && (
                        <div className="absolute flex flex-col items-center">
                            <div className="w-24 h-24 bg-slate-700 rounded-full flex items-center justify-center font-bold text-3xl text-slate-400 mb-4 border-2 border-slate-600 shadow-xl">
                                {currentUser.name.charAt(0)}
                            </div>
                            <p className="font-semibold text-slate-400">Your camera is currently off</p>
                        </div>
                    )}
                </div>
                {/* Control Bar */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex justify-center items-center space-x-6">
                       <ControlButton 
                            onClick={toggleMic} 
                            variant={isMicMuted ? 'danger' : 'secondary'}
                        >
                            {isMicMuted ? <MicOffIcon /> : <MicOnIcon />}
                        </ControlButton>
                       <ControlButton 
                            onClick={toggleCamera} 
                            variant={!isCameraOn ? 'danger' : 'secondary'}
                        >
                            {!isCameraOn ? <CameraOffIcon /> : <CameraOnIcon />}
                        </ControlButton>
                       <ControlButton 
                            onClick={toggleScreenShare} 
                            variant={isSharingScreen ? 'info' : 'secondary'}
                        >
                            <ScreenShareIcon />
                        </ControlButton>
                       <ControlButton 
                            onClick={() => setShowParticipants(!showParticipants)} 
                            isActive={showParticipants}
                        >
                            <UsersIcon/>
                        </ControlButton>
                       <ControlButton 
                            onClick={handleLeaveClass} 
                            variant="danger"
                            className="w-14 h-14"
                        >
                            <HangUpIcon/>
                        </ControlButton>
                    </div>
                </div>
                {/* Overlay Session Info */}
                <div className="absolute top-4 left-4 p-3 bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
                    <p className="text-sm font-bold text-sky-400 uppercase tracking-widest mb-1">Live Now</p>
                    <h4 className="font-bold text-lg">{activeSession.courseTitle}</h4>
                </div>
            </div>
            {/* Participants Sidebar */}
            <div className={`w-80 bg-slate-900 border-l border-slate-700 flex-shrink-0 transition-all duration-300 overflow-y-auto ${showParticipants ? 'block' : 'hidden'}`}>
                <div className="p-4 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
                    <h3 className="text-lg font-bold flex items-center">
                        <UsersIcon className="mr-2 h-5 w-5 text-indigo-400" />
                        Participants
                        <span className="ml-auto bg-indigo-500/20 text-indigo-400 text-xs px-2 py-1 rounded-full">{participants.length}</span>
                    </h3>
                </div>
                <ul className="p-4 space-y-3">
                    {participants.map(p => (
                        <li key={p.id} className="p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl flex items-center space-x-3 transition-colors border border-transparent hover:border-slate-700">
                             <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center font-bold text-white shadow-lg">
                                {p.name.charAt(0)}
                             </div>
                             <div className="flex-grow min-w-0">
                                <p className="font-semibold truncate text-sm">
                                    {p.name}
                                    {p.id === currentUser.id && <span className="ml-2 text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded uppercase font-bold">You</span>}
                                </p>
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter leading-none mt-1">{p.role}</p>
                             </div>
                             <MicOffIcon className="h-4 w-4 text-slate-600" />
                        </li>
                    ))}
                </ul>
            </div>
        </div>
      );
  }

  return (
    <div className="text-slate-800">
        <div className="flex justify-between items-center mb-12">
            <div>
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">Live Classroom</h1>
                <p className="text-lg text-slate-600 mt-2">Join your scheduled live sessions and interact with your peers.</p>
            </div>
            {canGoBack && <Button variant="secondary" onClick={onBack}>&larr; Back</Button>}
        </div>

        <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
                <ClockIcon className="mr-2 text-indigo-600" />
                Upcoming Sessions
            </h2>
            <div className="grid gap-6">
                 {upcomingClasses.length > 0 ? upcomingClasses.map((session, index) => (
                    <Card key={index} className="p-6 flex flex-col sm:flex-row items-center justify-between hover:border-indigo-200">
                        <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                            <div className="p-3 bg-slate-100 rounded-xl">
                                {getPlatformIcon(session.platform)}
                            </div>
                            <div>
                                <p className="font-bold text-lg text-slate-900">{session.courseTitle}</p>
                                <div className="flex items-center text-sm text-slate-500 mt-1">
                                    <ClockIcon className="h-4 w-4 mr-1" />
                                    {session.time}
                                    <span className="mx-2 text-slate-300">|</span>
                                    <span className="font-medium text-indigo-600">{session.platform}</span>
                                </div>
                            </div>
                        </div>
                        <Button 
                            size="medium" 
                            variant="primary"
                            onClick={() => handleJoinClass(session)}
                            disabled={!session.url || session.url === '#'}
                            className="w-full sm:w-auto"
                        >
                            Enter Session
                        </Button>
                    </Card>
                 )) : (
                    <Card className="p-12 text-center border-dashed border-2 bg-transparent">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ClockIcon className="text-slate-400 h-8 w-8" />
                        </div>
                        <p className="text-slate-500 font-medium italic">You have no upcoming live sessions scheduled.</p>
                        <Button variant="secondary" className="mt-6" onClick={onBack}>Explore Courses</Button>
                    </Card>
                 )}
            </div>
        </div>
    </div>
  );
};

export default LiveClassroom;
