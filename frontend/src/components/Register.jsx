import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Mail, Video } from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import './Auth.css';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, {
        displayName: name
      });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to create an account.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/');
    } catch (err) {
      console.error('Google popup sign-up error:', err);
      // Fallback for pop-up blockers or COOP restrictions
      if (
        err.code === 'auth/popup-blocked' ||
        err.code === 'auth/popup-closed-by-user' ||
        err.code === 'auth/cross-origin-opener-policy-blocked' ||
        err.message?.includes('popup') ||
        err.message?.includes('Cross-Origin-Opener-Policy')
      ) {
        try {
          setError('Popup blocked or blocked by browser settings. Redirecting to Google...');
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectErr) {
          setError('Failed to redirect for Google Sign-in: ' + redirectErr.message);
          console.error(redirectErr);
          setIsLoading(false);
        }
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Google Login Error: This domain is not authorized. Please add this URL to the Authorized Domains list in your Firebase Authentication settings.');
        setIsLoading(false);
      } else {
        setError(err.message || 'Failed to sign up with Google.');
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-icon">
              <Video size={26} color="var(--primary-indigo)" fill="rgba(99, 102, 241, 0.2)" />
            </div>
            <h1>Create your account</h1>
            <p>Join Calyx Meet for free</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button
            onClick={handleGoogleSignIn}
            className="google-btn"
            disabled={isLoading}
          >
            <GoogleIcon /> Sign up with Google
          </button>

          <div className="auth-divider">
            <span>or</span>
          </div>

          {!showEmailAuth ? (
            <button
              onClick={() => setShowEmailAuth(true)}
              className="email-btn"
            >
              <Mail size={18} /> Sign up with email
            </button>
          ) : (
            <form onSubmit={handleRegister} className="auth-form fade-in">
              <div className="form-group">
                <label htmlFor="name">Full name</label>
                <input
                  type="text"
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email address</label>
                <input
                  type="email"
                  id="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <button type="submit" className="btn-premium" style={{ width: '100%', marginTop: '8px' }} disabled={isLoading}>
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>
            </form>
          )}

          <div className="auth-footer">
            Already have an account? <Link to="/login" className="auth-link">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
