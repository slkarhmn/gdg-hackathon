import React, { createContext, useContext, useState, useEffect } from 'react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig, loginRequest } from './authConfig';

interface AuthContextType {
  account: any | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  login: () => Promise<void>;
  loginAsGuest: () => void;
  logout: () => void;
  getAccessToken: () => Promise<string | null>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initialize MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

const GUEST_ACCOUNT_KEY = 'studysync_guest_mode';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      try {
        const guestMode = sessionStorage.getItem(GUEST_ACCOUNT_KEY);
        if (guestMode === 'true') {
          setIsGuest(true);
          setAccount({ name: 'Guest User', username: 'guest@studysync.local' });
          setIsLoading(false);
          return;
        }

        await msalInstance.initialize();
        
        // Handle redirect response (important!)
        const response = await msalInstance.handleRedirectPromise();
        if (response?.account) {
          setAccount(response.account);
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

  const loginAsGuest = () => {
    sessionStorage.setItem(GUEST_ACCOUNT_KEY, 'true');
    setIsGuest(true);
    setAccount({ name: 'Guest User', username: 'guest@studysync.local' });
  };

  const logout = () => {
    if (isGuest) {
      sessionStorage.removeItem(GUEST_ACCOUNT_KEY);
      setIsGuest(false);
      setAccount(null);
    } else {
      msalInstance.logoutRedirect({
        account: account,
      });
    }
  };

  const getAccessToken = async (): Promise<string | null> => {
    if (!account || isGuest) return null;

    try {
      const response = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account: account,
      });
      return response.accessToken;
    } catch (error) {
      try {
        const response = await msalInstance.acquireTokenPopup(loginRequest);
        return response.accessToken;
      } catch (popupError) {
        console.error('Token acquisition error:', popupError);
        return null;
      }
    }
  };

  const value = {
    account,
    isAuthenticated: !!account,
    isGuest,
    login,
    loginAsGuest,
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