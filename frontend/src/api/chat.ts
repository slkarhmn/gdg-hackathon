import { API_BASE_URL } from './config';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  response: string;
  conversation_history: ChatMessage[];
  tokens_used: number;
  timestamp: string;
}

export interface ContextStats {
  user_id: number;
  total_entries: number;
  created_at: string | null;
  updated_at: string | null;
  oldest_entry: string | null;
  newest_entry: string | null;
}

export async function sendChatMessage(
  userId: number,
  message: string,
  conversationHistory: ChatMessage[] = [],
  source?: string,
  noteContext?: string
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE_URL}/chat/user/${userId}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      conversation_history: conversationHistory,
      ...(source && { source }),
      ...(noteContext && noteContext.trim() && { note_context: noteContext }),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Chat failed: ${res.status}`);
  }
  return res.json();
}

export async function endChatSession(
  userId: number,
  conversationHistory: ChatMessage[]
): Promise<{ message: string; context_entry?: unknown }> {
  const res = await fetch(`${API_BASE_URL}/chat/user/${userId}/session/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversation_history: conversationHistory }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `End session failed: ${res.status}`);
  }
  return res.json();
}

export async function getContextStats(userId: number): Promise<ContextStats> {
  const res = await fetch(`${API_BASE_URL}/chat/user/${userId}/context/stats`);
  if (!res.ok) {
    throw new Error(`Failed to get context stats: ${res.status}`);
  }
  return res.json();
}
