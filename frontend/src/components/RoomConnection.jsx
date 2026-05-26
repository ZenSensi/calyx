import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Plus, Calendar, LogOut, Link, Keyboard, MoreVertical, Settings, HelpCircle, MessageSquare, X, Check, Copy, ChevronDown, ChevronUp, Bell, Globe, Shield, Zap, Sparkles, Mic, MicOff, VideoOff, Monitor, ShieldAlert, Layers, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './ui/interfaces-dropdown-menu';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Footer from './Footer';
import './RoomConnection.css';

const RoomConnection = () => {
  const { currentUser } = useAuth();
  const [roomName, setRoomName] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Modals States
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showGetLinkModal, setShowGetLinkModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  // Form & Action states
  const [scheduleData, setScheduleData] = useState({ title: '', date: '', time: '', duration: '30m' });
  const [scheduledLink, setScheduledLink] = useState('');
  const [googleCalLink, setGoogleCalLink] = useState('');
  const [scheduledMeetings, setScheduledMeetings] = useState(() => {
    try {
      const saved = localStorage.getItem('calyx-scheduled-meetings');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [laterLink, setLaterLink] = useState('');
  const [settingsData, setSettingsData] = useState({ displayName: '', quality: '1080p', theme: localStorage.getItem('calyx-theme') || 'light' });
  const [faqOpenIndex, setFaqOpenIndex] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Camera & Microphone preview states
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [cameraDevices, setCameraDevices] = useState([]);
  const [micDevices, setMicDevices] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMic, setSelectedMic] = useState('');
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const video = devices.filter(d => d.kind === 'videoinput');
        const audio = devices.filter(d => d.kind === 'audioinput');
        setCameraDevices(video);
        setMicDevices(audio);
        if (video.length > 0) setSelectedCamera(video[0].deviceId);
        if (audio.length > 0) setSelectedMic(audio[0].deviceId);
      } catch (err) {
        console.warn('Could not enumerate devices:', err);
      }
    };
    getDevices();
  }, []);

  // Manage Video Stream Lifecycle & Ref Assignment Reactively
  useEffect(() => {
    let active = true;

    const startCamera = async () => {
      // If camera is toggled OFF, stop tracks and clean up
      if (!isCameraOn) {
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop());
          localStreamRef.current = null;
        }
        return;
      }

      // If camera is toggled ON, request stream
      try {
        // Stop any existing tracks first
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: selectedCamera ? { deviceId: selectedCamera } : true,
          audio: false
        });

        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        localStreamRef.current = stream;
        
        // Wait a microtask to make sure React has mounted the <video> element
        setTimeout(() => {
          if (localVideoRef.current && stream) {
            localVideoRef.current.srcObject = stream;
          }
        }, 80);

      } catch (err) {
        console.error('Error starting video preview:', err);
        setIsCameraOn(false);
        showToast('Camera access denied or hardware busy.');
      }
    };

    startCamera();

    return () => {
      active = false;
    };
  }, [isCameraOn, selectedCamera]);

  const toggleCamera = () => {
    setIsCameraOn(prev => !prev);
  };

  const toggleMic = () => {
    setIsMicOn(!isMicOn);
    showToast(isMicOn ? 'Microphone muted' : 'Microphone active');
  };

  // Clean up streams on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (currentUser?.displayName) {
      setParticipantName(currentUser.displayName);
    } else if (currentUser?.email) {
      setParticipantName(currentUser.email.split('@')[0]);
    } else {
      setParticipantName('Guest');
    }
  }, [currentUser]);

  // Handle clicking outside of dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInstantMeeting = () => {
    const randomRoomId = Math.random().toString(36).substring(2, 11);
    localStorage.setItem('last-room-name', randomRoomId);
    localStorage.setItem('last-participant-name', participantName);
    navigate(`/room/${randomRoomId}?name=${encodeURIComponent(participantName)}&isHost=true`);
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (roomName) {
      // Normalize roomName/room URL
      let code = roomName;
      if (roomName.includes('/room/')) {
        code = roomName.split('/room/')[1]?.split('?')[0] || roomName;
      }
      localStorage.setItem('last-room-name', code);
      localStorage.setItem('last-participant-name', participantName);
      navigate(`/room/${code}?name=${encodeURIComponent(participantName)}`);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (err) {
      console.error('Failed to log out', err);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  const generateLaterLink = () => {
    const randomId = Math.random().toString(36).substring(2, 11);
    const link = `${window.location.origin}/room/${randomId}`;
    setLaterLink(link);
    setCopiedLink(false);
    setShowGetLinkModal(true);
  };

  const handleCreateSchedule = (e) => {
    e.preventDefault();
    const randomId = Math.random().toString(36).substring(2, 11);
    const link = `${window.location.origin}/room/${randomId}`;
    
    // Parse start date & calculate end date
    const localDateTime = new Date(`${scheduleData.date}T${scheduleData.time}`);
    const formatGoogleDate = (date) => {
      try {
        return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      } catch (err) {
        return new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      }
    };
    
    let endDateTime = new Date(localDateTime);
    if (scheduleData.duration === '15m') {
      endDateTime.setMinutes(endDateTime.getMinutes() + 15);
    } else if (scheduleData.duration === '30m') {
      endDateTime.setMinutes(endDateTime.getMinutes() + 30);
    } else if (scheduleData.duration === '1h') {
      endDateTime.setHours(endDateTime.getHours() + 1);
    } else {
      endDateTime.setHours(endDateTime.getHours() + 2); // Default 2 hours for unlimited
    }
    
    const datesStr = `${formatGoogleDate(localDateTime)}/${formatGoogleDate(endDateTime)}`;
    const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Calyx Meet: ' + scheduleData.title)}&dates=${datesStr}&details=${encodeURIComponent('Join secure video room: ' + link)}&location=${encodeURIComponent(link)}`;
    
    setScheduledLink(link);
    setGoogleCalLink(gCalUrl);
    setCopiedLink(false);
    
    // Append to scheduled list
    const newMeeting = {
      id: randomId,
      title: scheduleData.title || 'Calyx Sync',
      date: scheduleData.date,
      time: scheduleData.time,
      duration: scheduleData.duration,
      link: link,
      gCalUrl: gCalUrl
    };
    
    const updated = [newMeeting, ...scheduledMeetings];
    setScheduledMeetings(updated);
    localStorage.setItem('calyx-scheduled-meetings', JSON.stringify(updated));
    
    showToast('Meeting successfully scheduled!');
  };

  const handleDeleteMeeting = (id) => {
    const updated = scheduledMeetings.filter(m => m.id !== id);
    setScheduledMeetings(updated);
    localStorage.setItem('calyx-scheduled-meetings', JSON.stringify(updated));
    showToast('Meeting removed.');
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    if (settingsData.displayName.trim()) {
      setParticipantName(settingsData.displayName);
    }
    
    // Apply Theme
    if (settingsData.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('calyx-theme', settingsData.theme);

    showToast('Preferences updated successfully!');
    setShowSettingsModal(false);
  };

  const handleCopyLink = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    showToast('Link copied to clipboard!');
  };

  const toggleFaq = (index) => {
    setFaqOpenIndex(faqOpenIndex === index ? null : index);
  };

  const faqData = [
    {
      q: "How do I start a meeting?",
      a: "Simply click the 'Start a Meeting' button. You can launch an 'Instant Meeting' to start talking right away, 'Schedule Meeting' to plan a future calendar invite, or choose 'Get Link for Later' to save a custom meeting room."
    },
    {
      q: "Is Calyx Meet secure?",
      a: "Yes. Calyx Meet supports full secure peer-to-peer audio & video media streams. In rooms with multiple users, we deploy dedicated secure routing layers ensuring all sessions remain confidential and fully compliant."
    },
    {
      q: "Are meetings completely free?",
      a: "Absolutely! Calyx Meet provides high-definition audio, video, real-time whiteboards, active chat, and presentations for free. There are no durations or participant count limits."
    },
    {
      q: "Can I join from a mobile phone?",
      a: "Yes, Calyx Meet is fully mobile responsive! The layouts adapt automatically to match mobile and tablet viewports. Just click any invite link or enter a room code in your mobile browser to join immediately."
    }
  ];

  return (
    <div className="meet-landing">
      {/* Top Navigation Bar */}
      <nav className="meet-nav">
        <div className="nav-left">
          <div className="calyx-logo">
            <div className="logo-icon-wrap">
              <Video size={20} color="#fff" fill="var(--primary-indigo)" />
            </div>
            <span className="logo-text">Calyx <span className="logo-accent">Meet</span></span>
          </div>
        </div>
        <div className="nav-right">
          <div className="nav-time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</div>
          <div className="nav-icons">
            <button className="nav-icon-btn" onClick={() => { setShowHelpModal(true); setFaqOpenIndex(null); }} title="Help & FAQ">
              <HelpCircle size={18} />
            </button>
            <button className="nav-icon-btn" onClick={() => setShowNotificationsModal(true)} title="What's New">
              <MessageSquare size={18} />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="nav-icon-btn" title="Preferences">
                  <Settings size={18} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" style={{ background: 'var(--bg-panel)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 100, minWidth: '200px' }}>
                <DropdownMenuLabel style={{ padding: '8px 12px', fontSize: '14px', fontWeight: 'bold' }}>Preferences</DropdownMenuLabel>
                <DropdownMenuSeparator style={{ background: 'var(--border-color)', height: '1px', margin: '4px 0' }} />
                
                <DropdownMenuItem 
                  style={{ padding: '8px 12px', fontSize: '14px', cursor: 'pointer' }}
                  onClick={() => {
                    setSettingsData({ displayName: participantName, quality: '1080p', theme: localStorage.getItem('calyx-theme') || 'light' });
                    setShowSettingsModal(true);
                  }}
                >
                  General Settings
                </DropdownMenuItem>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger style={{ padding: '8px 12px', fontSize: '14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Theme
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent style={{ background: 'var(--bg-panel)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', minWidth: '150px' }}>
                    <DropdownMenuItem 
                      style={{ padding: '8px 12px', fontSize: '14px', cursor: 'pointer' }}
                      onClick={() => {
                        document.documentElement.classList.remove('dark');
                        localStorage.setItem('calyx-theme', 'light');
                      }}
                    >
                      Light Mode
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      style={{ padding: '8px 12px', fontSize: '14px', cursor: 'pointer' }}
                      onClick={() => {
                        document.documentElement.classList.add('dark');
                        localStorage.setItem('calyx-theme', 'dark');
                      }}
                    >
                      Dark Mode
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="user-section" title={currentUser?.email}>
            <button className="logout-btn" onClick={handleLogout} title="Sign Out">
              <LogOut size={16} />
            </button>
            <div className="user-avatar-small">
              {currentUser?.photoURL 
                ? <img src={currentUser.photoURL} alt="User" />
                : participantName.charAt(0).toUpperCase()
              }
            </div>
          </div>
        </div>
      </nav>

      <main className="calyx-hero">
        <div className="hero-split-container">
          {/* Left Column: Actions and Text */}
          <div className="hero-content-left fade-in">
            <div className="hero-badge">
              <Shield className="badge-icon" size={13} color="var(--primary-indigo)" />
              <span>Enterprise-Grade Security • AES-256 Encrypted</span>
            </div>
            
            <h1 className="hero-title">
              Secure, high-fidelity <br />
              video calls.
            </h1>
            
            <p className="hero-subtitle">
              Calyx Meet delivers zero-latency peer connection audio and video, dynamic shared canvas sketchpads, and robust host security controls — built entirely on open WebRTC standards.
            </p>

            <div className="unified-cta-bar glass-panel">
              <div className="new-meeting-container" ref={dropdownRef}>
                <button 
                  className="btn-premium" 
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  <Video size={18} />
                  <span>Start meeting</span>
                  <ChevronDown size={14} style={{ marginLeft: '4px', opacity: 0.8 }} />
                </button>
                
                {showDropdown && (
                  <div className="modern-dropdown animate-fade-in">
                    <button className="dropdown-item btn-ghost" onClick={handleInstantMeeting}>
                      <Plus size={16} />
                      <span>Instant Meeting</span>
                    </button>
                    <button className="dropdown-item btn-ghost" onClick={() => {
                      setScheduleData({ title: '', date: '', time: '', duration: '30m' });
                      setScheduledLink('');
                      setShowScheduleModal(true);
                      setShowDropdown(false);
                    }}>
                      <Calendar size={16} />
                      <span>Schedule Meeting</span>
                    </button>
                    <button className="dropdown-item btn-ghost" onClick={() => {
                      generateLaterLink();
                      setShowDropdown(false);
                    }}>
                      <Link size={16} />
                      <span>Get Link for Later</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="cta-v-divider"></div>

              <form className="join-input-group" onSubmit={handleJoinSubmit}>
                <div className="modern-input">
                  <Keyboard size={16} />
                  <input 
                    type="text" 
                    placeholder="Enter code or link" 
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                  />
                </div>
                <button 
                  type="submit" 
                  className={`btn-join ${roomName ? 'active' : ''}`}
                  disabled={!roomName}
                >
                  Join
                </button>
              </form>
            </div>

            <div className="hero-stats">
              <div className="stat-item">
                <strong>4K UHD</strong>
                <span>Ultra HD Resolution</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <strong>AES-256</strong>
                <span>P2P Encryption</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <strong>FREE</strong>
                <span>Unlimited Duration</span>
              </div>
            </div>

            {/* Recreated scheduled meetings landing page layout */}
            <div className="scheduled-meetings-container">
              <div className="scheduled-header">
                <div className="header-title-wrap">
                  <Calendar size={15} color="var(--primary-indigo)" />
                  <h3>Upcoming Scheduled Meetings</h3>
                  {scheduledMeetings.length > 0 && (
                    <span className="scheduled-count-badge">{scheduledMeetings.length}</span>
                  )}
                </div>
              </div>

              {scheduledMeetings.length === 0 ? (
                <div className="scheduled-empty-card">
                  <p>No upcoming meetings scheduled. Click "Start meeting" to plan a calendar invite.</p>
                </div>
              ) : (
                <div className="scheduled-list">
                  {scheduledMeetings.map((meeting) => (
                    <div key={meeting.id} className="scheduled-meeting-card glass-panel">
                      <div className="meeting-card-info">
                        <h4 className="meeting-card-title">{meeting.title}</h4>
                        <div className="meeting-card-meta">
                          <span>{meeting.date} • {meeting.time} ({meeting.duration})</span>
                        </div>
                      </div>
                      <div className="meeting-card-actions">
                        <a 
                          href={meeting.gCalUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="meeting-action-icon-btn google-cal-btn" 
                          title="Add to Google Calendar"
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14" className="gcal-svg-icon" fill="currentColor">
                            <path fill="#4285F4" d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                          </svg>
                        </a>
                        <button 
                          className="meeting-action-icon-btn" 
                          onClick={() => handleCopyLink(meeting.link)}
                          title="Copy Invitation Link"
                        >
                          <Copy size={13} />
                        </button>
                        <button 
                          className="meeting-action-icon-btn delete-btn" 
                          onClick={() => handleDeleteMeeting(meeting.id)}
                          title="Delete Schedule"
                        >
                          <Trash2 size={13} />
                        </button>
                        <button 
                          className="btn-join-scheduled" 
                          onClick={() => navigate(`/room/${meeting.id}?name=${encodeURIComponent(participantName)}`)}
                        >
                          Join
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: High-fidelity Local Device and Lobby Camera Setup Console */}
          <div className="hero-content-right scale-up">
            <div className="lobby-setup-panel glass-panel">
              <div className="lobby-setup-header">
                <h4>
                  <span className="lobby-setup-dot"></span>
                  <span>Lobby Device Preview</span>
                </h4>
                <div className="webrtc-badge">
                  <Globe size={12} color="var(--accent-teal)" style={{ flexShrink: 0 }} />
                  <span>WebRTC Protected</span>
                </div>
              </div>
              
              <div className="lobby-setup-screen">
                {isCameraOn ? (
                  <video 
                    ref={localVideoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="local-preview-video"
                  />
                ) : (
                  <div className="lobby-setup-avatar-wrap">
                    <div className="lobby-setup-avatar">
                      {currentUser?.photoURL 
                        ? <img src={currentUser.photoURL} alt="User" />
                        : participantName.charAt(0).toUpperCase()
                      }
                    </div>
                    <div className="lobby-setup-avatar-glow"></div>
                  </div>
                )}
                
                {/* Audio level meter animation showing microphone active state */}
                {isMicOn && (
                  <div className="lobby-audio-waveform">
                    <div className="wave-bar-live"></div>
                    <div className="wave-bar-live"></div>
                    <div className="wave-bar-live"></div>
                    <div className="wave-bar-live"></div>
                    <div className="wave-bar-live"></div>
                  </div>
                )}

                {/* Overlaid hardware toggles */}
                <div className="lobby-setup-actions">
                  <button 
                    onClick={toggleMic} 
                    className={`setup-action-btn ${isMicOn ? 'active' : 'muted'}`}
                    title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
                    type="button"
                  >
                    {isMicOn ? <Mic size={15} /> : <MicOff size={15} />}
                  </button>
                  <button 
                    onClick={toggleCamera} 
                    className={`setup-action-btn ${isCameraOn ? 'active' : 'muted'}`}
                    title={isCameraOn ? 'Stop Camera' : 'Start Camera'}
                    type="button"
                  >
                    {isCameraOn ? <Video size={15} /> : <VideoOff size={15} />}
                  </button>
                </div>
              </div>

              {/* Hardware selectors config drawer */}
              <div className="lobby-device-selectors">
                <div className="selector-group">
                  <label>Camera Video Input</label>
                  <select 
                    value={selectedCamera} 
                    onChange={(e) => setSelectedCamera(e.target.value)}
                    disabled={isCameraOn}
                  >
                    {cameraDevices.length > 0 ? (
                      cameraDevices.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${cameraDevices.indexOf(d) + 1}`}</option>
                      ))
                    ) : (
                      <option value="">Default Integrated Camera</option>
                    )}
                  </select>
                </div>

                <div className="selector-group">
                  <label>Microphone Audio Input</label>
                  <select 
                    value={selectedMic} 
                    onChange={(e) => setSelectedMic(e.target.value)}
                  >
                    {micDevices.length > 0 ? (
                      micDevices.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${micDevices.indexOf(d) + 1}`}</option>
                      ))
                    ) : (
                      <option value="">Default System Microphone</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="lobby-setup-footer">
                <p>Ensure your camera and microphone operate correctly before joining.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── SCHEDULE MEETING MODAL ── */}
      {showScheduleModal && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowScheduleModal(false)}>
          <div className="modal-content glass-panel animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title gradient-text">Schedule a Meeting</h3>
              <button className="modal-close-btn" onClick={() => setShowScheduleModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              {!scheduledLink ? (
                <form onSubmit={handleCreateSchedule} className="modal-form">
                  <div className="form-group">
                    <label>Meeting Title</label>
                    <input 
                      type="text" 
                      placeholder="Calyx Design Sync" 
                      value={scheduleData.title}
                      onChange={(e) => setScheduleData({ ...scheduleData, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Date</label>
                      <input 
                        type="date" 
                        value={scheduleData.date}
                        onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Time</label>
                      <input 
                        type="time" 
                        value={scheduleData.time}
                        onChange={(e) => setScheduleData({ ...scheduleData, time: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Duration</label>
                    <select 
                      value={scheduleData.duration}
                      onChange={(e) => setScheduleData({ ...scheduleData, duration: e.target.value })}
                    >
                      <option value="15m">15 Minutes</option>
                      <option value="30m">30 Minutes</option>
                      <option value="1h">1 Hour</option>
                      <option value="unlimited">Unlimited</option>
                    </select>
                  </div>
                  <button type="submit" className="btn-premium" style={{ width: '100%', marginTop: '12px' }}>
                    <Calendar size={18} />
                    <span>Generate Invitation</span>
                  </button>
                </form>
              ) : (
                <div className="schedule-success">
                  <div className="success-icon-wrap">
                    <Check size={28} color="var(--accent-teal)" />
                  </div>
                  <h4>Meeting Scheduled Successfully!</h4>
                  <p>Share the link below with your participants to join the scheduled room.</p>
                  
                  <div className="copy-link-box">
                    <input type="text" readOnly value={scheduledLink} />
                    <button className="btn-premium icon-only" onClick={() => handleCopyLink(scheduledLink)}>
                      {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                  
                  {googleCalLink && (
                    <a 
                      href={googleCalLink} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn-premium" 
                      style={{ width: '100%', marginTop: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
                    >
                      <Calendar size={16} />
                      <span>Add to Google Calendar</span>
                    </a>
                  )}
                  
                  <button className="btn-glass" style={{ width: '100%', marginTop: '12px' }} onClick={() => setShowScheduleModal(false)}>
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── GET LINK FOR LATER MODAL ── */}
      {showGetLinkModal && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowGetLinkModal(false)}>
          <div className="modal-content glass-panel animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title gradient-text">Get Link for Later</h3>
              <button className="modal-close-btn" onClick={() => setShowGetLinkModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-description">
                Here is your unique meeting room link. Copy and save it to launch your video call at any time.
              </p>
              
              <div className="copy-link-box">
                <input type="text" readOnly value={laterLink} />
                <button className="btn-premium icon-only" onClick={() => handleCopyLink(laterLink)}>
                  {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>

              <div className="modal-tips">
                <div className="tip-item">
                  <Shield size={16} color="var(--primary-indigo)" />
                  <span>Only people with this link can request to join.</span>
                </div>
              </div>

              <button className="btn-glass" style={{ width: '100%', marginTop: '24px' }} onClick={() => setShowGetLinkModal(false)}>
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PREFERENCES / SETTINGS MODAL ── */}
      {showSettingsModal && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-content glass-panel animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title gradient-text">System Preferences</h3>
              <button className="modal-close-btn" onClick={() => setShowSettingsModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSaveSettings} className="modal-form">
                <div className="form-group">
                  <label>Your Display Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter your name" 
                    value={settingsData.displayName}
                    onChange={(e) => setSettingsData({ ...settingsData, displayName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Video & Audio Quality</label>
                  <select 
                    value={settingsData.quality}
                    onChange={(e) => setSettingsData({ ...settingsData, quality: e.target.value })}
                  >
                    <option value="4k">Ultra HD (4K • High Bandwidth)</option>
                    <option value="1080p">Full HD (1080p • Recommended)</option>
                    <option value="720p">Standard HD (720p • Balanced)</option>
                    <option value="low">Standard Definition (360p • Data Saver)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Visual Interface Theme</label>
                  <select 
                    value={settingsData.theme}
                    onChange={(e) => setSettingsData({ ...settingsData, theme: e.target.value })}
                  >
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                  </select>
                </div>
                <div className="modal-tips">
                  <div className="tip-item">
                    <Zap size={16} color="var(--primary-indigo)" />
                    <span>Hardware acceleration is active for premium rendering.</span>
                  </div>
                </div>
                <button type="submit" className="btn-premium" style={{ width: '100%', marginTop: '16px' }}>
                  Save Preferences
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── HELP / FAQ MODAL ── */}
      {showHelpModal && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowHelpModal(false)}>
          <div className="modal-content glass-panel animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title gradient-text">Help & FAQ Center</h3>
              <button className="modal-close-btn" onClick={() => setShowHelpModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body faq-body">
              <div className="faq-list">
                {faqData.map((faq, index) => (
                  <div key={index} className={`faq-item ${faqOpenIndex === index ? 'active' : ''}`}>
                    <button className="faq-question" onClick={() => toggleFaq(index)}>
                      <span>{faq.q}</span>
                      {faqOpenIndex === index ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {faqOpenIndex === index && (
                      <div className="faq-answer animate-fade-in">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="modal-tips" style={{ marginTop: '24px' }}>
                <div className="tip-item">
                  <Globe size={16} color="var(--primary-indigo)" />
                  <span>Supports WebRTC standard encryption across global servers.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NOTIFICATIONS / UPDATES PANEL ── */}
      {showNotificationsModal && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowNotificationsModal(false)}>
          <div className="modal-content glass-panel animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title gradient-text">What's New in Calyx</h3>
              <button className="modal-close-btn" onClick={() => setShowNotificationsModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="notifications-list">
                <div className="notif-card">
                  <div className="notif-header">
                    <div className="notif-badge">Release v2.1.0</div>
                    <span className="notif-time">Just Now</span>
                  </div>
                  <h5>Dynamic Canvas Whiteboard & Custom Activities</h5>
                  <p>Introducing the premium activities suite inside meetings! Access custom canvas sketchpads, whiteboard markers, real-time shared tools, and responsive host settings panels.</p>
                </div>

                <div className="notif-card">
                  <div className="notif-header">
                    <div className="notif-badge">Update v2.0.4</div>
                    <span className="notif-time">2 days ago</span>
                  </div>
                  <h5>Camera Stabilizations & Mobile view scaling</h5>
                  <p>Resolved hardware shutter conflicts between the lobby connection room and active call. Implemented robust Google redirect auth fallback support for browser restrictions.</p>
                </div>

                <div className="notif-card">
                  <div className="notif-header">
                    <div className="notif-badge">Security</div>
                    <span className="notif-time">1 week ago</span>
                  </div>
                  <h5>AES 256-bit Media Tunneling Active</h5>
                  <p>Peer audio/video streaming security audited. Seamless fallback routes optimized for firewalled networks using coturn TURN/STUN relays.</p>
                </div>
              </div>

              <button className="btn-premium" style={{ width: '100%', marginTop: '20px' }} onClick={() => setShowNotificationsModal(false)}>
                Awesome
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST NOTIFICATION FEEDBACK ── */}
      {toastMessage && (
        <div className="toast-notification glass-panel animate-slide-in">
          <Bell size={16} color="var(--accent-teal)" />
          <span>{toastMessage}</span>
        </div>
      )}
      <Footer />
    </div>
  );
};

export default RoomConnection;

