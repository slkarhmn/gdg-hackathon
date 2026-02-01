/**
 * Microsoft Authentication Service
 * Handles OAuth flow and token management for Microsoft Graph API
 */

interface TokenData {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

class MicrosoftAuthService {
  private static TOKEN_KEY = 'microsoft_access_token';
  private static REFRESH_KEY = 'microsoft_refresh_token';
  private static EXPIRY_KEY = 'microsoft_token_expiry';
  private static API_BASE = 'http://localhost:5000/api';

  /**
   * Initiate Microsoft login flow
   */
  static async login(): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE}/auth/login`);
      const data = await response.json();
      
      if (data.auth_url) {
        // Redirect to Microsoft login page
        window.location.href = data.auth_url;
      } else {
        throw new Error('Failed to get auth URL');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Handle OAuth callback and store tokens
   */
  static async handleCallback(code: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE}/auth/callback?code=${code}`);
      const tokenData: TokenData = await response.json();
      
      if (tokenData.access_token) {
        this.storeTokens(tokenData);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Callback error:', error);
      return false;
    }
  }

  /**
   * Store tokens in localStorage
   */
  private static storeTokens(tokenData: TokenData): void {
    localStorage.setItem(this.TOKEN_KEY, tokenData.access_token);
    
    if (tokenData.refresh_token) {
      localStorage.setItem(this.REFRESH_KEY, tokenData.refresh_token);
    }
    
    const expiryTime = Date.now() + (tokenData.expires_in * 1000);
    localStorage.setItem(this.EXPIRY_KEY, expiryTime.toString());
  }

  /**
   * Get current access token (with auto-refresh if needed)
   */
  static async getAccessToken(): Promise<string | null> {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const expiry = localStorage.getItem(this.EXPIRY_KEY);
    
    if (!token || !expiry) {
      return null;
    }
    
    // Check if token is expired or about to expire (within 5 minutes)
    const isExpired = Date.now() >= (parseInt(expiry) - 5 * 60 * 1000);
    
    if (isExpired) {
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        return null;
      }
      return localStorage.getItem(this.TOKEN_KEY);
    }
    
    return token;
  }

  /**
   * Refresh access token using refresh token
   */
  private static async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem(this.REFRESH_KEY);
    
    if (!refreshToken) {
      return false;
    }
    
    try {
      const response = await fetch(`${this.API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      
      const tokenData: TokenData = await response.json();
      
      if (tokenData.access_token) {
        this.storeTokens(tokenData);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const expiry = localStorage.getItem(this.EXPIRY_KEY);
    
    if (!token || !expiry) {
      return false;
    }
    
    return Date.now() < parseInt(expiry);
  }

  /**
   * Logout and clear tokens
   */
  static logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.EXPIRY_KEY);
  }

  /**
   * Make authenticated request to backend API
   */
  static async authenticatedFetch(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = await this.getAccessToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    return fetch(`${this.API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  }
}

export default MicrosoftAuthService;
