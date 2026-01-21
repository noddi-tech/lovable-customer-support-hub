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
  agentsOnline: boolean; // True if at least one agent is available for chat
}

export interface WidgetInitOptions {
  widgetKey: string;
  apiUrl?: string;
}

export type WidgetView = 'home' | 'contact' | 'search' | 'chat';

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
