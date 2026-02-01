/**
 * Auth Callback Component
 * Handles OAuth redirect from Microsoft
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MicrosoftAuthService from '../services/MicrosoftAuthService';

const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setStatus('error');
        setError(errorParam);
        return;
      }

      if (!code) {
        setStatus('error');
        setError('No authorization code received');
        return;
      }

      try {
        const success = await MicrosoftAuthService.handleCallback(code);
        
        if (success) {
          setStatus('success');
          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        } else {
          setStatus('error');
          setError('Failed to authenticate');
        }
      } catch (err) {
        setStatus('error');
        setError('Authentication failed');
        console.error(err);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#0F172A',
      color: 'white',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '2rem'
      }}>
        {status === 'loading' && (
          <>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid #334155',
              borderTop: '4px solid #60A5FA',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }} />
            <h2>Authenticating with Microsoft...</h2>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              fontSize: '24px'
            }}>
              ✓
            </div>
            <h2>Authentication Successful!</h2>
            <p style={{ color: '#94A3B8' }}>Redirecting to dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              fontSize: '24px'
            }}>
              ✕
            </div>
            <h2>Authentication Failed</h2>
            <p style={{ color: '#94A3B8' }}>{error}</p>
            <button
              onClick={() => navigate('/')}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                background: '#60A5FA',
                border: 'none',
                borderRadius: '0.375rem',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Go to Home
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AuthCallback;
