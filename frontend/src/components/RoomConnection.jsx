import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Plus, Calendar, LogOut, Link, Keyboard, MoreVertical, Settings, HelpCircle, MessageSquare, X, Check, Copy, ChevronDown, ChevronUp, Bell, Globe, Shield, Zap } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
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
  const [laterLink, setLaterLink] = useState('');
  const [settingsData, setSettingsData] = useState({ displayName: '', quality: '1080p', theme: 'dark' });
  const [faqOpenIndex, setFaqOpenIndex] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

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
    setScheduledLink(link);
    setCopiedLink(false);
    showToast('Meeting successfully scheduled!');
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    if (settingsData.displayName.trim()) {
      setParticipantName(settingsData.displayName);
    }
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
              <Video size={24} color="#fff" fill="var(--primary-indigo)" />
            </div>
            <span className="logo-text">Calyx <span className="logo-accent">Meet</span></span>
          </div>
        </div>
        <div className="nav-right">
          <div className="nav-time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</div>
          <div className="nav-icons">
            <button className="nav-icon-btn" onClick={() => { setShowHelpModal(true); setFaqOpenIndex(null); }} title="Help & FAQ">
              <HelpCircle size={20} />
            </button>
            <button className="nav-icon-btn" onClick={() => setShowNotificationsModal(true)} title="What's New">
              <MessageSquare size={20} />
            </button>
            <button className="nav-icon-btn" onClick={() => {
              setSettingsData({ displayName: participantName, quality: '1080p', theme: 'dark' });
              setShowSettingsModal(true);
            }} title="Preferences">
              <Settings size={20} />
            </button>
          </div>
          <div className="user-section" title={currentUser?.email}>
            <button className="logout-btn" onClick={handleLogout} title="Sign Out">
              <LogOut size={18} />
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

      {/* Hero Content */}
      <main className="calyx-hero">
        <div className="hero-content">
          <div className="hero-badge">Next Generation Video Calls</div>
          <h1 className="hero-title">
            Connect Beyond <br />
            <span className="gradient-text">Boundaries</span>
          </h1>
          <p className="hero-subtitle">
            Calyx Meet combines high-fidelity video with deep privacy and premium design.
          </p>

          <div className="hero-cta-card glass-panel">
            <div className="cta-row">
              <div className="new-meeting-container" ref={dropdownRef}>
                <button 
                  className="btn-premium" 
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  <Video size={20} />
                  <span>Start a Meeting</span>
                </button>
                
                {showDropdown && (
                  <div className="modern-dropdown animate-fade-in">
                    <button className="dropdown-item btn-ghost" onClick={handleInstantMeeting}>
                      <Plus size={18} />
                      <span>Instant Meeting</span>
                    </button>
                    <button className="dropdown-item btn-ghost" onClick={() => {
                      setScheduleData({ title: '', date: '', time: '', duration: '30m' });
                      setScheduledLink('');
                      setShowScheduleModal(true);
                      setShowDropdown(false);
                    }}>
                      <Calendar size={18} />
                      <span>Schedule Meeting</span>
                    </button>
                    <button className="dropdown-item btn-ghost" onClick={() => {
                      generateLaterLink();
                      setShowDropdown(false);
                    }}>
                      <Link size={18} />
                      <span>Get Link for Later</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="cta-divider">or</div>

              <form className="join-input-group" onSubmit={handleJoinSubmit}>
                <div className="modern-input">
                  <Keyboard size={18} />
                  <input 
                    type="text" 
                    placeholder="Enter code or link" 
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                  />
                </div>
                <button 
                  type="submit" 
                  className="btn-glass"
                  disabled={!roomName}
                  style={{ opacity: roomName ? 1 : 0.5 }}
                >
                  Join
                </button>
              </form>
            </div>
          </div>

          <div className="hero-stats">
            <div className="stat-item">
              <strong>4K</strong>
              <span>Ultra HD Support</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <strong>256-bit</strong>
              <span>E2E Encryption</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <strong>Free</strong>
              <span>For Everyone</span>
            </div>
          </div>
        </div>
        
        {/* Abstract Background Elements */}
        <div className="hero-glow-1"></div>
        <div className="hero-glow-2"></div>
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
                  
                  <button className="btn-glass" style={{ width: '100%', marginTop: '16px' }} onClick={() => setShowScheduleModal(false)}>
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
                  <label>Visual Interface Accent</label>
                  <select 
                    value={settingsData.theme}
                    onChange={(e) => setSettingsData({ ...settingsData, theme: e.target.value })}
                  >
                    <option value="dark">Vibrant Cyber Dark Theme</option>
                    <option value="light">Classic Clean Slate</option>
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
    </div>
  );
};

export default RoomConnection;

