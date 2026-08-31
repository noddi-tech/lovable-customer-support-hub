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
  /** User id of the logged-in visitor, so agents skip manual matching. */
  userId?: string | number;
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
  /** Licence plate of the car the visitor is working with. */
  licensePlate?: string;
  /** Human-readable car description, e.g. 'Tesla Model 3 (2021)'. */
  car?: string;
  /** Structured alternative to the flat fields above; merged over them. */
  context?: Record<string, unknown>;
  /** Known visitor, passed straight to `identify`. */
  identity?: WidgetIdentityOptions;
  widgetKey: string;
  apiUrl?: string;
  // Client-side overrides
  showButton?: boolean;      // Default: true - set to false to hide the floating button
  position?: 'bottom-right' | 'bottom-left';  // Override admin config position
  onReady?: () => void;  // Callback when widget is fully initialized and ready for programmatic control
}

/** Known-visitor hint from the host app (never trusted for privileged actions). */
export interface WidgetIdentityOptions {
  userId?: string | number;
  email?: string;
  name?: string;
  phone?: string;
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

export interface ChatAttachment {
  url: string;
  name: string;
  type: string;
  storagePath?: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  senderType: 'customer' | 'agent';
  createdAt: string;
  senderName?: string;
  attachments?: ChatAttachment[];
}
