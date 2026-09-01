import type { WidgetThemeOptions } from './theme';

export interface WidgetConfig {
  widgetKey: string;
  primaryColor: string;
  /** Supporting brand colour (host theme override or derived from primary). */
  secondaryColor?: string;
  /** Highlight brand colour (host theme override or derived). */
  accentColor?: string;
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

export type WidgetEnvironment = 'production' | 'staging' | 'development';

/** Context accepted by `init` and `update` (flat host-facing field names). */
export interface WidgetHostContext {
  locale?: string;
  environment?: WidgetEnvironment;
  sourceApp?: string;
  userId?: string | number;
  serviceDepartmentId?: string | number;
  bookingId?: string | number;
  bookingSlug?: string;
  orderId?: string | number;
  licensePlate?: string;
  car?: string;
  pathname?: string;
  appVersion?: string;
}

/** Payload for `NoddiWidget('update', ...)`; `identity: null` clears the visitor. */
export interface WidgetUpdateOptions extends WidgetHostContext {
  brand?: string;
  /** Locales the host supports; narrows the widget language picker. */
  supportedLocales?: string[];
  /** Host gate for the help-centre home action. false always hides it. */
  enableKnowledgeSearch?: boolean;
  context?: WidgetHostContext;
  identity?: WidgetIdentityOptions | null;
  /** Brand colours (primary/secondary/accent) applied live. */
  theme?: WidgetThemeOptions;
}

export interface WidgetInitOptions {
  /** Optional brand of the host site, shown to agents on chats (e.g. 'Noddi Bilpleie'). */
  brand?: string;
  /** Locales the host supports (BCP-47), e.g. ['nb-NO', 'en-US', 'sv-SE']. */
  supportedLocales?: string[];
  /** Host gate for the help-centre home action. false always hides it. */
  enableKnowledgeSearch?: boolean;
  /** BCP-47 language of the visitor's session, e.g. 'nb-NO'. */
  locale?: string;
  /** Deployment the widget runs in. */
  environment?: WidgetEnvironment;
  /** Product surface using this widget key, e.g. 'customer' | 'partner' | 'marketing'. */
  sourceApp?: string;
  /** User id of the logged-in visitor, so agents skip manual matching. */
  userId?: string | number;
  /** Service department the visitor belongs to / is browsing. */
  serviceDepartmentId?: string | number;
  /** Booking currently open in the host app. */
  bookingId?: string | number;
  /** Booking slug, when the host only has a slug (draft flows) and no numeric id. */
  bookingSlug?: string;
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
  context?: WidgetHostContext;
  /** Known visitor, passed straight to `identify`. */
  identity?: WidgetIdentityOptions;
  /**
   * Brand colours from the host app, mirroring the backend Brand model
   * (primary / secondary / accent). Overrides the admin-configured colour.
   */
  theme?: WidgetThemeOptions;
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

export type WidgetView = 'home' | 'contact' | 'search' | 'chat' | 'ai' | 'prechat';

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
