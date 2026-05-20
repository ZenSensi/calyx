import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Video, Home, Clock, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react';
import './MeetingOver.css';

const MeetingOver = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [countdown, setCountdown] = useState(60);
  const [feedback, setFeedback] = useState(null); // 'good' | 'poor' | null

  // Retrieve room name via location state or localStorage fallback to enable flawless rejoining
  const roomName = location.state?.roomName || localStorage.getItem('last-room-name') || '';

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [navigate]);

  const handleRejoin = () => {
    if (roomName) {
      // Find the last participant name or fall back to currentUser display name
      const lastParticipantName = localStorage.getItem('last-participant-name') || 'Guest';
      navigate(`/room/${roomName}?name=${encodeURIComponent(lastParticipantName)}`);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="meeting-over-v2">
      <div className="over-wrapper">
        <div className="over-content">
          <div className="over-logo">
            <Video size={26} color="var(--primary-indigo)" fill="rgba(99, 102, 241, 0.2)" />
            <span className="logo-text">Calyx <span className="logo-subtext">Meet</span></span>
          </div>

          <h1 className="over-title">You left the meeting</h1>
          
          <div className="over-actions">
            <button className="btn-premium" onClick={handleRejoin}>
              <RefreshCw size={18} />
              Rejoin meeting
            </button>
            <button className="btn-glass" onClick={() => navigate('/')}>
              <Home size={18} />
              Return to home screen
            </button>
          </div>

          <div className="over-feedback">
            <p>How was the audio and video?</p>
            <div className="feedback-icons">
              <button 
                className={`feedback-btn ${feedback === 'good' ? 'active-good' : ''}`} 
                title="Good"
                onClick={() => setFeedback(feedback === 'good' ? null : 'good')}
              >
                <ThumbsUp size={20} />
              </button>
              <button 
                className={`feedback-btn ${feedback === 'poor' ? 'active-poor' : ''}`} 
                title="Poor"
                onClick={() => setFeedback(feedback === 'poor' ? null : 'poor')}
              >
                <ThumbsDown size={20} />
              </button>
            </div>
            
            {feedback && (
              <div className="feedback-thanks-msg fade-in" style={{
                marginTop: '20px',
                fontSize: '13px',
                color: 'var(--accent-teal)',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                animation: 'scaleUp 0.3s ease'
              }}>
                <span>✨ Thank you! Your feedback helps us improve Calyx Meet.</span>
              </div>
            )}
          </div>
        </div>

        <div className="over-footer">
          <div className="redirect-status">
            <Clock size={15} />
            <span>Returning to home screen in {countdown} seconds</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingOver;

