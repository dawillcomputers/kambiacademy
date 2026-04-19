export type LiveRoomRole = 'student' | 'teacher' | 'admin' | 'super_admin';

export interface ParticipantMediaState {
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenShareEnabled: boolean;
}

export type ClassroomTrackKind = 'audio' | 'video';

export interface LiveRoomTrackPublication {
  publicationId: string;
  mediaSessionId: string;
  trackName: string;
  kind: ClassroomTrackKind;
  mid?: string;
  createdAt: string;
}

export interface LiveRoomParticipant {
  participantId: string;
  userId: number;
  name: string;
  role: LiveRoomRole;
  joinedAt: string;
  handRaised: boolean;
  connectionState: 'connecting' | 'connected' | 'disconnected';
  media: ParticipantMediaState;
  mediaSessionId?: string;
  publications: LiveRoomTrackPublication[];
}

export interface RealtimeChatMessage {
  id: string;
  sessionId: number;
  userId: number;
  userName: string;
  text: string;
  createdAt: string;
}

export interface RoomNotice {
  id: string;
  level: 'info' | 'warning';
  message: string;
  createdAt: string;
}

export interface LiveRoomSnapshot {
  roomId: string;
  sessionId: number;
  participants: LiveRoomParticipant[];
  notices: RoomNotice[];
  updatedAt: string;
}

export interface ClassroomMediaProviderConfig {
  kind: 'managed-sfu';
  vendor: 'cloudflare';
  roomName: string;
  signalingMode: 'custom-webrtc';
  status: 'scaffolded' | 'configured';
  capabilities: {
    audio: boolean;
    video: boolean;
    screenShare: boolean;
  };
  publishDefaults: ParticipantMediaState;
}

export interface LiveSessionSummary {
  id: number;
  classId: number;
  tutorId: number;
  title: string;
  classTitle: string;
  startedAt: string;
  isTeacher: boolean;
}

export interface RealtimeJoinParticipant {
  participantId: string;
  userId: number;
  name: string;
  role: LiveRoomRole;
  media: ParticipantMediaState;
  mediaSessionId?: string;
  publications: LiveRoomTrackPublication[];
}

export interface RealtimeJoinResponse {
  roomId: string;
  session: LiveSessionSummary;
  participant: RealtimeJoinParticipant;
  media: ClassroomMediaProviderConfig;
  socketUrl: string;
  chatHistory: RealtimeChatMessage[];
}

export interface RealtimeSessionDescription {
  sdp: string;
  type: 'offer' | 'answer';
}

export interface RealtimeMediaTrackRequest {
  location: 'local' | 'remote';
  mid?: string;
  mediaSessionId?: string;
  trackName: string;
  kind?: ClassroomTrackKind;
}

export interface RealtimeMediaTrackResult extends RealtimeMediaTrackRequest {
  errorCode?: string;
  errorDescription?: string;
}

export interface RealtimeMediaSessionResponse {
  mediaSessionId: string;
  sessionDescription?: RealtimeSessionDescription | null;
}

export interface RealtimeMediaTracksResponse {
  requiresImmediateRenegotiation: boolean;
  sessionDescription?: RealtimeSessionDescription | null;
  tracks: RealtimeMediaTrackResult[];
}

export type RoomClientEvent =
  | { type: 'presence.sync'; room: LiveRoomSnapshot }
  | { type: 'participant.joined'; participant: LiveRoomParticipant }
  | { type: 'participant.updated'; participant: LiveRoomParticipant }
  | { type: 'participant.left'; participantId: string }
  | { type: 'chat.message'; message: RealtimeChatMessage }
  | { type: 'room.notice'; notice: RoomNotice }
  | { type: 'room.pong'; at: string };

export type RoomServerEvent =
  | { type: 'chat.send'; text: string }
  | { type: 'hand.raise'; raised: boolean }
  | {
      type: 'media.update';
      media: ParticipantMediaState;
      mediaSessionId?: string;
      publications?: LiveRoomTrackPublication[];
    }
  | { type: 'room.ping' };

export const buildLiveRoomId = (sessionId: number) => `live-session-${sessionId}`;

export const buildPublicationId = (mediaSessionId: string, trackName: string) => `${mediaSessionId}:${trackName}`;