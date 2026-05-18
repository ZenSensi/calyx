import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Video, Github, Twitter, Linkedin } from 'lucide-react';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="calyx-footer">
      <div className="footer-content">
        <div className="footer-section brand-section">
          <div className="footer-logo">
            <div className="logo-icon-wrap">
              <Video size={20} color="#fff" fill="var(--primary-indigo)" />
            </div>
            <span className="logo-text">Calyx <span className="logo-accent">Meet</span></span>
          </div>
          <p className="footer-tagline">
            Next generation video conferencing built for privacy, speed, and premium experiences.
          </p>
          <div className="social-links">
            <a href="#" className="social-link" title="Twitter"><Twitter size={18} /></a>
            <a href="#" className="social-link" title="LinkedIn"><Linkedin size={18} /></a>
            <a href="#" className="social-link" title="GitHub"><Github size={18} /></a>
          </div>
        </div>

        <div className="footer-links-container">
          <div className="footer-section">
            <h4>Product</h4>
            <ul>
              <li><a href="#">Features</a></li>
              <li><a href="#">Integrations</a></li>
              <li><a href="#">Security</a></li>
              <li><a href="#">What's New</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Resources</h4>
            <ul>
              <li><a href="#">Documentation</a></li>
              <li><a href="#">Help Center</a></li>
              <li><a href="#">Community</a></li>
              <li><a href="#">Blog</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Policies</h4>
            <ul>
              <li><Link to="/privacy-policy">Privacy Policy</Link></li>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">Cookie Policy</a></li>
              <li><a href="#">Security Policy</a></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-copyright">
          © {currentYear} Calyx Meet. All rights reserved.
        </div>
        <div className="footer-security">
          <Shield size={14} />
          <span>AES-256 Encrypted</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
