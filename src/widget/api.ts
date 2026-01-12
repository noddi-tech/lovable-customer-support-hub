import type { WidgetConfig } from './types';

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
