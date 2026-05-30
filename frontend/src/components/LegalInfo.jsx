import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Shield, Lock, Eye, FileText, Globe } from 'lucide-react';
import Footer from './Footer';
import './LegalInfo.css';

const LegalInfo = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    // Ensure body is scrollable for this page
    document.body.style.overflow = 'auto';
    return () => {
      // Revert if needed, but App.jsx or other components might manage this
    };
  }, []);

  return (
    <div className="policy-page">
      <nav className="policy-nav">
        <div className="nav-container">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ChevronLeft size={20} />
            <span>Back</span>
          </button>
          <div className="policy-logo">
            <span className="logo-text">Calyx <span className="logo-accent">Meet</span></span>
          </div>
        </div>
      </nav>

      <header className="policy-header">
        <div className="header-content">
          <div className="policy-badge">
            <Shield size={16} />
            <span>Privacy First</span>
          </div>
          <h1>Privacy Policy</h1>
          <p>Last updated: May 18, 2026</p>
        </div>
        <div className="header-glow"></div>
      </header>

      <main className="policy-content">
        <div className="content-container">
          <section className="policy-section">
            <div className="section-icon">
              <Eye size={24} />
            </div>
            <h2>Our Commitment</h2>
            <p>
              At Calyx Meet, we believe privacy is a fundamental human right. Our platform is designed from the ground up to minimize data collection and maximize user security. This policy outlines how we handle the very limited information we process.
            </p>
          </section>

          <section className="policy-section">
            <div className="section-icon">
              <Lock size={24} />
            </div>
            <h2>Data Encryption</h2>
            <p>
              All video and audio streams on Calyx Meet are encrypted. For one-on-one calls, we use Peer-to-Peer (P2P) technology with DTLS-SRTP encryption. For group meetings, media is routed through our secure SFU (Selective Forwarding Unit) and encrypted using AES-256 standards.
            </p>
          </section>

          <section className="policy-section">
            <div className="section-icon">
              <FileText size={24} />
            </div>
            <h2>Information We Collect</h2>
            <div className="data-grid">
              <div className="data-card">
                <h3>Account Information</h3>
                <p>When you register, we store your email and display name to manage your sessions and identity within meetings.</p>
              </div>
              <div className="data-card">
                <h3>Meeting Metadata</h3>
                <p>We process temporary metadata (like room names and participant counts) to facilitate connections. This data is not stored permanently.</p>
              </div>
            </div>
          </section>

          <section className="policy-section">
            <div className="section-icon">
              <Globe size={24} />
            </div>
            <h2>Third-Party Services</h2>
            <p>
              We use Firebase for authentication and LiveKit for media routing. These partners are selected for their high security standards and compliance with global privacy regulations (GDPR, CCPA).
            </p>
          </section>

          <div className="policy-footer-note">
            <p>Questions about our privacy practices? Contact us at <a href="mailto:privacy@calyxmeet.com">privacy@calyxmeet.com</a></p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LegalInfo;
