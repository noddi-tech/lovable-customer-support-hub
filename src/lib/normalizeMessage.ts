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
  
  const result: NormalizedMessage = {
    id: rawMessage.id,
    dedupKey: '', // Will be set below
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

  // Generate stable dedup key after we have the normalized message
  result.dedupKey = generateStableDedupKey(rawMessage, result);

  return result;
}

/**
 * Normalize text content for deduplication
 */
function normalizeText(content: string): string {
  return content
    .replace(/<[^>]+>/g, '')  // Strip HTML
    .replace(/\s+/g, ' ')     // Collapse whitespace
    .trim()
    .toLowerCase();
}

/**
 * Round timestamp to 2-minute buckets to handle minor time variations
 */
function roundTo2Min(timestamp: string | number): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
  const minutes = Math.floor(date.getMinutes() / 2) * 2;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), minutes).toISOString();
}

/**
 * Generate stable dedup key with 3-step fallback chain
 */
function generateStableDedupKey(rawMessage: any, normalizedMessage: NormalizedMessage): string {
  // Priority 1: Explicit unique IDs from backend
  const explicitId = rawMessage.external_id || 
                    rawMessage.message_id || 
                    rawMessage.headers?.['Message-ID'];
  if (explicitId) {
    return `explicit:${explicitId}`;
  }

  // Priority 2: Email-style reference ID
  const emailId = rawMessage.headers?.['X-Message-Id'] || 
                 rawMessage.headers?.['Message-Id'] ||
                 rawMessage.email_message_id;
  if (emailId) {
    return `email:${emailId}`;
  }

  // Priority 3: Content hash fallback
  const normalizedContent = normalizeText(normalizedMessage.visibleBody);
  const timeKey = roundTo2Min(normalizedMessage.createdAt);
  const authorKey = normalizedMessage.authorType;
  const contentHash = createContentHash(`${authorKey}|${normalizedContent}|${timeKey}`);
  
  return `content:${contentHash}`;
}

/**
 * Enhanced deduplication using stable dedup keys
 */
export function deduplicateMessages(messages: NormalizedMessage[]): NormalizedMessage[] {
  const seenKeys = new Set<string>();
  const deduped: NormalizedMessage[] = [];
  
  // Sort by creation time first (oldest to newest) to preserve first occurrence
  const sorted = [...messages].sort((a, b) => {
    const timeA = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt;
    const timeB = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt;
    return timeA - timeB;
  });
  
  for (const message of sorted) {
    // Deduplication by stable dedup key
    if (seenKeys.has(message.dedupKey)) {
      continue;
    }
    
    seenKeys.add(message.dedupKey);
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