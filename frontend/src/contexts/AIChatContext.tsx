import React, { createContext, useCallback, useContext, useState } from 'react';
import { DEFAULT_USER_ID } from '../api/config';
import {
  sendChatMessage,
  endChatSession,
  type ChatMessage,
} from '../api/chat';

export interface DisplayMessage {
  role: 'user' | 'ai';
  text: string;
}

interface AIChatContextValue {
  messages: DisplayMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (text: string, source?: string, noteContext?: string) => Promise<void>;
  endSession: () => Promise<void>;
  clearMessages: () => void;
  setError: (err: string | null) => void;
}

const AIChatContext = createContext<AIChatContextValue | null>(null);

export function AIChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (text: string, source?: string, noteContext?: string) => {
    if (!text.trim()) return;
    const userMessage: DisplayMessage = { role: 'user', text: text.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setError(null);
    setIsLoading(true);

    try {
      const result = await sendChatMessage(
        DEFAULT_USER_ID,
        text.trim(),
        conversationHistory,
        source,
        noteContext
      );

      const backendHistory = result.conversation_history || [];
      setConversationHistory(backendHistory);

      const aiMessage: DisplayMessage = {
        role: 'ai',
        text: result.response || 'No response received.',
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to get AI response';
      setError(msg);
      setMessages((prev) => [...prev, { role: 'ai', text: `Error: ${msg}` }]);
    } finally {
      setIsLoading(false);
    }
  }, [conversationHistory]);

  const endSession = useCallback(async () => {
    if (conversationHistory.length === 0) return;
    try {
      await endChatSession(DEFAULT_USER_ID, conversationHistory);
      setConversationHistory([]);
      setMessages([]);
    } catch (err) {
      console.error('Failed to end chat session:', err);
    }
  }, [conversationHistory]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationHistory([]);
    setError(null);
  }, []);

  const value: AIChatContextValue = {
    messages,
    isLoading,
    error,
    sendMessage,
    endSession,
    clearMessages,
    setError,
  };

  return (
    <AIChatContext.Provider value={value}>{children}</AIChatContext.Provider>
  );
}

export function useAIChat() {
  const ctx = useContext(AIChatContext);
  if (!ctx) {
    throw new Error('useAIChat must be used within AIChatProvider');
  }
  return ctx;
}
