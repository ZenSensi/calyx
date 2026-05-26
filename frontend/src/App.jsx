import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import RoomConnection from './components/RoomConnection';
import VideoCallApp from './components/VideoCallApp';
import MeetingOver from './components/MeetingOver';
import PrivacyPolicy from './components/PrivacyPolicy';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/Login';
import Register from './components/Register';
import '@livekit/components-styles';
import './index.css';

// ProtectedRoute wrapper component
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-screen" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div className="spinner"></div>
      </div>
    );
  }
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Redirect to home if already logged in
const PublicOnlyRoute = ({ children }) => {
  const { currentUser } = useAuth();
  
  if (currentUser) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('calyx-theme') || 'light';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="bg-tech-grid" />
        <div className="bg-tech-glows">
          <div className="glow-blob glow-blob-indigo" />
          <div className="glow-blob glow-blob-teal" />
          <div className="glow-blob glow-blob-purple" />
        </div>
        <Router>
          <Routes>
            <Route path="/login" element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            } />
            <Route path="/register" element={
              <PublicOnlyRoute>
                <Register />
              </PublicOnlyRoute>
            } />
            <Route path="/" element={<RoomConnection />} />
            <Route path="/room/:roomName" element={<VideoCallApp />} />
            <Route path="/meeting-over" element={<MeetingOver />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
