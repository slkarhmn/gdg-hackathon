import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { Loader2, LogIn } from 'lucide-react';
import './Login.css';

const Login: React.FC = () => {
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

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-large">
            <div className="logo-icon-large">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </div>
          </div>
          <h1 className="login-title">StudySync</h1>
          <p className="login-subtitle">Your AI-powered study management platform</p>
        </div>

        <div className="login-body">
          <div className="features-list">
            <div className="feature-item">
              <div className="feature-icon">📚</div>
              <div className="feature-text">
                <h3>Organize Your Studies</h3>
                <p>Keep all your notes, assignments, and deadlines in one place</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">🤖</div>
              <div className="feature-text">
                <h3>AI-Powered Assistance</h3>
                <p>Get intelligent help with your coursework and study planning</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">📅</div>
              <div className="feature-text">
                <h3>Sync with Microsoft</h3>
                <p>Connect with Outlook Calendar and Microsoft To Do</p>
              </div>
            </div>
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
                <svg className="microsoft-icon" width="20" height="20" viewBox="0 0 23 23">
                  <rect x="1" y="1" width="10" height="10" fill="#f25022"/>
                  <rect x="12" y="1" width="10" height="10" fill="#7fba00"/>
                  <rect x="1" y="12" width="10" height="10" fill="#00a4ef"/>
                  <rect x="12" y="12" width="10" height="10" fill="#ffb900"/>
                </svg>
                <span>Sign in with Microsoft</span>
              </>
            )}
          </button>

          <p className="login-info">
            Sign in with your university Microsoft account to get started
          </p>
        </div>

        <div className="login-footer">
          <p>Built for ASUS Copilot Challenge 2026</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
