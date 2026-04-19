import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api';
import {
  buildPublicationId,
  type ClassroomMediaProviderConfig,
  type ClassroomTrackKind,
  type LiveRoomParticipant,
  type LiveRoomTrackPublication,
  type ParticipantMediaState,
  type RealtimeMediaTrackRequest,
  type RealtimeMediaTrackResult,
} from '../../lib/liveClassroomProtocol';

type MediaStatus = 'idle' | 'starting' | 'ready' | 'error';

interface UseClassroomMediaResult {
  providerLabel: string;
  providerDescription: string;
  status: MediaStatus;
  error: string;
  previewStream: MediaStream | null;
  mediaSessionId: string;
  publications: LiveRoomTrackPublication[];
  remoteStreams: Array<{ participantId: string; stream: MediaStream }>;
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenShareEnabled: boolean;
  toggleAudio: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  stop: () => void;
}

const providerLabels = {
  cloudflare: 'Cloudflare SFU Adapter',
} as const;

const providerDescriptions = {
  cloudflare: 'Cloudflare Durable Objects handle presence and chat while Cloudflare Realtime SFU carries the browser media session.',
} as const;

interface UseClassroomMediaOptions {
  classroomSessionId: number;
  currentParticipantId: string | null;
  participants: LiveRoomParticipant[];
  config: ClassroomMediaProviderConfig | null;
}

const CLOUDLFARE_ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.cloudflare.com:3478' }];

const buildTrackName = (participantId: string, kind: ClassroomTrackKind) => `${kind}-${participantId}-${crypto.randomUUID()}`;

async function waitForIceGatheringComplete(peerConnection: RTCPeerConnection) {
  if (peerConnection.iceGatheringState === 'complete') {
    return;
  }

  await new Promise<void>((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      peerConnection.removeEventListener('icegatheringstatechange', handleStateChange);
      resolve();
    };

    const handleStateChange = () => {
      if (peerConnection.iceGatheringState === 'complete') {
        finish();
      }
    };

    peerConnection.addEventListener('icegatheringstatechange', handleStateChange);
    setTimeout(finish, 1500);
  });
}

export function useClassroomMedia({
  classroomSessionId,
  currentParticipantId,
  participants,
  config,
}: UseClassroomMediaOptions): UseClassroomMediaResult {
  const [status, setStatus] = useState<MediaStatus>('idle');
  const [error, setError] = useState('');
  const [mediaSessionId, setMediaSessionId] = useState('');
  const [publications, setPublications] = useState<LiveRoomTrackPublication[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Array<{ participantId: string; stream: MediaStream }>>([]);
  const [audioEnabled, setAudioEnabled] = useState(Boolean(config?.publishDefaults.audioEnabled));
  const [videoEnabled, setVideoEnabled] = useState(Boolean(config?.publishDefaults.videoEnabled));
  const [screenShareEnabled, setScreenShareEnabled] = useState(Boolean(config?.publishDefaults.screenShareEnabled));
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const startedRef = useRef(false);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const mediaSessionIdRef = useRef('');
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remoteStreamsRef = useRef(new Map<string, MediaStream>());
  const subscribedPublicationIdsRef = useRef(new Set<string>());
  const publicationMetadataByMidRef = useRef(new Map<string, { participantId: string; kind: ClassroomTrackKind }>());
  const negotiationQueueRef = useRef(Promise.resolve());
  const localTracksRef = useRef<{ audio?: MediaStreamTrack; video?: MediaStreamTrack; screen?: MediaStreamTrack }>({});
  const senderRefs = useRef<{ audio?: RTCRtpSender; video?: RTCRtpSender }>({});
  const publicationNamesRef = useRef<{ audio?: string; video?: string }>({});

  const stopTracks = useCallback((stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => track.stop());
  }, []);

  const syncRemoteStreams = useCallback(() => {
    setRemoteStreams(Array.from(remoteStreamsRef.current.entries()).map(([participantId, stream]) => ({ participantId, stream })));
  }, []);

  const ensurePeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const peerConnection = new RTCPeerConnection({ iceServers: CLOUDLFARE_ICE_SERVERS });
    peerConnection.ontrack = (event) => {
      const mid = event.transceiver.mid || '';
      const metadata = publicationMetadataByMidRef.current.get(mid);
      if (!metadata) {
        return;
      }

      const existingStream = remoteStreamsRef.current.get(metadata.participantId) || new MediaStream();
      const duplicateTrack = existingStream.getTracks().find((track) => track.id === event.track.id);
      if (!duplicateTrack) {
        const sameKindTrack = existingStream.getTracks().find((track) => track.kind === metadata.kind && track.id !== event.track.id);
        if (sameKindTrack) {
          existingStream.removeTrack(sameKindTrack);
        }

        existingStream.addTrack(event.track);
      }

      remoteStreamsRef.current.set(metadata.participantId, existingStream);
      syncRemoteStreams();

      event.track.addEventListener('ended', () => {
        const participantStream = remoteStreamsRef.current.get(metadata.participantId);
        if (!participantStream) {
          return;
        }

        participantStream.removeTrack(event.track);
        if (!participantStream.getTracks().length) {
          remoteStreamsRef.current.delete(metadata.participantId);
        }
        syncRemoteStreams();
      });
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
        setStatus('error');
        setError('Cloudflare Realtime peer connection lost media connectivity.');
      }
    };

    peerConnectionRef.current = peerConnection;
    return peerConnection;
  }, [syncRemoteStreams]);

  const enqueueNegotiation = useCallback((task: () => Promise<void>) => {
    negotiationQueueRef.current = negotiationQueueRef.current
      .catch(() => undefined)
      .then(task);

    return negotiationQueueRef.current;
  }, []);

  const stop = useCallback(() => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    remoteStreamsRef.current.clear();
    publicationMetadataByMidRef.current.clear();
    subscribedPublicationIdsRef.current.clear();
    mediaSessionIdRef.current = '';
    localTracksRef.current = {};
    senderRefs.current = {};
    publicationNamesRef.current = {};
    stopTracks(cameraStreamRef.current);
    stopTracks(screenStreamRef.current);
    setCameraStream(null);
    setScreenStream(null);
    setMediaSessionId('');
    setPublications([]);
    setRemoteStreams([]);
    setStatus('idle');
    setError('');
    startedRef.current = false;
  }, [stopTracks]);

  const publishLocalTracks = useCallback(async (peerConnection: RTCPeerConnection, activeMediaSessionId: string) => {
    const localDescription = peerConnection.localDescription;
    if (!localDescription) {
      throw new Error('Missing local session description for Cloudflare Realtime publish.');
    }

    const trackRequests = peerConnection.getTransceivers().flatMap<RealtimeMediaTrackRequest>((transceiver) => {
      const track = transceiver.sender.track;
      if (!track || !transceiver.mid) {
        return [];
      }

      const kind = track.kind as ClassroomTrackKind;
      const trackName = publicationNamesRef.current[kind] || buildTrackName(currentParticipantId || 'participant', kind);
      publicationNamesRef.current[kind] = trackName;

      return [{
        location: 'local',
        mid: transceiver.mid,
        trackName,
        kind,
      }];
    });

    if (!trackRequests.length) {
      return;
    }

    const publishResponse = await api.realtimeAddMediaTracks(
      classroomSessionId,
      activeMediaSessionId,
      trackRequests,
      { sdp: localDescription.sdp, type: localDescription.type as 'offer' | 'answer' },
    );

    if (publishResponse.sessionDescription?.type === 'answer') {
      await peerConnection.setRemoteDescription(publishResponse.sessionDescription);
    }

    if (publishResponse.sessionDescription?.type === 'offer') {
      await peerConnection.setRemoteDescription(publishResponse.sessionDescription);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      await waitForIceGatheringComplete(peerConnection);
      if (peerConnection.localDescription) {
        await api.realtimeRenegotiateMediaSession(classroomSessionId, activeMediaSessionId, {
          sdp: peerConnection.localDescription.sdp,
          type: peerConnection.localDescription.type as 'offer' | 'answer',
        });
      }
    }

    const publishedTracksByName = new Map(trackRequests.map((track) => [track.trackName, track]));
    const nextPublications = publishResponse.tracks
      .filter((track) => !track.errorCode)
      .map((track) => {
        const originalTrack = publishedTracksByName.get(track.trackName);
        const kind = track.kind || originalTrack?.kind || 'video';
        return {
          publicationId: buildPublicationId(activeMediaSessionId, track.trackName),
          mediaSessionId: activeMediaSessionId,
          trackName: track.trackName,
          kind,
          mid: track.mid,
          createdAt: new Date().toISOString(),
        } satisfies LiveRoomTrackPublication;
      });

    setPublications(nextPublications);
  }, [classroomSessionId, currentParticipantId]);

  const toggleAudio = useCallback(async () => {
    try {
      setError('');
      const nextValue = !audioEnabled;
      const track = localTracksRef.current.audio;
      if (!track) {
        throw new Error('Microphone track is not available.');
      }

      track.enabled = nextValue;
      setAudioEnabled(nextValue);
    } catch (mediaError) {
      setStatus('error');
      setError(mediaError instanceof Error ? mediaError.message : 'Failed to update microphone state.');
    }
  }, [audioEnabled]);

  const toggleVideo = useCallback(async () => {
    try {
      setError('');
      const nextValue = !videoEnabled;
      const track = localTracksRef.current.video;
      if (!track) {
        throw new Error('Camera track is not available.');
      }

      track.enabled = nextValue;
      setVideoEnabled(nextValue);
    } catch (mediaError) {
      setStatus('error');
      setError(mediaError instanceof Error ? mediaError.message : 'Failed to update camera state.');
    }
  }, [videoEnabled]);

  const toggleScreenShare = useCallback(async () => {
    if (!config) {
      return;
    }

    if (screenShareEnabled) {
      try {
        await senderRefs.current.video?.replaceTrack(localTracksRef.current.video || null);
      } finally {
        stopTracks(screenStreamRef.current);
        screenStreamRef.current = null;
        setScreenStream(null);
        setScreenShareEnabled(false);
      }
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setStatus('error');
      setError('Screen sharing is not available in this browser.');
      return;
    }

    if (!senderRefs.current.video) {
      setStatus('error');
      setError('Screen sharing is not available because no video sender is active.');
      return;
    }

    try {
      setError('');
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      const displayTrack = displayStream.getVideoTracks()[0];
      if (!displayTrack) {
        throw new Error('No screen video track was provided by the browser.');
      }

      localTracksRef.current.screen = displayTrack;
      await senderRefs.current.video.replaceTrack(displayTrack);
      displayTrack.addEventListener('ended', () => {
        void senderRefs.current.video?.replaceTrack(localTracksRef.current.video || null);
        stopTracks(displayStream);
        screenStreamRef.current = null;
        setScreenStream(null);
        setScreenShareEnabled(false);
      });

      setScreenStream(displayStream);
      setScreenShareEnabled(true);
    } catch (mediaError) {
      setStatus('error');
      setError(mediaError instanceof Error ? mediaError.message : 'Failed to start screen sharing.');
    }
  }, [config, screenShareEnabled, stopTracks]);

  useEffect(() => {
    if (!config || !currentParticipantId || startedRef.current) {
      return;
    }

    if (config.status !== 'configured') {
      setStatus('error');
      setError('Cloudflare Realtime SFU is not configured on the server. Add CLOUDFLARE_REALTIME_APP_ID and CLOUDFLARE_REALTIME_APP_SECRET before joining live classes.');
      return;
    }

    let cancelled = false;

    const startCapture = async () => {
      setStatus('starting');
      setError('');

      try {
        const peerConnection = ensurePeerConnection();
        const localStream = await navigator.mediaDevices.getUserMedia({
          audio: config.capabilities.audio,
          video: config.capabilities.video,
        });

        const audioTrack = localStream.getAudioTracks()[0];
        const videoTrack = localStream.getVideoTracks()[0];

        if (audioTrack) {
          audioTrack.enabled = config.publishDefaults.audioEnabled;
          localTracksRef.current.audio = audioTrack;
          senderRefs.current.audio = peerConnection.addTrack(audioTrack, localStream);
        }

        if (videoTrack) {
          videoTrack.enabled = config.publishDefaults.videoEnabled;
          localTracksRef.current.video = videoTrack;
          senderRefs.current.video = peerConnection.addTrack(videoTrack, localStream);
        }

        setCameraStream(localStream);

        const sessionResponse = await api.realtimeCreateMediaSession(classroomSessionId);
        mediaSessionIdRef.current = sessionResponse.mediaSessionId;
        setMediaSessionId(sessionResponse.mediaSessionId);

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        await waitForIceGatheringComplete(peerConnection);
        await publishLocalTracks(peerConnection, sessionResponse.mediaSessionId);

        if (!cancelled) {
          setAudioEnabled(config.publishDefaults.audioEnabled);
          setVideoEnabled(config.publishDefaults.videoEnabled);
          setScreenShareEnabled(config.publishDefaults.screenShareEnabled);
          setStatus('ready');
          startedRef.current = true;
        }
      } catch (mediaError) {
        if (!cancelled) {
          setStatus('error');
          setError(mediaError instanceof Error ? mediaError.message : 'Unable to initialize local media.');
        }
      }
    };

    void startCapture();

    return () => {
      cancelled = true;
    };
  }, [classroomSessionId, config, currentParticipantId, ensurePeerConnection, publishLocalTracks]);

  useEffect(() => {
    const missingPublications = participants
      .filter((participant) => participant.participantId !== currentParticipantId)
      .flatMap((participant) => participant.publications.map((publication) => ({ participantId: participant.participantId, publication })))
      .filter(({ publication }) => publication.mediaSessionId && !subscribedPublicationIdsRef.current.has(publication.publicationId));

    if (!missingPublications.length || !mediaSessionIdRef.current || !peerConnectionRef.current || status === 'error') {
      return;
    }

    void enqueueNegotiation(async () => {
      const peerConnection = ensurePeerConnection();
      const trackRequests: RealtimeMediaTrackRequest[] = missingPublications.map(({ publication }) => ({
        location: 'remote',
        mediaSessionId: publication.mediaSessionId,
        trackName: publication.trackName,
        kind: publication.kind,
      }));

      const trackOwners = new Map(missingPublications.map(({ participantId, publication }) => [publication.publicationId, { participantId, kind: publication.kind }]));
      const response = await api.realtimeAddMediaTracks(classroomSessionId, mediaSessionIdRef.current, trackRequests);

      response.tracks.forEach((track: RealtimeMediaTrackResult) => {
        if (!track.mid || !track.mediaSessionId) {
          return;
        }

        const publicationId = buildPublicationId(track.mediaSessionId, track.trackName);
        const owner = trackOwners.get(publicationId);
        if (!owner) {
          return;
        }

        publicationMetadataByMidRef.current.set(track.mid, owner);
      });

      if (response.sessionDescription?.type === 'offer') {
        await peerConnection.setRemoteDescription(response.sessionDescription);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        await waitForIceGatheringComplete(peerConnection);
        if (peerConnection.localDescription) {
          await api.realtimeRenegotiateMediaSession(classroomSessionId, mediaSessionIdRef.current, {
            sdp: peerConnection.localDescription.sdp,
            type: peerConnection.localDescription.type as 'offer' | 'answer',
          });
        }
      }

      missingPublications.forEach(({ publication }) => {
        subscribedPublicationIdsRef.current.add(publication.publicationId);
      });
    }).catch((subscriptionError) => {
      setStatus('error');
      setError(subscriptionError instanceof Error ? subscriptionError.message : 'Failed to subscribe to remote classroom media.');
    });
  }, [classroomSessionId, currentParticipantId, enqueueNegotiation, ensurePeerConnection, participants, status]);

  useEffect(() => {
    const validParticipantIds = new Set(participants.map((participant) => participant.participantId));
    let changed = false;

    for (const participantId of remoteStreamsRef.current.keys()) {
      if (validParticipantIds.has(participantId)) {
        continue;
      }

      remoteStreamsRef.current.delete(participantId);
      changed = true;
    }

    if (changed) {
      syncRemoteStreams();
    }
  }, [participants, syncRemoteStreams]);

  useEffect(() => {
    cameraStreamRef.current = cameraStream;
  }, [cameraStream]);

  useEffect(() => {
    screenStreamRef.current = screenStream;
  }, [screenStream]);

  const previewStream = useMemo(() => screenStream || cameraStream, [cameraStream, screenStream]);
  const providerLabel = config ? providerLabels[config.vendor] : 'Media Adapter';
  const providerDescription = !config
    ? 'Waiting for media configuration.'
    : config.status === 'configured'
      ? mediaSessionId
        ? `${providerDescriptions[config.vendor]} Session ${mediaSessionId.slice(0, 8)} is connected.`
        : providerDescriptions[config.vendor]
      : 'Cloudflare Realtime app credentials are missing from the server runtime.';

  return {
    providerLabel,
    providerDescription,
    status,
    error,
    previewStream,
    mediaSessionId,
    publications,
    remoteStreams,
    audioEnabled,
    videoEnabled,
    screenShareEnabled,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    stop,
  };
}