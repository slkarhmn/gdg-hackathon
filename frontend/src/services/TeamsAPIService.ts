/**
 * Microsoft Teams API Service
 * Handles all Teams-related API calls for Get Help feature
 */

import MicrosoftAuthService from './MicrosoftAuthService';

export interface Chat {
  id: string;
  topic?: string;
  chatType: string;
  createdDateTime: string;
  lastUpdatedDateTime: string;
}

export interface Message {
  id: string;
  createdDateTime: string;
  from: {
    user?: {
      id: string;
      displayName: string;
    };
  };
  body: {
    content: string;
    contentType: string;
  };
}

export interface User {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
  jobTitle?: string;
}

export interface Presence {
  id: string;
  availability: 'Available' | 'Busy' | 'Away' | 'BeRightBack' | 'DoNotDisturb' | 'Offline';
  activity: string;
}

class TeamsAPIService {
  /**
   * Get all chats for current user
   */
  static async getChats(): Promise<Chat[]> {
    try {
      const response = await MicrosoftAuthService.authenticatedFetch('/teams/chats');
      const data = await response.json();
      return data.chats || [];
    } catch (error) {
      console.error('Error fetching chats:', error);
      throw error;
    }
  }

  /**
   * Get messages from a specific chat
   */
  static async getChatMessages(chatId: string, limit: number = 50): Promise<Message[]> {
    try {
      const response = await MicrosoftAuthService.authenticatedFetch(
        `/teams/chats/${chatId}/messages?limit=${limit}`
      );
      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  /**
   * Send a message to a chat
   */
  static async sendMessage(chatId: string, message: string): Promise<Message> {
    try {
      const response = await MicrosoftAuthService.authenticatedFetch('/teams/chats/send', {
        method: 'POST',
        body: JSON.stringify({
          chat_id: chatId,
          message: message,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Create a new chat with a user
   */
  static async createChat(userId: string, initialMessage?: string): Promise<Chat> {
    try {
      const response = await MicrosoftAuthService.authenticatedFetch('/teams/chats/create', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          initial_message: initialMessage,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create chat');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  }

  /**
   * Search for users (e.g., professors)
   */
  static async searchUsers(query: string): Promise<User[]> {
    try {
      const response = await MicrosoftAuthService.authenticatedFetch(
        `/teams/users/search?query=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      return data.users || [];
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  /**
   * Get user presence (online/offline/busy status)
   */
  static async getUserPresence(userId: string): Promise<Presence> {
    try {
      const response = await MicrosoftAuthService.authenticatedFetch(
        `/teams/users/${userId}/presence`
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching presence:', error);
      throw error;
    }
  }

  /**
   * Convert Graph API message to app format
   */
  static convertMessage(graphMessage: any): {
    id: string;
    sender: 'user' | 'professor';
    content: string;
    timestamp: string;
  } {
    return {
      id: graphMessage.id,
      sender: graphMessage.from?.user?.id === 'current-user-id' ? 'user' : 'professor',
      content: graphMessage.body.content,
      timestamp: new Date(graphMessage.createdDateTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }),
    };
  }

  /**
   * Convert Graph API presence to app format
   */
  static convertPresence(graphPresence: Presence): 'online' | 'offline' | 'busy' {
    switch (graphPresence.availability) {
      case 'Available':
      case 'BeRightBack':
        return 'online';
      case 'Busy':
      case 'DoNotDisturb':
        return 'busy';
      default:
        return 'offline';
    }
  }
}

export default TeamsAPIService;
