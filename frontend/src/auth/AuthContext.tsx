import React, { createContext, useContext, useState, useEffect } from 'react';
import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser';
import { msalConfig, loginRequest } from './authConfig';

interface AuthContextType {
  account: any | null;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => void;
  getAccessToken: () => Promise<string | null>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initialize MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      try {
        await msalInstance.initialize();
        
        // Handle redirect response (important!)
        const response = await msalInstance.handleRedirectPromise();
        if (response?.account) {
          setAccount(response.account);
          
          // ✅ NEW: Save access token to localStorage after redirect
          if (response.accessToken) {
            localStorage.setItem('microsoft_access_token', response.accessToken);
            console.log('✅ Access token saved to localStorage');
          }
        }
        
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        }
      } catch (error) {
        console.error('MSAL initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  const login = async () => {
    try {
      setIsLoading(true);
      // Use redirect instead of popup - more reliable
      await msalInstance.loginRedirect(loginRequest);
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const logout = () => {
    // ✅ NEW: Clear token from localStorage on logout
    localStorage.removeItem('microsoft_access_token');
    localStorage.removeItem('microsoft_refresh_token');
    
    msalInstance.logoutRedirect({
      account: account,
    });
  };

  const getAccessToken = async (): Promise<string | null> => {
    if (!account) return null;

    try {
      // acquireTokenSilent will throw InteractionRequiredAuthError if the
      // cached token is missing scopes (e.g. Calendars.ReadWrite was added
      // after the user first logged in, or consent was never completed).
      // We catch that specific error and fall through to a redirect-based
      // consent flow so the user is prompted to grant the new permissions.
      const response = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account: account,
      });
      
      // ✅ NEW: Save token to localStorage whenever we get a fresh one
      if (response.accessToken) {
        localStorage.setItem('microsoft_access_token', response.accessToken);
      }
      
      return response.accessToken;
    } catch (error) {
      // Only redirect for consent/scope errors. Other errors (network, etc.)
      // should not silently trigger a full-page redirect.
      if (error instanceof InteractionRequiredAuthError) {
        // loginRedirect does not return — it navigates away. The token will
        // be available on the next page load via handleRedirectPromise above.
        // We pass `prompt: 'consent'` to force Microsoft to show the
        // permission screen again even if a previous (incomplete) consent exists.
        await msalInstance.loginRedirect({
          ...loginRequest,
          prompt: 'consent',
        });
        // This line is never reached due to the redirect, but satisfies TS.
        return null;
      }

      console.error('Token acquisition error:', error);
      return null;
    }
  };

  const value = {
    account,
    isAuthenticated: !!account,
    login,
    logout,
    getAccessToken,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};