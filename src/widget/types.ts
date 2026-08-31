export interface WidgetConfig {
  widgetKey: string;
  primaryColor: string;
  position: 'bottom-right' | 'bottom-left';
  greetingText: string;
  responseTimeText: string;
  greetingTranslations: Record<string, string>;
  responseTimeTranslations: Record<string, string>;
  enableChat: boolean;
  enableContactForm: boolean;
  enableKnowledgeSearch: boolean;
  companyName: string | null;
  logoUrl: string | null;
  inboxName: string | null;
  agentsOnline: boolean; // True if at least one agent is available for chat
  language: string; // Language code (en, no, es, fr, de, it, pt, nl, sv, da)
}

export interface WidgetInitOptions {
  /** Optional brand of the host site, shown to agents on chats (e.g. 'Noddi Bilpleie'). */
  brand?: string;
  /** BCP-47 language of the visitor's session, e.g. 'nb-NO'. */
  locale?: string;
  /** Deployment the widget runs in: 'production' | 'staging' | 'development'. */
  environment?: string;
  /** Product surface using this widget key, e.g. 'customer' | 'partner' | 'marketing'. */
  sourceApp?: string;
  /** Noddi user id of the logged-in visitor, so agents skip manual matching. */
  noddiUserId?: string | number;
  /** Service department the visitor belongs to / is browsing. */
  serviceDepartmentId?: string | number;
  /** Booking currently open in the host app. */
  bookingId?: string | number;
  /** Order currently open in the host app. */
  orderId?: string | number;
  /** SPA route; falls back to the live location when omitted. */
  pathname?: string;
  /** Host app release/version, to correlate reports with deploys. */
  appVersion?: string;
  widgetKey: string;
  apiUrl?: string;
  // Client-side overrides
  showButton?: boolean;      // Default: true - set to false to hide the floating button
  position?: 'bottom-right' | 'bottom-left';  // Override admin config position
  onReady?: () => void;  // Callback when widget is fully initialized and ready for programmatic control
}

export type WidgetView = 'home' | 'contact' | 'search' | 'chat' | 'ai';

export type ChatSessionStatus = 'waiting' | 'active' | 'ended' | 'abandoned';

export interface ChatSession {
  id: string;
  conversationId: string;
  status: ChatSessionStatus;
  assignedAgentName?: string;
  startedAt: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  senderType: 'customer' | 'agent';
  createdAt: string;
  senderName?: string;
}
