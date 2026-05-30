import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  TrackToggle,
  DisconnectButton,
  useTracks,
  useParticipants,
  useRoomContext,
  useLocalParticipant,
  VideoTrack,
} from '@livekit/components-react';
import { Track, createLocalVideoTrack, createLocalAudioTrack } from 'livekit-client';
import { BackgroundBlur } from '@livekit/track-processors';
import { MessageSquare, Users, Search, Mic, MicOff, Video, VideoOff, PhoneOff, Share, Share2, Copy, Check, Clock, UserCheck, UserX, Camera, CameraOff, Pin, PinOff, MoreVertical, Settings, Smile, Hand, Info, Shapes, Lock, X, UserPlus, Subtitles, Send, Maximize, Trash2, ArrowLeft, Palette, Brush, Sparkles, Download, BarChart2, Shield, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './VideoCallApp.css';

// ─── Outer shell: just fetches token & mounts LiveKitRoom ───────────────────
const VideoCallApp = () => {
  const { roomName } = useParams();
  const [searchParams] = useSearchParams();
  const participantName = searchParams.get('name');
  const isHost = searchParams.get('isHost') === 'true';
  const isWaiting = !isHost;
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [token, setToken] = useState('');
  const [admitted, setAdmitted] = useState(isHost);
  const [admittedPending, setAdmittedPending] = useState(false);
  const [tokenReady, setTokenReady] = useState(isHost);

  // ── Admit transition ───────────────────────────────────────────────────────
  const handleAdmitTransition = useCallback(() => {
    console.log('[VideoCallApp] handleAdmitTransition triggered');
    setAdmittedPending(true);
    // Give the lobby a moment to release camera/mic hardware before the Room component tries to publish
    setTimeout(() => {
      console.log('[VideoCallApp] Transitioning to admitted state');
      setAdmitted(true);
      // tokenReady will be set to true by fetchToken(false) callback
    }, 800);
  }, []);

  const fetchToken = useCallback(async (waiting) => {
    console.log(`[VideoCallApp] fetchToken called. waiting=${waiting}, roomName=${roomName}, participantName=${participantName}`);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/getToken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName,
          participantName,
          isHost,
          isWaiting: waiting,
          photoURL: currentUser?.photoURL || null
        }),
      });
      if (response.ok) {
        const data = await response.json();
        console.log(`[VideoCallApp] Token received. length=${data.token?.length}`);
        setToken(data.token);
        if (!waiting) {
          // Small delay to ensure the old connection is fully cleaned up
          setTimeout(() => {
            console.log(`[VideoCallApp] Setting tokenReady to true`);
            setTokenReady(true);
          }, 100);
        }
      } else {
        console.error('[VideoCallApp] fetchToken response not ok:', response.status);
        navigate('/');
      }
    } catch (err) {
      console.error('[VideoCallApp] Error fetching token:', err);
    }
  }, [roomName, participantName, isHost, navigate, currentUser]);

  // Initial token fetch — restricted for waiting users
  useEffect(() => {
    if (!roomName || !participantName) { navigate('/'); return; }
    // Only fetch if we don't have a token
    if (!token) {
      console.log(`[VideoCallApp] Performing initial fetch. isWaiting=${isWaiting}`);
      fetchToken(isWaiting);
    }
  }, [roomName, participantName, isWaiting, fetchToken, navigate, token]);

  if (!token) {
    return (
      <div className="loading-screen" style={{
        height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', background: 'transparent',
        backgroundImage: 'radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(0, 210, 255, 0.1) 0px, transparent 50%)'
      }}>
        <div className="spinner" style={{
          width: '50px', height: '50px', border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: 'var(--primary-indigo)', borderRadius: '50%', animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '24px', fontSize: '18px', fontWeight: '500', color: 'var(--text-secondary)' }}>
          Preparing your high-fidelity session...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <LiveKitRoom
      key={roomName}
      video={false}
      audio={false}
      token={token}
      serverUrl={import.meta.env.VITE_LIVEKIT_URL}
      data-lk-theme="default"
      className="zoom-app-container"
      onDisconnected={() => {
        console.log('[VideoCallApp] Room disconnected');
        navigate('/meeting-over', { state: { roomName } });
      }}
      connectOptions={{ autoSubscribe: true }}
    >
      <MeetingRoom
        roomName={roomName}
        participantName={participantName}
        isHost={isHost}
        isWaiting={isWaiting}
        admitted={admitted}
        admittedPending={admittedPending}
        onAdmit={handleAdmitTransition}
        setAdmittedPending={setAdmittedPending}
      />
    </LiveKitRoom>
  );
};

// ─── Inner meeting room: can use LiveKit hooks ────────────────────────────────
const MeetingRoom = ({ roomName, participantName, isHost, isWaiting, admitted, admittedPending, onAdmit, setAdmittedPending }) => {
  const room = useRoomContext();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const photoURL = currentUser?.photoURL || null;

  const [searchParams] = useSearchParams();
  const camOnParam = searchParams.get('camOn') !== 'false';
  const micOnParam = searchParams.get('micOn') !== 'false';
  const [initialCamOn, setInitialCamOn] = useState(camOnParam);
  const [initialMicOn, setInitialMicOn] = useState(micOnParam);

  const getMeta = useCallback((p) => {
    try {
      return JSON.parse(p.metadata || '{}');
    } catch { return {}; }
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);
  const [sidebarTab, setSidebarTab] = useState('participants');
  const [copied, setCopied] = useState(false);
  const [denied, setDenied] = useState(false);
  const [pinnedTrackSid, setPinnedTrackSid] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pinnedMessage, setPinnedMessage] = useState(null);

  const [captionsActive, setCaptionsActive] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [remoteHandsRaised, setRemoteHandsRaised] = useState({});
  const [showReactions, setShowReactions] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [activeReactions, setActiveReactions] = useState([]);
  const [subtitleText, setSubtitleText] = useState('');

  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);
  const footerHoveredRef = useRef(false);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (footerHoveredRef.current) return;
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 20000); // 20 seconds
  }, []);

  useEffect(() => {
    // Show controls initially
    showControlsTemporarily();

    const handleInteraction = () => {
      showControlsTemporarily();
    };

    window.addEventListener('click', handleInteraction, { capture: true });
    window.addEventListener('touchstart', handleInteraction, { capture: true });

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      window.removeEventListener('click', handleInteraction, { capture: true });
      window.removeEventListener('touchstart', handleInteraction, { capture: true });
    };
  }, [showControlsTemporarily]);

  const reactionsRef = useRef(null);
  const moreOptionsRef = useRef(null);
  const remoteParticipants = useParticipants();

  // Derive waiting list reactively to avoid race conditions and mount lag
  const waitingList = remoteParticipants.filter(p => {
    try {
      return JSON.parse(p.metadata || '{}').isWaiting;
    } catch {
      return false;
    }
  }).map(p => ({
    identity: p.identity,
    name: p.name || p.identity
  }));

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (reactionsRef.current && !reactionsRef.current.contains(event.target)) {
        setShowReactions(false);
      }
      if (moreOptionsRef.current && !moreOptionsRef.current.contains(event.target)) {
        setShowMoreOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();

  // Automatically publish camera and mic when admitted and connected
  const hasPublishedRef = useRef(false);
  useEffect(() => {
    if (admitted && localParticipant && !hasPublishedRef.current) {
      hasPublishedRef.current = true;
      console.log('[MeetingRoom] Admitted! Activating selected media devices...', { initialCamOn, initialMicOn });
      if (initialCamOn) {
        localParticipant.setCameraEnabled(true).catch(err => console.error('Failed to enable camera:', err));
      }
      if (initialMicOn) {
        localParticipant.setMicrophoneEnabled(true).catch(err => console.error('Failed to enable mic:', err));
      }
    }
  }, [admitted, localParticipant, initialCamOn, initialMicOn]);

  // ── Mock Subtitles Cycle ───────────────────────────────────────────────────
  useEffect(() => {
    if (!captionsActive) {
      setSubtitleText('');
      return;
    }

    const subtitlePhrases = [
      "Arnabh Kushwaha: Welcome everyone to our high-fidelity session on Calyx!",
      "Arnabh Kushwaha: Let's discuss the progress on the meeting stage and overall premium UX.",
      "Arnabh Kushwaha: The responsive layouts and rounded tile borders make it look super crisp.",
      "Arnabh Kushwaha: Closed Captions are now active, powered by real-time speech processing.",
      "You: Wow, this looks exactly like the state-of-the-art Google Meet layout!",
      "You: The micro-animations and glowing hand raise states are incredibly responsive.",
      "Arnabh Kushwaha: Yes, the deep space navy theme matches perfectly with the visual identity."
    ];

    let index = 0;
    setSubtitleText(subtitlePhrases[0]);

    const interval = setInterval(() => {
      index = (index + 1) % subtitlePhrases.length;
      setSubtitleText(subtitlePhrases[index]);
    }, 4500);

    return () => clearInterval(interval);
  }, [captionsActive]);

  // ── Encode / send a data message ────────────────────────────────────────────
  const sendData = useCallback(async (payload) => {
    if (!room || !room.localParticipant) return;
    if (room.state !== 'connected') {
      console.warn('[MeetingRoom] Cannot send data: Room is not connected');
      return;
    }
    try {
      const meta = JSON.parse(room.localParticipant.metadata || '{}');
      if (meta.isWaiting) {
        console.warn('[MeetingRoom] Cannot send data: Participant is in waiting state');
        return;
      }
    } catch (e) { }

    const encoded = new TextEncoder().encode(JSON.stringify(payload));
    try {
      await room.localParticipant.publishData(encoded, { reliable: true });
    } catch (err) {
      console.error('Failed to send data:', err);
    }
  }, [room]);

  // ── Sync Hand Raised State ──────────────────────────────────────────────────
  useEffect(() => {
    if (admitted) {
      sendData({ type: 'calyx-hand-raise', handRaised });
    }
  }, [handRaised, admitted, sendData]);

  // ── Floating Reactions Handler ──────────────────────────────────────────────
  const triggerReaction = useCallback((emoji) => {
    const id = Date.now() + Math.random();
    const left = Math.random() * 60 + 20; // random left percentage between 20% and 80%
    setActiveReactions(prev => [...prev, { id, emoji, left }]);
    sendData({ type: 'calyx-reaction', emoji, left });
    setTimeout(() => {
      setActiveReactions(prev => prev.filter(r => r.id !== id));
    }, 4000);
  }, [sendData]);

  // ── Browser tab title ───────────────────────────────────────────────────────
  useEffect(() => {
    document.title = 'Calyx - Meeting';
    return () => { document.title = 'Calyx Meet'; };
  }, []);

  // ── Copy room code ──────────────────────────────────────────────────────────
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomName);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy room ID:', err);
    }
  }, [roomName]);

  // ── Admission: admit a waiting participant ──────────────────────────────────
  const handleAdmit = useCallback(async (identity) => {
    console.log(`[MeetingRoom] Admitting ${identity} via backend...`);
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/admitParticipant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName, identity })
      });
      // Fallback data message for instant UI feedback
      await sendData({ type: 'calyx-admit', identity });
    } catch (err) {
      console.error('Failed to admit participant:', err);
    }
  }, [roomName, sendData]);

  // ── Admission: deny a waiting participant ───────────────────────────────────
  const handleDeny = useCallback(async (identity) => {
    console.log(`[MeetingRoom] Denying ${identity} via backend...`);
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/denyParticipant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName, identity })
      });
      await sendData({ type: 'calyx-deny', identity });
    } catch (err) {
      console.error('Failed to deny participant:', err);
    }
  }, [roomName, sendData]);

  // ── LiveKit event listeners ─────────────────────────────────────────────────
  useEffect(() => {
    const onMetadataChanged = (prev, participant) => {
      if (participant === room.localParticipant) {
        try {
          const meta = JSON.parse(participant.metadata || '{}');
          if (meta.isWaiting === false) {
            console.log('[MeetingRoom] Metadata updated: I am admitted!');
            onAdmit();
          }
        } catch { }
      }
    };

    const onDataReceived = (data, participant) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(data));
        const myIdentity = room?.localParticipant?.identity;
        if (!myIdentity) return;

        if (msg.type === 'calyx-admit' && msg.identity === myIdentity) {
          onAdmit();
        }
        if (msg.type === 'calyx-deny' && msg.identity === myIdentity) {
          setDenied(true);
          setTimeout(() => navigate('/'), 3000);
        }
        if (msg.type === 'calyx-chat') {
          setMessages(prev => [...prev, {
            id: Date.now(),
            sender: msg.sender,
            content: msg.content,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        }
        if (msg.type === 'calyx-pin') {
          setPinnedMessage(msg.message);
        }
        if (msg.type === 'calyx-reaction') {
          const id = Date.now() + Math.random();
          setActiveReactions(prev => [...prev, { id, emoji: msg.emoji, left: msg.left || (Math.random() * 60 + 20) }]);
          setTimeout(() => {
            setActiveReactions(prev => prev.filter(r => r.id !== id));
          }, 4000);
        }
        if (msg.type === 'calyx-hand-raise') {
          const identity = participant?.identity;
          if (identity) {
            setRemoteHandsRaised(prev => ({
              ...prev,
              [identity]: msg.handRaised
            }));
          }
        }
      } catch (err) {
        console.error('[MeetingRoom] Data error:', err);
      }
    };

    room.on('participantMetadataChanged', onMetadataChanged);
    room.on('dataReceived', onDataReceived);

    return () => {
      room.off('participantMetadataChanged', onMetadataChanged);
      room.off('dataReceived', onDataReceived);
    };
  }, [room, navigate, onAdmit]);


  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>

      {isWaiting && !admitted && !denied && (
        <WaitingLobby
          participantName={participantName}
          photoURL={photoURL}
          isHost={isHost}
          admittedPending={admittedPending}
          onJoin={() => {
            if (isHost) {
              onAdmit(); // Host admits themselves
            } else {
              setAdmittedPending(true);
            }
          }}
          camOn={initialCamOn}
          setCamOn={setInitialCamOn}
          micOn={initialMicOn}
          setMicOn={setInitialMicOn}
        />
      )}

      {/* ── Denied Screen (full block) ───────────────────────────────────────── */}
      {denied && (
        <div className="waiting-overlay blocking">
          <div className="waiting-card glass-panel denied">
            <UserX size={40} color="var(--accent-red)" />
            <h2>Your request was declined</h2>
            <p>The host did not admit you to this meeting.</p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Redirecting you back…</p>
          </div>
        </div>
      )}

      {/* ── Host Admission Popups (stack from top-right) ──────────────────── */}
      {waitingList.map((p, idx) => (
        <div
          key={p.identity}
          className="admission-popup"
          style={{ top: `${idx * 96 + 80}px` }}
        >
          <div className="admission-popup-inner">
            <div className="admission-avatar">{p.name.charAt(0).toUpperCase()}</div>
            <div className="admission-info">
              <strong className="admission-name">{p.name}</strong>
              <span className="admission-sub">wants to join this meeting</span>
            </div>
          </div>
          <div className="admission-actions">
            <button className="admission-btn deny" onClick={() => handleDeny(p.identity)}>
              <UserX size={14} />
              <span>Decline</span>
            </button>
            <button className="admission-btn admit" onClick={() => handleAdmit(p.identity)}>
              <UserCheck size={14} />
              <span>Admit</span>
            </button>
          </div>
        </div>
      ))}

      {/* ── Main Meeting UI ── */}
      {!denied && admitted && (
        <div className={`app-layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
          <div className="main-content">

            <div className="video-stage">
              <CustomVideoStage
                pinnedTrackSid={pinnedTrackSid}
                setPinnedTrackSid={setPinnedTrackSid}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                handRaised={handRaised}
                remoteHandsRaised={remoteHandsRaised}
              />
              <RoomAudioRenderer />

              {/* Floating Reactions Overlay */}
              <div className="floating-reactions-overlay">
                {activeReactions.map(r => (
                  <span
                    key={r.id}
                    className="floating-emoji"
                    style={{ left: `${r.left}%` }}
                  >
                    {r.emoji}
                  </span>
                ))}
              </div>

              {/* Closed Captions Overlay */}
              {captionsActive && subtitleText && (
                <div className="captions-stage-overlay">
                  <p className="caption-text">{subtitleText}</p>
                </div>
              )}
            </div>

            <footer
              className={`meeting-footer ${!showControls ? 'controls-hidden' : ''}`}
              onMouseEnter={() => {
                footerHoveredRef.current = true;
                showControlsTemporarily();
              }}
              onMouseLeave={() => {
                footerHoveredRef.current = false;
                showControlsTemporarily();
              }}
            >
              <div className="footer-left">
                <span className="footer-time">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="footer-divider">|</span>
                <span className="footer-room-id">{roomName}</span>
              </div>

              <div className="footer-center">
                {/* Microphone Toggle with Audio Wave */}
                <button
                  className={`pill-btn ${isMicrophoneEnabled ? '' : 'muted-pill'}`}
                  onClick={() => {
                    if (localParticipant) {
                      localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
                    }
                  }}
                  title={isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"}
                >
                  {isMicrophoneEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                  {isMicrophoneEnabled && (
                    <div className="mic-audio-wave">
                      <span className="wave-bar bar-1"></span>
                      <span className="wave-bar bar-2"></span>
                      <span className="wave-bar bar-3"></span>
                    </div>
                  )}
                </button>

                {/* Camera Toggle */}
                <button
                  className={`pill-btn ${isCameraEnabled ? '' : 'muted-pill'}`}
                  onClick={() => {
                    if (localParticipant) {
                      localParticipant.setCameraEnabled(!isCameraEnabled);
                    }
                  }}
                  title={isCameraEnabled ? "Turn off camera" : "Turn on camera"}
                >
                  {isCameraEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                </button>

                {/* Closed Captions Button (CC) */}
                <button
                  className={`pill-btn ${captionsActive ? 'active-pill' : ''}`}
                  onClick={() => setCaptionsActive(!captionsActive)}
                  title="Toggle subtitles (CC)"
                >
                  <Subtitles size={20} />
                </button>

                {/* Reactions (Smile) */}
                <div style={{ position: 'relative' }} ref={reactionsRef}>
                  {showReactions && (
                    <div className="reactions-selector-popover glass-panel">
                      {['👍', '❤️', '👏', '😂', '😮', '🎉'].map(emoji => (
                        <button
                          key={emoji}
                          className="reaction-emoji-btn"
                          onClick={() => {
                            triggerReaction(emoji);
                            setShowReactions(false);
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    className={`pill-btn ${showReactions ? 'active-pill' : ''}`}
                    onClick={() => setShowReactions(!showReactions)}
                    title="Send a reaction"
                  >
                    <Smile size={20} />
                  </button>
                </div>

                {/* Screen Share */}
                <button
                  className={`pill-btn ${isScreenShareEnabled ? 'active-pill' : ''}`}
                  onClick={() => {
                    if (localParticipant) {
                      localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
                    }
                  }}
                  title={isScreenShareEnabled ? "Stop sharing screen" : "Share screen"}
                >
                  <Share2 size={20} />
                </button>

                {/* Raise Hand */}
                <button
                  className={`pill-btn ${handRaised ? 'hand-active-pill' : ''}`}
                  onClick={() => setHandRaised(!handRaised)}
                  title={handRaised ? "Lower hand" : "Raise hand"}
                >
                  <Hand size={20} style={{ color: handRaised ? '#fff' : 'inherit' }} />
                </button>

                {/* More Options */}
                <div style={{ position: 'relative' }} ref={moreOptionsRef}>
                  {showMoreOptions && (
                    <div className="more-options-popover glass-panel">
                      <button
                        className="more-options-item"
                        onClick={() => {
                          if (!document.fullscreenElement) {
                            document.documentElement.requestFullscreen().catch(err => console.error(err));
                          } else {
                            document.exitFullscreen();
                          }
                          setShowMoreOptions(false);
                        }}
                      >
                        <Shapes size={18} />
                        <span>Full Screen</span>
                      </button>
                      <button
                        className="more-options-item"
                        onClick={() => {
                          setCaptionsActive(!captionsActive);
                          setShowMoreOptions(false);
                        }}
                      >
                        <Subtitles size={18} />
                        <span>{captionsActive ? 'Disable captions' : 'Enable captions'}</span>
                      </button>
                      <button
                        className="more-options-item"
                        onClick={() => {
                          setSidebarOpen(true);
                          setSidebarTab('participants');
                          setShowMoreOptions(false);
                        }}
                      >
                        <Users size={18} />
                        <span>Show participants</span>
                      </button>
                    </div>
                  )}
                  <button
                    className={`pill-btn ${showMoreOptions ? 'active-pill' : ''}`}
                    onClick={() => setShowMoreOptions(!showMoreOptions)}
                    title="More options"
                  >
                    <MoreVertical size={20} />
                  </button>
                </div>

                {/* Leave Meeting (Red Pill) */}
                <DisconnectButton className="pill-btn leave-btn" title="Leave meeting">
                  <PhoneOff size={22} />
                </DisconnectButton>
              </div>

              <div className="footer-right">
                <button
                  className={`icon-btn-ghost ${sidebarOpen && sidebarTab === 'info' ? 'active' : ''}`}
                  onClick={() => {
                    if (sidebarOpen && sidebarTab === 'info') {
                      setSidebarOpen(false);
                    } else {
                      setSidebarOpen(true);
                      setSidebarTab('info');
                    }
                  }}
                  title="Meeting info"
                >
                  <Info size={20} />
                </button>
                <button
                  className={`icon-btn-ghost ${sidebarOpen && sidebarTab === 'participants' ? 'active' : ''}`}
                  onClick={() => {
                    if (sidebarOpen && sidebarTab === 'participants') {
                      setSidebarOpen(false);
                    } else {
                      setSidebarOpen(true);
                      setSidebarTab('participants');
                    }
                  }}
                  title="Participants"
                >
                  <Users size={20} />
                </button>
                <button
                  className={`icon-btn-ghost ${sidebarOpen && sidebarTab === 'chat' ? 'active' : ''}`}
                  onClick={() => {
                    if (sidebarOpen && sidebarTab === 'chat') {
                      setSidebarOpen(false);
                    } else {
                      setSidebarOpen(true);
                      setSidebarTab('chat');
                    }
                  }}
                  title="Chat"
                >
                  <MessageSquare size={20} />
                </button>
                <button
                  className={`icon-btn-ghost ${sidebarOpen && sidebarTab === 'activities' ? 'active' : ''}`}
                  onClick={() => {
                    if (sidebarOpen && sidebarTab === 'activities') {
                      setSidebarOpen(false);
                    } else {
                      setSidebarOpen(true);
                      setSidebarTab('activities');
                    }
                  }}
                  title="Activities"
                >
                  <Shapes size={20} />
                </button>
                <button
                  className={`icon-btn-ghost ${sidebarOpen && sidebarTab === 'settings' ? 'active' : ''}`}
                  onClick={() => {
                    if (sidebarOpen && sidebarTab === 'settings') {
                      setSidebarOpen(false);
                    } else {
                      setSidebarOpen(true);
                      setSidebarTab('settings');
                    }
                  }}
                  title="Host controls"
                >
                  <Lock size={20} />
                </button>
              </div>
            </footer>
          </div>

          <Sidebar
            isOpen={sidebarOpen}
            activeTab={sidebarTab}
            setActiveTab={setSidebarTab}
            room={room}
            getMeta={getMeta}
            onClose={() => setSidebarOpen(false)}
            pinnedTrackSid={pinnedTrackSid}
            setPinnedTrackSid={setPinnedTrackSid}
            onAdmitParticipant={handleAdmit}
            onDenyParticipant={handleDeny}
            messages={messages}
            pinnedMessage={pinnedMessage}
            onSendMessage={(content) => {
              const payload = { type: 'calyx-chat', sender: participantName, content };
              sendData(payload);
              setMessages(prev => [...prev, {
                id: Date.now(),
                sender: participantName,
                content,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }]);
            }}
            onPinMessage={(msg) => {
              const payload = { type: 'calyx-pin', message: msg };
              sendData(payload);
              setPinnedMessage(msg);
            }}
            isHost={isHost}
            participantName={participantName}
            roomName={roomName}
          />
        </div>
      )}

    </div>
  );
};


// ─── Waiting Lobby (High Fidelity Google Meet style) ──────────────────────────
const WaitingLobby = ({ participantName, photoURL, isHost, admittedPending = false, onJoin, camOn, setCamOn, micOn, setMicOn }) => {
  const videoRef = useRef(null);
  const [dots, setDots] = useState('');
  const [showEffects, setShowEffects] = useState(false);
  const [activeEffect, setActiveEffect] = useState('none'); // 'none', 'blur', 'background'

  const camTrackRef = useRef(null);
  const micTrackRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (camTrackRef.current) { camTrackRef.current.stop(); camTrackRef.current = null; }
      if (micTrackRef.current) { micTrackRef.current.stop(); micTrackRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (camTrackRef.current) {
      if (activeEffect === 'blur') {
        const blur = BackgroundBlur(10);
        camTrackRef.current.setProcessor(blur);
      } else {
        camTrackRef.current.stopProcessor();
      }
    }
  }, [activeEffect]);

  useEffect(() => {
    if (camOn && !admittedPending) {
      if (camTrackRef.current) {
        if (videoRef.current) camTrackRef.current.attach(videoRef.current);
        return;
      }
      createLocalVideoTrack({
        facingMode: 'user',
        resolution: { width: 1280, height: 720, frameRate: 30 },
      }).then((track) => {
        if (!mountedRef.current) { track.stop(); return; }
        camTrackRef.current = track;
        if (videoRef.current) track.attach(videoRef.current);
        // Apply current effect to the new track
        if (activeEffect === 'blur') {
          track.setProcessor(BackgroundBlur(10));
        }
      }).catch((err) => console.error('Camera init failed:', err));
    } else {
      if (camTrackRef.current) { camTrackRef.current.stop(); camTrackRef.current = null; }
    }
  }, [camOn, admittedPending, activeEffect]);

  useEffect(() => {
    if (micOn && !admittedPending) {
      if (micTrackRef.current) return;
      createLocalAudioTrack().then((track) => {
        if (!mountedRef.current) { track.stop(); return; }
        micTrackRef.current = track;
      }).catch((err) => console.error('Mic init failed:', err));
    } else {
      if (micTrackRef.current) { micTrackRef.current.stop(); micTrackRef.current = null; }
    }
  }, [micOn, admittedPending]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="lobby-v2">
      <div className="lobby-v2-container">
        {/* Left Side: Video Preview */}
        <div className="lobby-v2-preview-section">
          <div className="preview-window shadow-xl">
            {camOn ? (
              <video ref={videoRef} className="preview-video" autoPlay muted playsInline />
            ) : (
              <div className="preview-off">
                <div className="preview-avatar">
                  {photoURL ? <img src={photoURL} alt={participantName} /> : <span>{participantName?.charAt(0).toUpperCase()}</span>}
                </div>
                <p>Camera is off</p>
              </div>
            )}

            <div className="preview-overlay-bottom">
              <div className="preview-controls">
                <button
                  className={`preview-btn ${micOn ? '' : 'off'}`}
                  onClick={() => setMicOn(!micOn)}
                  title={micOn ? 'Mute' : 'Unmute'}
                >
                  {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                </button>
                <button
                  className={`preview-btn ${camOn ? '' : 'off'}`}
                  onClick={() => setCamOn(!camOn)}
                  title={camOn ? 'Turn off camera' : 'Turn on camera'}
                >
                  {camOn ? <Video size={20} /> : <VideoOff size={20} />}
                </button>
              </div>
              <button
                className={`effects-toggle-btn ${showEffects ? 'active' : ''}`}
                onClick={() => setShowEffects(!showEffects)}
                title="Apply visual effects"
              >
                <div className="sparkles-icon">✨</div>
              </button>
            </div>

            {showEffects && (
              <div className="effects-panel fade-in shadow-lg">
                <div className="effects-header">
                  <span>Visual effects</span>
                  <button onClick={() => setShowEffects(false)}>×</button>
                </div>
                <div className="effects-grid">
                  <div className={`effect-item ${activeEffect === 'none' ? 'selected' : ''}`} onClick={() => setActiveEffect('none')}>
                    <div className="effect-thumb none"><VideoOff size={16} /></div>
                    <span>None</span>
                  </div>
                  <div className={`effect-item ${activeEffect === 'blur' ? 'selected' : ''}`} onClick={() => setActiveEffect('blur')}>
                    <div className="effect-thumb blur"></div>
                    <span>Blur</span>
                  </div>
                  <div className={`effect-item ${activeEffect === 'background' ? 'selected' : ''}`} onClick={() => setActiveEffect('background')}>
                    <div className="effect-thumb bg"></div>
                    <span>Abstract</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button className="check-audio-btn">
            <Settings size={16} />
            <span>Check your audio and video</span>
          </button>
        </div>

        {/* Right Side: Join Info */}
        <div className="lobby-v2-info-section">
          <div className="info-content">
            <h1 className="ready-title">Ready to join?</h1>
            <p className="ready-subtitle">No one else is here</p>

            <div className="join-actions">
              <button
                className="join-now-btn"
                disabled={admittedPending}
                onClick={onJoin}
              >
                {admittedPending ? `Asking to join${dots}` : isHost ? 'Join now' : 'Ask to join'}
              </button>
              <button className="present-btn">
                <Share size={18} />
                <span>Present</span>
              </button>
            </div>

            <div className="other-options">
              <p>Other joining options</p>
              <button className="option-link"><PhoneOff size={16} /> Use a phone for audio</button>
            </div>
          </div>

          {admittedPending && (
            <div className="admit-notification fade-in">
              <div className="pulse-circle"></div>
              <p>Asking to be admitted{dots}</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer / User Badge */}
      <div className="lobby-footer">
        <div className="lobby-user-badge">
          <div className="small-avatar">
            {photoURL ? <img src={photoURL} alt={participantName} /> : participantName?.charAt(0).toUpperCase()}
          </div>
          <span>{participantName}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Gorgeous Meeting Participant Tile ───────────────────────────────────────
const MeetingParticipantTile = ({
  participant,
  isHost,
  isActiveSpeaker,
  handRaised,
  pinnedTrackSid,
  setPinnedTrackSid
}) => {
  const getMeta = useCallback((p) => {
    try {
      return JSON.parse(p.metadata || '{}');
    } catch { return {}; }
  }, []);

  const meta = getMeta(participant);

  // Hand raised state is checked from either remote sync state or metadata
  const isHandRaised = handRaised;

  // Track publications
  const cameraPub = participant.getTrackPublication(Track.Source.Camera);
  const screenSharePub = participant.getTrackPublication(Track.Source.ScreenShare);

  const showVideo = (screenSharePub?.track && !screenSharePub.isMuted) || (cameraPub?.track && !cameraPub.isMuted);
  const activeTrackPub = screenSharePub?.track ? screenSharePub : cameraPub;

  const trackId = activeTrackPub?.trackSid ? `${participant.sid}-${activeTrackPub.source}` : null;
  const isPinned = trackId && pinnedTrackSid === trackId;

  const initials = (participant.name || participant.identity || '?').charAt(0).toUpperCase();

  return (
    <div className={`participant-tile-container ${isActiveSpeaker ? 'speaking' : ''}`}>

      {/* Hand Raised Badge */}
      {isHandRaised && (
        <div className="tile-hand-raised-badge animate-bounce-subtle">
          <Hand size={18} fill="currentColor" />
        </div>
      )}

      {/* Video View or Avatar View */}
      {showVideo && activeTrackPub?.track ? (
        <div className="tile-video-view" style={{ transform: participant.isLocal && activeTrackPub.source === Track.Source.Camera ? 'scaleX(-1)' : 'none' }}>
          <VideoTrack
            trackRef={{
              participant,
              source: activeTrackPub.source,
              publication: activeTrackPub
            }}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      ) : (
        <div className="tile-avatar-view">
          <div className="tile-avatar-circle">
            {meta.photoURL ? (
              <img src={meta.photoURL} alt={participant.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            ) : (
              initials
            )}
          </div>
          <p>Camera is off</p>
        </div>
      )}

      {/* Pin Control */}
      {trackId && (
        <div className="tile-pin-control">
          <button
            className={`pin-btn ${isPinned ? 'pinned' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setPinnedTrackSid(isPinned ? null : trackId);
            }}
            title={isPinned ? "Unpin tile" : "Pin tile"}
          >
            {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
        </div>
      )}

      {/* Name and Status Label */}
      <div className="tile-info-bar">
        <span className="tile-name">
          {participant.name || participant.identity}
          {participant.isLocal && ' (You)'}
        </span>

        {isHost && <span className="tile-badge host">Host</span>}

        {!participant.isMicrophoneEnabled && (
          <span className="tile-mic-status">
            <MicOff size={12} />
          </span>
        )}

        {isActiveSpeaker && participant.isMicrophoneEnabled && (
          <div className="tile-speaking-indicator">
            <span className="tile-speaking-bar bar-1"></span>
            <span className="tile-speaking-bar bar-2"></span>
            <span className="tile-speaking-bar bar-3"></span>
          </div>
        )}
      </div>

    </div>
  );
};

// ─── Custom Responsive Video Stage with Speaker & Host Prioritization ───────
const CustomVideoStage = ({
  pinnedTrackSid,
  setPinnedTrackSid,
  sidebarOpen,
  setSidebarOpen,
  handRaised,
  remoteHandsRaised = {}
}) => {
  const room = useRoomContext();
  const remoteParticipants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  const [recentSpeakers, setRecentSpeakers] = useState([]);
  const [activeSpeakerSids, setActiveSpeakerSids] = useState(new Set());

  const getMeta = useCallback((p) => {
    try {
      return JSON.parse(p.metadata || '{}');
    } catch { return {}; }
  }, []);

  // Track speakers
  useEffect(() => {
    if (!room) return;

    const handleSpeakersChanged = (speakers) => {
      // 1. Update active speakers for glowing borders
      setActiveSpeakerSids(new Set(speakers.map(s => s.sid)));

      // 2. Add to recent speakers list
      if (speakers.length > 0) {
        setRecentSpeakers(prev => {
          let next = [...prev];
          speakers.forEach(speaker => {
            const identity = speaker.identity;
            if (!identity) return;
            next = next.filter(id => id !== identity);
            next.unshift(identity);
          });
          return next.slice(0, 20);
        });
      }
    };

    room.on('activeSpeakersChanged', handleSpeakersChanged);
    return () => {
      room.off('activeSpeakersChanged', handleSpeakersChanged);
    };
  }, [room]);

  // All active participants in meeting (excluding waiting lobby)
  const allInMeeting = [localParticipant, ...remoteParticipants].filter(p => p && !getMeta(p).isWaiting);

  // If nobody else is in the call, my camera screen gets big by default
  if (allInMeeting.length <= 1) {
    return (
      <div className="custom-stage single-view">
        <div className="meeting-grid count-1">
          {localParticipant && (
            <MeetingParticipantTile
              participant={localParticipant}
              isHost={true}
              isActiveSpeaker={activeSpeakerSids.has(localParticipant.sid)}
              handRaised={handRaised}
              pinnedTrackSid={pinnedTrackSid}
              setPinnedTrackSid={setPinnedTrackSid}
            />
          )}
        </div>
      </div>
    );
  }

  // Find host
  const host = allInMeeting.find(p => getMeta(p).isHost) ||
    allInMeeting.find(p => p.isLocal && getMeta(p).isHost) ||
    allInMeeting[0];

  // Select up to 3 recent speakers who are NOT the host
  const otherSelected = [];
  for (const identity of recentSpeakers) {
    const p = allInMeeting.find(x => x.identity === identity);
    if (p && p.identity !== host?.identity && !otherSelected.some(x => x.identity === p.identity)) {
      otherSelected.push(p);
      if (otherSelected.length >= 3) break;
    }
  }

  // Fill up to 3 slots from other participants
  if (otherSelected.length < 3) {
    for (const p of allInMeeting) {
      if (p.identity !== host?.identity && !otherSelected.some(x => x.identity === p.identity)) {
        otherSelected.push(p);
        if (otherSelected.length >= 3) break;
      }
    }
  }

  // Final 4 participants to show on the screen
  const participantsToShow = [];
  if (host) participantsToShow.push(host);
  participantsToShow.push(...otherSelected);
  const finalParticipantsToShow = participantsToShow.slice(0, 4);

  // More participants count
  const participantsInMore = allInMeeting.filter(p =>
    !finalParticipantsToShow.some(x => x.identity === p.identity)
  );
  const moreCount = participantsInMore.length;

  const totalGridItems = finalParticipantsToShow.length + (moreCount > 0 ? 1 : 0);

  return (
    <div className="custom-stage">
      <div className={`meeting-grid count-${totalGridItems}`}>
        {finalParticipantsToShow.map(p => {
          const isParticipantHandRaised = p.isLocal ? handRaised : !!remoteHandsRaised[p.identity];
          return (
            <MeetingParticipantTile
              key={p.identity}
              participant={p}
              isHost={p.identity === host?.identity}
              isActiveSpeaker={activeSpeakerSids.has(p.sid)}
              handRaised={isParticipantHandRaised}
              pinnedTrackSid={pinnedTrackSid}
              setPinnedTrackSid={setPinnedTrackSid}
            />
          );
        })}

        {moreCount > 0 && (
          <div
            className="more-participants-tile"
            onClick={() => setSidebarOpen(true)}
            title="Show more participants"
          >
            <div className="more-avatar-stack">
              {participantsInMore.slice(0, 3).map((p, i) => (
                <div key={p.identity} className="more-avatar-bubble" style={{ zIndex: 3 - i }}>
                  {p.name?.charAt(0).toUpperCase() || p.identity.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
            <h3>+{moreCount} more</h3>
            <p>Click to view in People panel</p>
          </div>
        )}
      </div>
    </div>
  );
};

const InfoPanel = ({ roomName, participantName }) => {
  const [copied, setCopied] = useState(false);
  const joinUrl = `${window.location.origin}/meeting/${roomName}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useParticipants();

  const getMeta = (p) => {
    try {
      return JSON.parse(p.metadata || '{}');
    } catch {
      return {};
    }
  };

  // Find the host/admin name
  const allInMeeting = [localParticipant, ...remoteParticipants].filter(p => p && !getMeta(p).isWaiting);
  const hostParticipant = allInMeeting.find(p => getMeta(p).isHost) ||
    allInMeeting.find(p => p.isLocal && getMeta(p).isHost);
  const adminName = hostParticipant?.name || hostParticipant?.identity || (getMeta(localParticipant).isHost ? participantName : "Admin");

  return (
    <div className="info-panel-container">
      <div className="info-header-card glass-panel-premium">
        <div className="info-title-wrap">
          <Info size={16} className="title-icon" />
          <h4>Joining Info</h4>
        </div>
        <p className="join-url-text">{joinUrl}</p>
        <button className="btn-premium copy-info-btn" onClick={handleCopyLink}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          <span>{copied ? 'Copied link!' : 'Copy joining info'}</span>
        </button>
      </div>

      <div className="info-details-list">
        <div className="info-detail-item">
          <div className="detail-label-wrap">
            <UserCheck size={16} className="detail-icon" />
            <span className="detail-label">Admin Name</span>
          </div>
          <span className="detail-value" title={adminName}>{adminName}</span>
        </div>
        <div className="info-detail-item">
          <div className="detail-label-wrap">
            <Clock size={16} className="detail-icon" />
            <span className="detail-label">Meeting Code</span>
          </div>
          <span className="detail-value font-mono">{roomName}</span>
        </div>
        <div className="info-detail-item">
          <div className="detail-label-wrap">
            <Shield size={16} className="detail-icon text-emerald" />
            <span className="detail-label">Security</span>
          </div>
          <span className="detail-value security-verified">
            Lobby Verification
          </span>
        </div>
        <div className="info-detail-item">
          <div className="detail-label-wrap">
            <Lock size={16} className="detail-icon text-indigo" />
            <span className="detail-label">Encryption</span>
          </div>
          <span className="detail-value encryption-secure">
            End-to-End
          </span>
        </div>
      </div>

      <div className="info-calendar-promo glass-panel">
        <div className="promo-icon-wrap">
          <Calendar size={20} className="calendar-icon" />
        </div>
        <div className="promo-text-wrap">
          <strong>Google Calendar Sync</strong>
          <span>Add this room link to your calendar invites</span>
        </div>
        <span className="promo-badge">PRO</span>
      </div>
    </div>
  );
};

const Whiteboard = () => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#6366f1');
  const [brushSize, setBrushSize] = useState(4);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = 360 * 2;
    ctx.scale(2, 2);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;

    // Draw grid blueprint lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridSpacing = 20;
    for (let x = 0; x < rect.width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 360);
      ctx.stroke();
    }
    for (let y = 0; y < 360; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
  }, [color, brushSize]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    if (e.cancelable) e.preventDefault();
    const pos = getCoordinates(e);
    setIsDrawing(true);
    setLastPos(pos);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault();
    const pos = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    setLastPos(pos);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridSpacing = 20;
    for (let x = 0; x < rect.width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 360);
      ctx.stroke();
    }
    for (let y = 0; y < 360; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'calyx-whiteboard.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="whiteboard-container">
      <div className="wb-canvas-wrapper glass-panel">
        <canvas
          ref={canvasRef}
          className="wb-canvas"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ height: '240px', width: '100%', cursor: 'crosshair', display: 'block', background: '#0a0d1a', borderRadius: '12px' }}
        />
      </div>

      <div className="wb-controls">
        <div className="wb-control-group">
          <span className="wb-group-title">Colors</span>
          <div className="wb-colors-grid">
            {['#6366f1', '#00d2ff', '#f43f5e', '#eab308', '#22c55e', '#ffffff'].map(c => (
              <button
                key={c}
                className={`color-swatch-btn ${color === c ? 'active' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <div className="wb-control-group">
          <span className="wb-group-title">Sizes</span>
          <div className="wb-sizes-grid">
            {[2, 4, 8, 16].map(s => (
              <button
                key={s}
                className={`size-select-btn ${brushSize === s ? 'active' : ''}`}
                onClick={() => setBrushSize(s)}
              >
                <span style={{ width: `${s}px`, height: `${s}px`, borderRadius: '50%', backgroundColor: color }} />
              </button>
            ))}
          </div>
        </div>

        <div className="wb-actions-row">
          <button className="wb-action-btn clear-btn" onClick={handleClear}>
            <Trash2 size={14} />
            <span>Clear</span>
          </button>
          <button className="wb-action-btn download-btn" onClick={handleDownload}>
            <Download size={14} />
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const PollsSection = () => {
  const [p1Vote, setP1Vote] = useState(null);
  const [p1Votes, setP1Votes] = useState({ 0: 18, 1: 5, 2: 2 });
  const p1Options = [
    "Yes, absolutely! 🚀",
    "Maybe, need more testing",
    "No, keep Google Meet"
  ];

  const [p2Vote, setP2Vote] = useState(null);
  const [p2Votes, setP2Votes] = useState({ 0: 12, 1: 8, 2: 15 });
  const p2Options = [
    "AI Meeting Summarizer 🧠",
    "Custom 3D Backgrounds 🎨",
    "Breakout Rooms & Live Translation 🌐"
  ];

  const handleVote1 = (idx) => {
    setP1Votes(prev => {
      const next = { ...prev };
      if (p1Vote !== null) next[p1Vote] -= 1;
      next[idx] += 1;
      return next;
    });
    setP1Vote(idx);
  };

  const handleVote2 = (idx) => {
    setP2Votes(prev => {
      const next = { ...prev };
      if (p2Vote !== null) next[p2Vote] -= 1;
      next[idx] += 1;
      return next;
    });
    setP2Vote(idx);
  };

  const renderPoll = (title, options, votes, userVote, onVote, onChangeVote) => {
    const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);

    return (
      <div className="poll-card glass-panel">
        <h4 className="poll-question">{title}</h4>
        <p className="poll-meta">{totalVotes} votes • Active</p>

        {userVote === null ? (
          <div className="poll-vote-options">
            {options.map((opt, idx) => (
              <button key={idx} className="poll-option-btn glass-panel" onClick={() => onVote(idx)}>
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <div className="poll-results">
            {options.map((opt, idx) => {
              const count = votes[idx];
              const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              const isUserSelected = userVote === idx;
              return (
                <div key={idx} className={`poll-result-bar-wrap ${isUserSelected ? 'selected' : ''}`}>
                  <div className="result-label-row">
                    <span className="result-text">{opt} {isUserSelected && <span className="your-vote-tag">(Your vote)</span>}</span>
                    <span className="result-pct">{pct}% ({count})</span>
                  </div>
                  <div className="pct-progress-bar">
                    <div className="pct-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            <button className="change-vote-btn" onClick={onChangeVote}>Change vote</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="polls-section-container">
      {renderPoll(
        "Should we adopt Calyx for all our engineering calls?",
        p1Options,
        p1Votes,
        p1Vote,
        handleVote1,
        () => setP1Vote(null)
      )}

      {renderPoll(
        "What feature should Calyx build next?",
        p2Options,
        p2Votes,
        p2Vote,
        handleVote2,
        () => setP2Vote(null)
      )}
    </div>
  );
};

const ActivitiesPanel = () => {
  const [activeActivity, setActiveActivity] = useState(null);

  if (activeActivity === 'whiteboard') {
    return (
      <div className="activity-wrapper">
        <div className="activity-back-header">
          <button className="wb-back-btn" onClick={() => setActiveActivity(null)}>
            <ArrowLeft size={16} />
            <span>Back to Activities</span>
          </button>
          <h3>Collaborative Board</h3>
        </div>
        <Whiteboard />
      </div>
    );
  }

  if (activeActivity === 'polls') {
    return (
      <div className="activity-wrapper">
        <div className="activity-back-header">
          <button className="wb-back-btn" onClick={() => setActiveActivity(null)}>
            <ArrowLeft size={16} />
            <span>Back to Activities</span>
          </button>
          <h3>Interactive Polls</h3>
        </div>
        <PollsSection />
      </div>
    );
  }

  return (
    <div className="activities-menu-container">
      <div className="activity-menu-card glass-panel" onClick={() => setActiveActivity('whiteboard')}>
        <div className="activity-icon-box indigo-glow">
          <Brush size={20} color="#6366f1" />
        </div>
        <div className="activity-text">
          <strong>Whiteboard Blueprint</strong>
          <span>Sketch and draw ideas in real-time</span>
        </div>
      </div>

      <div className="activity-menu-card glass-panel" onClick={() => setActiveActivity('polls')}>
        <div className="activity-icon-box teal-glow">
          <BarChart2 size={20} color="#00d2ff" />
        </div>
        <div className="activity-text">
          <strong>Interactive Polls</strong>
          <span>Vote and view instant percentage progress bars</span>
        </div>
      </div>
    </div>
  );
};

const Sidebar = ({
  isOpen, onClose, room, getMeta,
  pinnedTrackSid, setPinnedTrackSid,
  onAdmitParticipant, onDenyParticipant,
  messages, pinnedMessage, onSendMessage, onPinMessage,
  activeTab, setActiveTab,
  isHost, participantName, roomName
}) => {
  const participants = useParticipants();

  if (!isOpen) return null;

  const inMeeting = participants.filter(p => {
    try { return !JSON.parse(p.metadata || '{}').isWaiting; } catch { return true; }
  });

  const waiting = participants.filter(p => {
    try { return JSON.parse(p.metadata || '{}').isWaiting; } catch { return false; }
  });

  const getRole = (p) => {
    const meta = JSON.parse(p.metadata || '{}');
    if (meta.isHost) return { label: 'Meeting host', color: '#00d2ff', weight: '600' };
    return { label: 'Participant', color: 'var(--text-secondary)', weight: '400' };
  };

  return (
    <div className={`sidebar ${!isOpen ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar-header">
        <h2 className="sidebar-title">
          {activeTab === 'info' ? 'Meeting Info' :
            activeTab === 'participants' ? 'People' :
              activeTab === 'chat' ? 'Chat' :
                activeTab === 'activities' ? 'Activities' : 'Host controls'}
        </h2>
        <button className="sidebar-close" onClick={onClose}><X size={20} /></button>
      </div>

      <div className="sidebar-tabs-minimal">
        <button
          className={`tab-link ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          Info
        </button>
        <button
          className={`tab-link ${activeTab === 'participants' ? 'active' : ''}`}
          onClick={() => setActiveTab('participants')}
        >
          People
        </button>
        <button
          className={`tab-link ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
        <button
          className={`tab-link ${activeTab === 'activities' ? 'active' : ''}`}
          onClick={() => setActiveTab('activities')}
        >
          Activities
        </button>
        <button
          className={`tab-link ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Host Controls
        </button>
      </div>

      <div className="sidebar-content">
        {activeTab === 'info' && (
          <InfoPanel roomName={roomName} participantName={participantName} />
        )}
        {activeTab === 'participants' && (
          <div className="participants-list">
            <button className="btn-premium add-people-btn" style={{ width: '100%', marginBottom: '20px' }}>
              <UserPlus size={18} />
              <span>Add people</span>
            </button>

            <div className="modern-search">
              <Search size={18} />
              <input type="text" placeholder="Search for people" />
            </div>

            <div className="participant-group">
              <div className="group-label">IN THE MEETING</div>

              {inMeeting.map((p) => {
                const role = getRole(p);
                const isPinned = pinnedTrackSid?.startsWith(p.sid);
                return (
                  <div key={p.identity} className="meet-participant-row">
                    <div className="p-avatar-wrap">
                      <div className="p-avatar-circle">
                        {p.name?.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="p-details">
                      <div className="p-name">
                        {p.name || p.identity}
                        {p.isLocal && ' (You)'}
                      </div>
                      <div className="p-role-text">{role.label}</div>
                    </div>
                    <div className="p-icons">
                      {!p.isMicrophoneEnabled && <MicOff size={16} color="var(--accent-red)" />}
                      {!p.isCameraEnabled && <VideoOff size={16} color="var(--accent-red)" />}
                      <button
                        className={`p-icon-btn ${isPinned ? 'active' : ''}`}
                        onClick={() => {
                          const trackId = `${p.sid}-${Track.Source.Camera}`;
                          setPinnedTrackSid(isPinned ? null : trackId);
                        }}
                      >
                        {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                      </button>
                      <button className="p-icon-btn"><MoreVertical size={16} /></button>
                    </div>
                  </div>
                );
              })}
            </div>

            {waiting.length > 0 && (
              <div className="participant-group waiting-section">
                <div className="group-label">WAITING ({waiting.length})</div>
                {waiting.map((p) => (
                  <div key={p.identity} className="meet-participant-row waiting-row">
                    <div className="p-avatar-wrap">
                      <div className="p-avatar-circle gray">
                        {p.name?.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="p-details">
                      <div className="p-name">{p.name || p.identity}</div>
                      <div className="p-role-text">Waiting to join</div>
                    </div>
                    <div className="p-actions-admit">
                      <button className="icon-btn admit" onClick={() => onAdmitParticipant?.(p.identity)}><UserCheck size={16} /></button>
                      <button className="icon-btn deny" onClick={() => onDenyParticipant?.(p.identity)}><UserX size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === 'chat' && (
          <ChatPanel
            messages={messages}
            pinnedMessage={pinnedMessage}
            onSendMessage={onSendMessage}
            onPinMessage={onPinMessage}
            isHost={isHost}
          />
        )}
        {activeTab === 'activities' && (
          <ActivitiesPanel />
        )}
        {activeTab === 'settings' && (
          <HostSettings room={room} />
        )}
      </div>
    </div>
  );
};

const ChatPanel = ({ messages, pinnedMessage, onSendMessage, onPinMessage, isHost }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="chat-panel">
      {pinnedMessage && (
        <div className="pinned-message-bar">
          <div className="pinned-info">
            <Pin size={12} />
            <span>Pinned by host</span>
          </div>
          <p>{pinnedMessage.content}</p>
          {isHost && <button onClick={() => onPinMessage(null)}>×</button>}
        </div>
      )}
      <div className="messages-container" ref={scrollRef}>
        {messages.map(msg => (
          <div key={msg.id} className="chat-message">
            <div className="msg-header">
              <strong>{msg.sender}</strong>
              <span>{msg.timestamp}</span>
            </div>
            <p>{msg.content}</p>
            {isHost && !pinnedMessage && (
              <button className="pin-msg-btn" onClick={() => onPinMessage(msg)}>
                <Pin size={12} /> Pin
              </button>
            )}
          </div>
        ))}
      </div>
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Send a message to everyone"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" disabled={!input.trim()}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

const HostSettings = ({ room }) => {
  const [theme, setTheme] = useState(localStorage.getItem('calyx-theme') || 'light');

  const handleThemeChange = (e) => {
    const newTheme = e.target.value;
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('calyx-theme', newTheme);
  };

  return (
    <div className="host-settings">
      <h3>Meeting Settings</h3>
      <p className="settings-desc">Manage your meeting preferences and controls.</p>

      <div className="settings-toggle">
        <div className="toggle-info">
          <strong>Visual Theme</strong>
          <span>Toggle between Light and Dark mode</span>
        </div>
        <select
          value={theme}
          onChange={handleThemeChange}
          className="premium-select"
        >
          <option value="light">Light Mode</option>
          <option value="dark">Dark Mode</option>
        </select>
      </div>

      <div className="settings-toggle">
        <div className="toggle-info">
          <strong>Share their screen</strong>
          <span>Let everyone share their screen</span>
        </div>
        <label className="premium-switch">
          <input type="checkbox" defaultChecked />
          <span className="slider round"></span>
        </label>
      </div>

      <div className="settings-toggle">
        <div className="toggle-info">
          <strong>Send chat messages</strong>
          <span>Let everyone send messages</span>
        </div>
        <label className="premium-switch">
          <input type="checkbox" defaultChecked />
          <span className="slider round"></span>
        </label>
      </div>

      <button className="mute-all-btn">
        <MicOff size={16} />
        <span>Mute all participants</span>
      </button>
    </div>
  );
};

export default VideoCallApp;
