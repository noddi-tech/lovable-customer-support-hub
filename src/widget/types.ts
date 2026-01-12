export interface WidgetConfig {
  widgetKey: string;
  primaryColor: string;
  position: 'bottom-right' | 'bottom-left';
  greetingText: string;
  responseTimeText: string;
  enableChat: boolean;
  enableContactForm: boolean;
  enableKnowledgeSearch: boolean;
  companyName: string | null;
  logoUrl: string | null;
  inboxName: string | null;
}

export interface WidgetInitOptions {
  widgetKey: string;
  apiUrl?: string;
}

export type WidgetView = 'home' | 'contact' | 'search';
