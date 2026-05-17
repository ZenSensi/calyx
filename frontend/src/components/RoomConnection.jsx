import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Plus, Calendar, LogOut, Link, Keyboard, MoreVertical, Settings, HelpCircle, MessageSquare } from 'lucide-react';
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
      navigate(`/room/${roomName}?name=${encodeURIComponent(participantName)}`);
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
            <button className="nav-icon-btn"><HelpCircle size={20} /></button>
            <button className="nav-icon-btn"><MessageSquare size={20} /></button>
            <button className="nav-icon-btn"><Settings size={20} /></button>
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
                  <div className="modern-dropdown">
                    <button className="dropdown-item btn-ghost" onClick={handleInstantMeeting}>
                      <Plus size={18} />
                      <span>Instant Meeting</span>
                    </button>
                    <button className="dropdown-item btn-ghost">
                      <Calendar size={18} />
                      <span>Schedule Meeting</span>
                    </button>
                    <button className="dropdown-item btn-ghost">
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
                    placeholder="Enter code" 
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
    </div>
  );
};

export default RoomConnection;
