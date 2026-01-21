import type { WidgetConfig, ChatSession, ChatMessage } from './types';

let apiBaseUrl = 'https://qgfaycwsangsqzpveoup.supabase.co/functions/v1';

export function setApiUrl(url: string) {
  apiBaseUrl = url;
}

export async function fetchWidgetConfig(widgetKey: string): Promise<WidgetConfig | null> {
  try {
    const response = await fetch(`${apiBaseUrl}/widget-config?key=${encodeURIComponent(widgetKey)}`);
    if (!response.ok) {
      console.error('[Noddi Widget] Failed to fetch config:', response.status);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('[Noddi Widget] Error fetching config:', error);
    return null;
  }
}

export interface SubmitContactData {
  widgetKey: string;
  name: string;
  email: string;
  message: string;
  pageUrl: string;
  visitorId?: string;
}

export async function submitContactForm(data: SubmitContactData): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${apiBaseUrl}/widget-submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error || 'Failed to submit' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('[Noddi Widget] Error submitting form:', error);
    return { success: false, error: 'Network error' };
  }
}

export interface SearchResult {
  id: string;
  question: string;
  answer: string;
  similarity?: number;
}

export async function searchFaq(widgetKey: string, query: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(`${apiBaseUrl}/widget-search-faq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ widgetKey, query }),
    });
    
    if (!response.ok) {
      console.error('[Noddi Widget] Search failed:', response.status);
      return [];
    }
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('[Noddi Widget] Error searching:', error);
    return [];
  }
}

// ========== Live Chat API ==========

export interface StartChatData {
  widgetKey: string;
  visitorId: string;
  visitorName?: string;
  visitorEmail?: string;
  pageUrl?: string;
}

export async function startChat(data: StartChatData): Promise<ChatSession | null> {
  try {
    const response = await fetch(`${apiBaseUrl}/widget-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', ...data }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Noddi Widget] Failed to start chat:', errorData.error);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('[Noddi Widget] Error starting chat:', error);
    return null;
  }
}

export async function sendChatMessage(sessionId: string, content: string): Promise<ChatMessage | null> {
  try {
    const response = await fetch(`${apiBaseUrl}/widget-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'message', sessionId, content }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Noddi Widget] Failed to send message:', errorData.error);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('[Noddi Widget] Error sending message:', error);
    return null;
  }
}

export async function getChatMessages(sessionId: string, since?: string): Promise<ChatMessage[]> {
  try {
    let url = `${apiBaseUrl}/widget-chat?sessionId=${encodeURIComponent(sessionId)}`;
    if (since) {
      url += `&since=${encodeURIComponent(since)}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      console.error('[Noddi Widget] Failed to get messages:', response.status);
      return [];
    }
    
    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    console.error('[Noddi Widget] Error getting messages:', error);
    return [];
  }
}

export async function endChat(sessionId: string): Promise<boolean> {
  try {
    const response = await fetch(`${apiBaseUrl}/widget-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'end', sessionId }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('[Noddi Widget] Error ending chat:', error);
    return false;
  }
}

export async function updateTypingStatus(sessionId: string, isTyping: boolean): Promise<void> {
  try {
    await fetch(`${apiBaseUrl}/widget-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'typing', sessionId, isTyping }),
    });
  } catch (error) {
    // Silently fail for typing indicators
  }
}
