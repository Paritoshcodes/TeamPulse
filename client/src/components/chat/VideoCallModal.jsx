import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Hand,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  PhoneOff,
  PictureInPicture2,
  Smile,
  Video,
  VideoOff,
} from 'lucide-react';
import { useSocketContext } from '../../context/SocketContext.jsx';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

function RemoteVideoCard({ stream, name }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream || null;
    }
  }, [stream]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--color-base-600)]/60 bg-[var(--color-base-800)]">
      <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
      <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/50 px-2 py-0.5 text-xs text-white">
        {name || 'Participant'}
      </div>
    </div>
  );
}

export default function VideoCallModal({
  isOpen,
  onClose,
  roomId,
  title,
  currentUser,
  view = 'embedded',
  onToggleView,
}) {
  const socketCtx = useSocketContext();
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peersRef = useRef(new Map());
  const candidateQueueRef = useRef(new Map());
  const hideReactionTimerRef = useRef(null);

  const [remotePeers, setRemotePeers] = useState([]);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [raisedHands, setRaisedHands] = useState({});
  const [reactionFeed, setReactionFeed] = useState([]);
  const [isPiPActive, setIsPiPActive] = useState(false);

  const remoteCount = remotePeers.length;
  const gridCols = useMemo(() => {
    if (remoteCount <= 1) return 'grid-cols-1';
    if (remoteCount <= 4) return 'grid-cols-2';
    return 'grid-cols-3';
  }, [remoteCount]);

  const participantsSummary = useMemo(() => {
    const participants = remotePeers.map((peer) => ({
      socketId: peer.socketId,
      name: peer.participant?.name || 'Participant',
      raised: Boolean(raisedHands[peer.socketId]),
    }));

    return [
      {
        socketId: 'local',
        name: currentUser?.name || currentUser?.username || 'You',
        raised: Boolean(raisedHands.local),
      },
      ...participants,
    ];
  }, [remotePeers, raisedHands, currentUser?.name, currentUser?.username]);

  const clearPeer = (socketId) => {
    const peer = peersRef.current.get(socketId);
    if (peer) {
      peer.pc.onicecandidate = null;
      peer.pc.ontrack = null;
      peer.pc.onconnectionstatechange = null;
      peer.pc.close();
      peersRef.current.delete(socketId);
    }

    setRemotePeers((prev) => prev.filter((item) => item.socketId !== socketId));
    setRaisedHands((prev) => {
      if (!prev[socketId]) return prev;
      const next = { ...prev };
      delete next[socketId];
      return next;
    });
  };

  const addRemoteStream = (socketId, stream, participant) => {
    setRemotePeers((prev) => {
      const next = prev.filter((item) => item.socketId !== socketId);
      next.push({ socketId, stream, participant });
      return next;
    });
  };

  const flushQueuedCandidates = async (socketId, pc) => {
    const queued = candidateQueueRef.current.get(socketId) || [];
    if (queued.length === 0) return;

    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
      }
    }
    candidateQueueRef.current.delete(socketId);
  };

  const createPeerConnection = (participant, initiator = false) => {
    const socketId = participant.socketId;
    if (!socketId) return null;

    const existing = peersRef.current.get(socketId);
    if (existing) return existing.pc;

    const pc = new RTCPeerConnection(RTC_CONFIG);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketCtx.sendCallSignal(roomId, socketId, {
          type: 'ice-candidate',
          candidate: event.candidate,
        }).catch(() => {
        });
      }
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        addRemoteStream(socketId, stream, participant);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'failed' || state === 'closed' || state === 'disconnected') {
        clearPeer(socketId);
      }
    };

    peersRef.current.set(socketId, { pc, participant });

    if (initiator) {
      (async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await socketCtx.sendCallSignal(roomId, socketId, {
            type: 'offer',
            sdp: offer,
          });
        } catch {
        }
      })();
    }

    return pc;
  };

  const handleSignal = async (payload) => {
    const fromSocketId = payload?.fromSocketId;
    const signal = payload?.signal;
    if (!fromSocketId || !signal) return;

    let peerEntry = peersRef.current.get(fromSocketId);
    let pc = peerEntry?.pc;

    if (!pc) {
      const participant = {
        socketId: fromSocketId,
        userId: payload?.fromUserId,
        name: payload?.fromUserName || 'Participant',
      };
      pc = createPeerConnection(participant, false);
      peerEntry = peersRef.current.get(fromSocketId);
    }

    if (!pc) return;

    try {
      if (signal.type === 'offer' && signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        await flushQueuedCandidates(fromSocketId, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await socketCtx.sendCallSignal(roomId, fromSocketId, {
          type: 'answer',
          sdp: answer,
        });
      }

      if (signal.type === 'answer' && signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        await flushQueuedCandidates(fromSocketId, pc);
      }

      if (signal.type === 'ice-candidate' && signal.candidate) {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } else {
          const queued = candidateQueueRef.current.get(fromSocketId) || [];
          queued.push(new RTCIceCandidate(signal.candidate));
          candidateQueueRef.current.set(fromSocketId, queued);
        }
      }
    } catch {
    }
  };

  const teardown = async () => {
    const leaveRoomId = roomId;

    for (const socketId of peersRef.current.keys()) {
      clearPeer(socketId);
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    setRemotePeers([]);
    setRaisedHands({});
    setReactionFeed([]);
    setJoining(false);
    setIsPiPActive(false);

    if (leaveRoomId) {
      try {
        await socketCtx.leaveCall(leaveRoomId);
      } catch {
      }
    }
  };

  useEffect(() => {
    if (!isOpen || !roomId) return undefined;

    let cancelled = false;
    setError('');
    setJoining(true);

    const setup = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const res = await socketCtx.joinCall(roomId, {
          name: currentUser?.name || currentUser?.username || 'You',
          avatar: currentUser?.avatar || null,
        });

        const participants = Array.isArray(res?.participants) ? res.participants : [];
        participants.forEach((participant) => {
          if (participant?.socketId) {
            createPeerConnection(participant, true);
          }
        });

        if (!cancelled) {
          setJoining(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Failed to start video call');
          setJoining(false);
        }
      }
    };

    const unsubSignal = socketCtx.onCallSignal((payload) => {
      if (payload?.roomId === roomId) {
        handleSignal(payload);
      }
    });

    const unsubJoined = socketCtx.onCallUserJoined(({ roomId: joinedRoomId, participant }) => {
      if (joinedRoomId !== roomId || !participant?.socketId) return;
      createPeerConnection(participant, true);
    });

    const unsubLeft = socketCtx.onCallUserLeft(({ roomId: leftRoomId, socketId }) => {
      if (leftRoomId !== roomId || !socketId) return;
      clearPeer(socketId);
    });

    const unsubRaisedHand = socketCtx.onCallRaisedHand((payload) => {
      if (payload?.roomId !== roomId) return;
      setRaisedHands((prev) => {
        const key = payload?.socketId;
        if (!key) return prev;
        const next = { ...prev };
        if (payload?.raised) {
          next[key] = true;
        } else {
          delete next[key];
        }
        return next;
      });
    });

    const unsubReaction = socketCtx.onCallReaction((payload) => {
      if (payload?.roomId !== roomId || !payload?.emoji) return;
      setReactionFeed((prev) => {
        const next = [...prev, {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          emoji: payload.emoji,
          name: payload?.name || 'Participant',
        }].slice(-6);
        return next;
      });

      if (hideReactionTimerRef.current) {
        clearTimeout(hideReactionTimerRef.current);
      }
      hideReactionTimerRef.current = setTimeout(() => {
        setReactionFeed((prev) => prev.slice(-3));
      }, 2200);
    });

    const unsubEnded = socketCtx.onCallEnded((payload) => {
      if (payload?.roomId !== roomId) return;
      teardown().finally(() => {
        onClose?.();
      });
    });

    setup();

    return () => {
      cancelled = true;
      if (typeof unsubSignal === 'function') unsubSignal();
      if (typeof unsubJoined === 'function') unsubJoined();
      if (typeof unsubLeft === 'function') unsubLeft();
      if (typeof unsubRaisedHand === 'function') unsubRaisedHand();
      if (typeof unsubReaction === 'function') unsubReaction();
      if (typeof unsubEnded === 'function') unsubEnded();
      if (hideReactionTimerRef.current) {
        clearTimeout(hideReactionTimerRef.current);
        hideReactionTimerRef.current = null;
      }
      teardown();
    };
  }, [isOpen, roomId]);

  useEffect(() => {
    const handlePiPEnter = () => setIsPiPActive(true);
    const handlePiPLeave = () => setIsPiPActive(false);

    document.addEventListener('enterpictureinpicture', handlePiPEnter);
    document.addEventListener('leavepictureinpicture', handlePiPLeave);
    return () => {
      document.removeEventListener('enterpictureinpicture', handlePiPEnter);
      document.removeEventListener('leavepictureinpicture', handlePiPLeave);
    };
  }, []);

  const toggleMic = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !micEnabled;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setMicEnabled(next);
  };

  const toggleCamera = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !cameraEnabled;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setCameraEnabled(next);
  };

  const handleEndCall = async () => {
    try {
      await socketCtx.endCall?.(roomId);
    } catch {
    }
    await teardown();
    onClose?.();
  };

  const toggleRaisedHand = async () => {
    const isRaised = Boolean(raisedHands.local);
    const next = !isRaised;
    setRaisedHands((prev) => {
      const copy = { ...prev };
      if (next) {
        copy.local = true;
      } else {
        delete copy.local;
      }
      return copy;
    });

    try {
      await socketCtx.setRaisedHand(roomId, next);
    } catch {
      setRaisedHands((prev) => {
        const copy = { ...prev };
        if (isRaised) {
          copy.local = true;
        } else {
          delete copy.local;
        }
        return copy;
      });
    }
  };

  const sendReaction = async (emoji) => {
    if (!emoji) return;
    try {
      await socketCtx.sendCallReaction(roomId, emoji);
    } catch {
    }
  };

  const togglePictureInPicture = async () => {
    const video = localVideoRef.current;
    if (!video || typeof document === 'undefined') return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
        return;
      }

      if (document.pictureInPictureEnabled && typeof video.requestPictureInPicture === 'function') {
        await video.requestPictureInPicture();
        setIsPiPActive(true);
      }
    } catch {
    }
  };

  if (!isOpen) return null;

  const isPipView = view === 'pip';

  const shellClass = isPipView
    ? 'absolute bottom-4 right-4 z-40 h-[260px] w-[min(420px,calc(100%-1rem))] rounded-xl border border-[var(--color-base-600)]/70 bg-[var(--color-base-900)] shadow-2xl'
    : 'absolute inset-0 z-30 rounded-none border-0 bg-[var(--color-base-900)]';

  const contentCols = isPipView ? 'grid-cols-1 md:grid-cols-1' : 'grid-cols-1 md:grid-cols-[1fr_280px]';

  return (
    <div className={shellClass}>
      <div className="flex h-full w-full flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--color-base-600)]/45 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-base-50)]">Video Call</h3>
            <p className="text-xs text-[var(--color-base-400)]">{title || 'Conversation'}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={togglePictureInPicture}
              className={`rounded-lg p-1.5 text-[var(--color-base-300)] transition-colors hover:bg-[var(--color-base-700)] hover:text-[var(--color-base-50)] ${isPiPActive ? 'bg-[var(--color-base-700)]' : ''}`}
              title="Toggle picture in picture"
            >
              <PictureInPicture2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onToggleView?.(isPipView ? 'embedded' : 'pip')}
              className="rounded-lg p-1.5 text-[var(--color-base-300)] transition-colors hover:bg-[var(--color-base-700)] hover:text-[var(--color-base-50)]"
              title={isPipView ? 'Expand call' : 'Keep call while working'}
            >
              {isPipView ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={handleEndCall}
              className="rounded-lg px-2 py-1 text-xs text-[var(--color-base-300)] transition-colors hover:bg-[var(--color-base-700)] hover:text-[var(--color-base-50)]"
            >
              Close
            </button>
          </div>
        </div>

        <div className={`grid min-h-0 flex-1 gap-3 p-3 ${contentCols}`}>
          <div className={`relative grid min-h-0 gap-3 ${gridCols}`}>
            {error && (
              <div className="col-span-full rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {joining && (
              <div className="col-span-full flex items-center justify-center rounded-xl border border-[var(--color-base-600)]/55 bg-[var(--color-base-800)] text-sm text-[var(--color-base-300)]">
                Joining call...
              </div>
            )}

            {!joining && remotePeers.length === 0 && (
              <div className="col-span-full flex items-center justify-center rounded-xl border border-[var(--color-base-600)]/55 bg-[var(--color-base-800)] text-sm text-[var(--color-base-300)]">
                Waiting for others to join...
              </div>
            )}

            {remotePeers.map((peer) => (
              <RemoteVideoCard
                key={peer.socketId}
                stream={peer.stream}
                name={peer.participant?.name}
              />
            ))}

            {reactionFeed.length > 0 && (
              <div className="pointer-events-none absolute right-4 top-16 z-40 flex flex-col gap-1">
                {reactionFeed.map((item) => (
                  <div key={item.id} className="rounded-full bg-black/55 px-2.5 py-1 text-xs text-white">
                    <span className="mr-1">{item.emoji}</span>
                    <span>{item.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isPipView && (
            <div className="flex min-h-0 flex-col gap-3 rounded-xl border border-[var(--color-base-600)]/55 bg-[var(--color-base-800)] p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-base-400)]">You</div>
            <div className="relative flex-1 overflow-hidden rounded-lg border border-[var(--color-base-600)]/55 bg-[var(--color-base-900)]">
              <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
              <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/50 px-2 py-0.5 text-xs text-white">
                {currentUser?.name || currentUser?.username || 'You'}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[var(--color-base-600)]/50 bg-[var(--color-base-900)]/65 p-2">
              {participantsSummary.map((participant) => (
                <div key={participant.socketId} className="inline-flex items-center gap-1 rounded-full bg-[var(--color-base-700)]/70 px-2 py-0.5 text-[10px] text-[var(--color-base-200)]">
                  <span>{participant.name}</span>
                  {participant.raised && <Hand className="h-3 w-3 text-amber-300" />}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-base-600)]/50 bg-[var(--color-base-900)]/65 p-2">
              {['👍', '👏', '🔥', '😂'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => sendReaction(emoji)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-base hover:bg-[var(--color-base-700)]"
                  title={`React ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={toggleMic}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                  micEnabled
                    ? 'bg-[var(--color-base-700)] text-[var(--color-base-100)] hover:bg-[var(--color-base-600)]'
                    : 'bg-red-500/25 text-red-200 hover:bg-red-500/35'
                }`}
              >
                {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={toggleCamera}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                  cameraEnabled
                    ? 'bg-[var(--color-base-700)] text-[var(--color-base-100)] hover:bg-[var(--color-base-600)]'
                    : 'bg-red-500/25 text-red-200 hover:bg-red-500/35'
                }`}
              >
                {cameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={toggleRaisedHand}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                  raisedHands.local
                    ? 'bg-amber-500/35 text-amber-100 hover:bg-amber-500/45'
                    : 'bg-[var(--color-base-700)] text-[var(--color-base-100)] hover:bg-[var(--color-base-600)]'
                }`}
                title="Raise hand"
              >
                <Hand className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => sendReaction('👏')}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-base-700)] text-[var(--color-base-100)] transition-colors hover:bg-[var(--color-base-600)]"
                title="Quick reaction"
              >
                <Smile className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleEndCall}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white transition-colors hover:bg-red-500"
              >
                <PhoneOff className="h-4 w-4" />
              </button>
            </div>
            </div>
          )}

          {isPipView && (
            <div className="absolute bottom-2 left-2 right-2 z-50 flex items-center justify-center gap-2 rounded-lg bg-black/55 px-2 py-1.5 backdrop-blur-sm">
              <button
                type="button"
                onClick={toggleMic}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                  micEnabled
                    ? 'bg-[var(--color-base-700)] text-[var(--color-base-100)] hover:bg-[var(--color-base-600)]'
                    : 'bg-red-500/25 text-red-200 hover:bg-red-500/35'
                }`}
              >
                {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={toggleCamera}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                  cameraEnabled
                    ? 'bg-[var(--color-base-700)] text-[var(--color-base-100)] hover:bg-[var(--color-base-600)]'
                    : 'bg-red-500/25 text-red-200 hover:bg-red-500/35'
                }`}
              >
                {cameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={toggleRaisedHand}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                  raisedHands.local
                    ? 'bg-amber-500/35 text-amber-100 hover:bg-amber-500/45'
                    : 'bg-[var(--color-base-700)] text-[var(--color-base-100)] hover:bg-[var(--color-base-600)]'
                }`}
              >
                <Hand className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => sendReaction('👏')}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-base-700)] text-[var(--color-base-100)] transition-colors hover:bg-[var(--color-base-600)]"
              >
                <Smile className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleEndCall}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white transition-colors hover:bg-red-500"
              >
                <PhoneOff className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
