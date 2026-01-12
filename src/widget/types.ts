export interface WidgetConfig {
  widgetKey: string;
  primaryColor: string;
  position: 'bottom-right' | 'bottom-left';
  greetingText: string;
  responseTimeText: string;
  enableContactForm: boolean;
  enableKnowledgeSearch: boolean;
  companyName: string | null;
  logoUrl: string | null;
  inboxId: string;
}

export interface WidgetInitOptions {
  widgetKey: string;
  apiUrl?: string;
}

export type WidgetView = 'home' | 'contact' | 'search';
