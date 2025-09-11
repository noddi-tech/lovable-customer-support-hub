/**
 * Canonical message model and normalization utilities
 * Provides consistent author attribution and content parsing
 */

import { parseEmailContent } from './parseQuotedEmail';

export interface QuotedBlock {
  kind: 'gmail' | 'outlook' | 'blockquote' | 'generic';
  raw: string;
}

export interface NormalizedMessage {
  id: string;
  dedupKey: string;
  createdAt: string | number;
  channel: 'email' | 'sms' | 'voice' | string;

  from: { 
    name?: string; 
    email?: string; 
    phone?: string; 
    userId?: string;
  };
  to: Array<{ 
    email?: string; 
    phone?: string; 
  }>;

  // Derived fields
  direction: 'inbound' | 'outbound';
  authorType: 'agent' | 'customer' | 'system';
  authorLabel: string; // e.g., "Agent (tom@noddi.no)" or "torstein@hyre.no"

  // Content rendering
  visibleBody: string;         // without quoted sections
  quotedBlocks?: QuotedBlock[];
  
  // Original fields for compatibility
  originalMessage: any;
}

export interface NormalizationContext {
  agentEmailSet: Set<string>;     // case-insensitive agent emails
  agentPhoneSet: Set<string>;     // agent phone numbers
  orgDomain?: string;             // fallback org domain
  currentUserEmail?: string;      // fallback current user
}

/**
 * Create a case-insensitive Set from string array
 */
function createCaseInsensitiveSet(items: string[]): Set<string> {
  return new Set(items.map(item => item.toLowerCase().trim()));
}

/**
 * Build normalization context from available data
 */
export function createNormalizationContext(options: {
  agentEmails?: string[];
  agentPhones?: string[];
  orgDomain?: string;
  currentUserEmail?: string;
}): NormalizationContext {
  return {
    agentEmailSet: createCaseInsensitiveSet(options.agentEmails || []),
    agentPhoneSet: new Set((options.agentPhones || []).map(p => p.trim())),
    orgDomain: options.orgDomain,
    currentUserEmail: options.currentUserEmail?.toLowerCase().trim(),
  };
}

/**
 * Determine if an email belongs to an agent
 */
function isAgentEmail(email: string | undefined, ctx: NormalizationContext): boolean {
  if (!email) return false;
  
  const normalizedEmail = email.toLowerCase().trim();
  
  // Check against known agent emails
  if (ctx.agentEmailSet.has(normalizedEmail)) {
    return true;
  }
  
  // Check against current user email
  if (ctx.currentUserEmail && normalizedEmail === ctx.currentUserEmail) {
    return true;
  }
  
  // Check against org domain (if available)
  if (ctx.orgDomain && normalizedEmail.endsWith(`@${ctx.orgDomain.toLowerCase()}`)) {
    return true;
  }
  
  return false;
}

/**
 * Determine if a phone belongs to an agent
 */
function isAgentPhone(phone: string | undefined, ctx: NormalizationContext): boolean {
  if (!phone) return false;
  return ctx.agentPhoneSet.has(phone.trim());
}

/**
 * Extract quoted blocks with their types
 */
function extractQuotedBlocks(quotedContent: string): QuotedBlock[] {
  if (!quotedContent.trim()) return [];
  
  // Try to identify the type of quoted content
  let kind: QuotedBlock['kind'] = 'generic';
  
  const content = quotedContent.toLowerCase();
  if (content.includes('on ') && content.includes(' wrote:')) {
    kind = 'gmail';
  } else if (content.includes('-----original message-----')) {
    kind = 'outlook';
  } else if (content.includes('<blockquote') || content.includes('blockquote>')) {
    kind = 'blockquote';
  }
  
  return [{
    kind,
    raw: quotedContent
  }];
}

/**
 * Normalize a raw message from Supabase into canonical format
 */
export function normalizeMessage(rawMessage: any, ctx: NormalizationContext): NormalizedMessage {
  // Parse content to separate visible and quoted parts
  const parsedContent = parseEmailContent(
    rawMessage.content || '', 
    rawMessage.content_type || 'text/plain'
  );
  
  // Determine channel from message data
  let channel: string = rawMessage.channel || 'email';
  
  // Extract sender information
  const from: NormalizedMessage['from'] = {};
  
  // For email messages, try to extract from email headers or sender info
  if (rawMessage.email_headers?.from) {
    const fromHeader = rawMessage.email_headers.from;
    if (typeof fromHeader === 'string') {
      // Parse "Name <email@domain.com>" format
      const emailMatch = fromHeader.match(/<([^>]+)>/);
      const nameMatch = fromHeader.match(/^([^<]+)</);
      
      from.email = emailMatch ? emailMatch[1].trim() : fromHeader.trim();
      from.name = nameMatch ? nameMatch[1].trim().replace(/"/g, '') : undefined;
    } else if (typeof fromHeader === 'object' && fromHeader.email) {
      from.email = fromHeader.email;
      from.name = fromHeader.name;
    }
  }
  
  // Fallback to sender_id if available
  if (!from.email && !from.phone && rawMessage.sender_id) {
    from.userId = rawMessage.sender_id;
  }
  
  // For SMS, we might have phone information
  if (channel === 'sms' && rawMessage.customer_phone) {
    from.phone = rawMessage.customer_phone;
  }
  
  // Determine direction and author type
  let direction: 'inbound' | 'outbound' = 'inbound';
  let authorType: 'agent' | 'customer' | 'system' = 'customer';
  
  if (channel === 'email') {
    if (isAgentEmail(from.email, ctx)) {
      direction = 'outbound';
      authorType = 'agent';
    }
  } else if (channel === 'sms') {
    if (isAgentPhone(from.phone, ctx)) {
      direction = 'outbound';
      authorType = 'agent';
    }
  } else {
    // For other channels, use the sender_type if available
    if (rawMessage.sender_type === 'agent') {
      direction = 'outbound';
      authorType = 'agent';
    }
  }
  
  // Create author label
  let authorLabel: string;
  if (authorType === 'agent') {
    if (from.name) {
      authorLabel = from.email ? `${from.name} (${from.email})` : from.name;
    } else if (from.email) {
      authorLabel = `Agent (${from.email})`;
    } else {
      authorLabel = 'Agent';
    }
  } else {
    if (from.name) {
      authorLabel = from.name;
    } else if (from.email) {
      authorLabel = from.email;
    } else if (from.phone) {
      authorLabel = from.phone;
    } else {
      authorLabel = 'Customer';
    }
  }
  
  // Extract quoted blocks
  const quotedBlocks = extractQuotedBlocks(parsedContent.quotedContent);
  
  // Generate stable dedup key
  const dedupKey = rawMessage.id || `msg-${Date.now()}-${Math.random()}`;

  return {
    id: rawMessage.id,
    dedupKey,
    createdAt: rawMessage.created_at,
    channel,
    from,
    to: [], // TODO: Extract recipient information if needed
    direction,
    authorType,
    authorLabel,
    visibleBody: parsedContent.visibleContent,
    quotedBlocks: quotedBlocks.length > 0 ? quotedBlocks : undefined,
    originalMessage: rawMessage
  };
}

/**
 * Create a soft deduplication key for messages without stable IDs
 */
function createSoftDedupKey(message: NormalizedMessage): string {
  const timeStr = typeof message.createdAt === 'string' 
    ? new Date(message.createdAt).toISOString().split('T')[0] 
    : new Date(message.createdAt).toISOString().split('T')[0];
  
  const senderKey = message.from.email || message.from.phone || message.from.userId || 'unknown';
  const contentHash = createContentHash(message.visibleBody);
  
  return `${senderKey}-${timeStr}-${contentHash}`;
}

/**
 * Enhanced deduplication with soft key fallbacks
 */
export function deduplicateMessages(messages: NormalizedMessage[]): NormalizedMessage[] {
  const seenIds = new Set<string>();
  const seenSoftKeys = new Set<string>();
  const deduped: NormalizedMessage[] = [];
  
  // Sort by creation time first (oldest to newest)
  const sorted = [...messages].sort((a, b) => {
    const timeA = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt;
    const timeB = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt;
    return timeA - timeB;
  });
  
  for (const message of sorted) {
    // Primary deduplication by ID
    if (message.id && seenIds.has(message.id)) {
      continue;
    }
    
    // Secondary deduplication by soft key
    const softKey = createSoftDedupKey(message);
    if (seenSoftKeys.has(softKey)) {
      continue;
    }
    
    // Add to seen sets and results
    if (message.id) seenIds.add(message.id);
    seenSoftKeys.add(softKey);
    deduped.push(message);
  }
  
  return deduped;
}

/**
 * Create a simple hash for content deduplication fallback
 */
export function createContentHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}