import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Home, Clock, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react';
import './MeetingOver.css';

const MeetingOver = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(60);
  const [feedback, setFeedback] = useState(null); // 'good' | 'poor' | null

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

  return (
    <div className="meeting-over-v2">
      <div className="over-content shadow-sm">
        <div className="over-logo">
          <Video size={28} color="#1a73e8" fill="#1a73e8" />
          <span className="logo-text">Calyx <span className="logo-subtext">Meet</span></span>
        </div>

        <h1 className="over-title">You left the meeting</h1>
        
        <div className="over-actions">
          <button className="btn-premium" onClick={() => window.history.back()}>
            <RefreshCw size={18} />
            Rejoin
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
              <ThumbsUp size={22} />
            </button>
            <button 
              className={`feedback-btn ${feedback === 'poor' ? 'active-poor' : ''}`} 
              title="Poor"
              onClick={() => setFeedback(feedback === 'poor' ? null : 'poor')}
            >
              <ThumbsDown size={22} />
            </button>
          </div>
        </div>
      </div>

      <div className="over-footer">
        <div className="redirect-status">
          <Clock size={16} />
          <span>Returning to home screen in {countdown} seconds</span>
        </div>
      </div>
    </div>
  );
};

export default MeetingOver;
