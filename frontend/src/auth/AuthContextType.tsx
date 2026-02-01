import { createContext } from 'react';
import type { AccountInfo } from '@azure/msal-browser';

export interface AuthContextType {
  account: AccountInfo | null;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => void;
  getAccessToken: () => Promise<string | null>;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);