export type StatusFilter = 'all' | 'unread' | 'assigned' | 'pending' | 'closed' | 'archived';

export type InboxId = string;
export type ConversationId = string;

export interface Inbox {
  id: InboxId;
  name: string;
  color?: string;
  is_active?: boolean;
}

export interface InboxCounts {
  inboxId: InboxId;
  total: number;
  unread: number;
  assigned: number;
  pending: number;
  closed: number;
  archived: number;
}

export interface ConversationRow {
  id: ConversationId;
  subject: string;
  preview: string;
  fromName?: string;
  channel: 'email' | 'sms' | 'chat' | 'voice' | 'facebook' | 'instagram' | 'whatsapp';
  updatedAt: string; // ISO
  unread: boolean;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'pending' | 'closed' | 'archived' | 'resolved';
  assignee?: string;
  customerId?: string;
  inboxId?: string;
  isArchived?: boolean;
  firstResponseAt?: string;
  slaBreachAt?: string;
  slaStatus?: 'on_track' | 'at_risk' | 'breached' | 'met';
}

export interface Message {
  id: string;
  author: string;
  bodyHtml?: string;
  bodyText?: string;
  content?: string;
  createdAt: string; // ISO
  inbound: boolean;
  senderType?: 'customer' | 'agent';
  isInternal?: boolean;
}

export interface ConversationThread {
  id: ConversationId;
  messages: Message[];
  subject?: string;
  customer?: {
    id: string;
    full_name: string;
    email: string;
  };
}