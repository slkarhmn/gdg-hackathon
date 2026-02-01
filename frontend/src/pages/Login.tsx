import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { Loader2, BookOpen, Brain, Calendar, Users, Sparkles, TrendingUp } from 'lucide-react';
import './Login.css';

interface LoginProps {
  onNavigate: (page: string) => void;
}

const Login: React.FC<LoginProps> = ({ onNavigate }) => {
  const { login, isLoading } = useAuth();
  const [error, setError] = React.useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setError(null);
      await login();
    } catch (err) {
      setError('Failed to sign in. Please try again.');
      console.error('Login error:', err);
    }
  };

  const handlePricingClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate('pricing');
  };

  return (
    <div className="login-container">
      <div className="login-split">
        {/* Left Side - Branding */}
        <div className="login-left">
          <div className="login-branding">
            <div className="brand-logo">
              <div className="logo-icon-main">
                <BookOpen size={40} strokeWidth={2} />
              </div>
              <h1 className="brand-name">Productive</h1>
            </div>
            <p className="brand-tagline">Your AI-Powered Study Companion</p>

            <div className="features-showcase">
              <div className="feature-highlight">
                <div className="feature-icon">
                  <Brain size={24} />
                </div>
                <div className="feature-text">
                  <h3>AI-Powered Notes</h3>
                  <p>Automatically generate comprehensive study materials</p>
                </div>
              </div>

              <div className="feature-highlight">
                <div className="feature-icon">
                  <Calendar size={24} />
                </div>
                <div className="feature-text">
                  <h3>Smart Scheduling</h3>
                  <p>Intelligent study plans tailored to your deadlines</p>
                </div>
              </div>

              <div className="feature-highlight">
                <div className="feature-icon">
                  <Users size={24} />
                </div>
                <div className="feature-text">
                  <h3>Collaborative Learning</h3>
                  <p>Sync with Microsoft To Do and Outlook Calendar</p>
                </div>
              </div>

              <div className="feature-highlight">
                <div className="feature-icon">
                  <TrendingUp size={24} />
                </div>
                <div className="feature-text">
                  <h3>Track Progress</h3>
                  <p>Spaced repetition and performance analytics</p>
                </div>
              </div>
            </div>

            <div className="trust-indicators">
              <div className="trust-item">
                <Sparkles size={16} />
                <span>Powered by Azure AI</span>
              </div>
              <div className="trust-item">
                <span className="security-badge">ðŸ”’ Secure Microsoft Login</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-right">
          <div className="login-form-container">
            <div className="login-header">
              <h2>Welcome Back</h2>
              <p>Sign in with your university Microsoft account to continue</p>
            </div>

            {error && (
              <div className="error-message">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              className="microsoft-login-btn"
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="spinner" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <svg className="microsoft-icon" width="21" height="21" viewBox="0 0 21 21">
                    <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                    <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                    <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                    <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                  </svg>
                  <span>Sign in with Microsoft</span>
                </>
              )}
            </button>

            <div className="login-divider">
              <span>or</span>
            </div>

            <button 
              className="pricing-link" 
              onClick={handlePricingClick}
              style={{ cursor: 'pointer', border: 'none', display: 'block', width: '100%' }}
            >
              View Pricing & Plans
            </button>

            <p className="login-info">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>

          <div className="login-footer-right">
            <p>Built for ASUS Copilot Challenge 2026</p>
            <div className="footer-links">
              <a href="#" onClick={handlePricingClick}>Pricing</a>
              <span>•</span>
              <a href="#about">About</a>
              <span>•</span>
              <a href="#support">Support</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;