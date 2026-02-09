import type { WidgetConfig, ChatSession, ChatMessage } from './types';

let apiBaseUrl = 'https://qgfaycwsangsqzpveoup.supabase.co/functions/v1';

export function setApiUrl(url: string) {
  apiBaseUrl = url;
}

export function getApiUrl(): string {
  return apiBaseUrl;
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

// ========== Contact Form ==========

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

// ========== FAQ Search ==========

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
    if (!response.ok) return [];
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('[Noddi Widget] Error searching:', error);
    return [];
  }
}

// ========== Live Chat ==========

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
    if (!response.ok) return null;
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
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('[Noddi Widget] Error sending message:', error);
    return null;
  }
}

export async function getChatMessages(sessionId: string, since?: string): Promise<ChatMessage[]> {
  try {
    let url = `${apiBaseUrl}/widget-chat?sessionId=${encodeURIComponent(sessionId)}`;
    if (since) url += `&since=${encodeURIComponent(since)}`;
    const response = await fetch(url);
    if (!response.ok) return [];
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
  } catch { /* silent */ }
}

// ========== AI Chat ==========

export async function sendAiMessage(
  widgetKey: string,
  messages: Array<{ role: string; content: string }>,
  visitorPhone?: string,
  visitorEmail?: string,
  language?: string,
): Promise<{ reply: string; conversationId?: string }> {
  try {
    const response = await fetch(`${apiBaseUrl}/widget-ai-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ widgetKey, messages, visitorPhone, visitorEmail, language }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'AI chat failed');
    }

    const data = await response.json();
    return {
      reply: data.reply || 'Sorry, I could not generate a response.',
      conversationId: data.conversationId,
    };
  } catch (error) {
    console.error('[Noddi Widget] Error in AI chat:', error);
    throw error;
  }
}

export async function streamAiMessage(
  widgetKey: string,
  messages: Array<{ role: string; content: string }>,
  visitorPhone?: string,
  visitorEmail?: string,
  language?: string,
  conversationId?: string,
  onToken?: (token: string) => void,
  onMeta?: (meta: { conversationId?: string }) => void,
): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/widget-ai-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      widgetKey, messages, visitorPhone, visitorEmail, language,
      stream: true, conversationId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'AI chat streaming failed');
  }

  const contentType = response.headers.get('content-type') || '';

  // If server didn't return SSE (e.g., error JSON), fallback
  if (!contentType.includes('text/event-stream')) {
    const data = await response.json();
    if (data.reply && onToken) onToken(data.reply);
    if (data.conversationId && onMeta) onMeta({ conversationId: data.conversationId });
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete SSE events
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.type === 'token' && onToken) {
          onToken(data.content);
        } else if (data.type === 'meta' && onMeta) {
          onMeta({ conversationId: data.conversationId });
        } else if (data.type === 'done') {
          return;
        }
      } catch { /* skip invalid JSON */ }
    }
  }
}
