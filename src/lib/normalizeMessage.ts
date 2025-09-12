/**
 * Canonical message model and normalization utilities
 * Provides consistent author attribution and content parsing
 */

import { parseQuotedEmail, type QuotedBlock, type QuotedMessage } from './parseQuotedEmail';

// Helper functions for deduplication
function normalizeText(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function roundTo2Min(ts: string | number): string {
  const d = new Date(ts);
  const m = Math.floor(d.getMinutes() / 2) * 2;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), m).toISOString();
}

function simpleHash(s: string): string {
  let h = 0; 
  for (let i = 0; i < s.length; i++) { 
    h = ((h << 5) - h) + s.charCodeAt(i); 
    h |= 0; 
  }
  return Math.abs(h).toString(36);
}



export interface EmailAddress {
  name?: string;
  email?: string;
}

export interface NormalizedMessage {
  id: string;
  dedupKey: string;
  createdAt: string | number;
  channel: 'email' | 'sms' | 'voice' | string;

  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject?: string;

  // Derived fields
  direction: 'inbound' | 'outbound';
  authorType: 'agent' | 'customer' | 'system';
  authorLabel: string; // e.g., "Agent (tom@noddi.no)" or "torstein@hyre.no"
  avatarInitial: string; // Initial for avatar display

  // Content rendering
  visibleBody: string;         // without quoted sections
  quotedBlocks?: QuotedBlock[];
  
  // Original fields for compatibility
  originalMessage: any;
}

export interface NormalizationContext {
  agentEmailSet: Set<string>;     // case-insensitive agent emails
  agentPhoneSet: Set<string>;     // agent phone numbers
  orgDomains?: string[];          // fallback org domains (now array)
  currentUserEmail?: string;      // fallback current user
}

/**
 * Create a case-insensitive Set from string array
 */
function createCaseInsensitiveSet(items: string[]): Set<string> {
  return new Set(items.map(item => item.toLowerCase().trim()));
}

/**
 * Parse email address list (handles "Name <email@x>" or plain "email@x", comma-separated)
 */
function parseAddressList(input?: string | string[]): EmailAddress[] {
  if (!input) return [];
  const raw = Array.isArray(input) ? input.join(',') : input;
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => {
      // "Name <mail@x>" or just "mail@x"
      const m = s.match(/^(.*)<([^>]+)>$/);
      if (m) {
        return { name: m[1].trim().replace(/^"|"$/g, ''), email: m[2].trim() };
      }
      return { email: s.replace(/^"|"$/g, '') };
    });
}

function parseSingleAddress(input?: string): EmailAddress {
  return parseAddressList(input)[0] ?? {};
}

/**
 * Build normalization context from available data
 */
export function createNormalizationContext(options: {
  agentEmails?: string[];
  agentPhones?: string[];
  orgDomain?: string;
  orgDomains?: string[];
  currentUserEmail?: string;
}): NormalizationContext {
  return {
    agentEmailSet: createCaseInsensitiveSet(options.agentEmails || []),
    agentPhoneSet: new Set((options.agentPhones || []).map(p => p.trim())),
    orgDomains: options.orgDomains || (options.orgDomain ? [options.orgDomain] : []),
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
  
  // Check against org domains (if available)
  if (ctx.orgDomains?.length) {
    for (const domain of ctx.orgDomains) {
      if (normalizedEmail.endsWith(`@${domain.toLowerCase()}`)) {
        return true;
      }
    }
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


import { extractEmailAddress } from './emailThreading';

/**
 * Normalize a raw message from Supabase into canonical format
 */
export function normalizeMessage(rawMessage: any, ctx: NormalizationContext): NormalizedMessage {
  // Parse content to separate visible and quoted parts
  const parsedContent = parseQuotedEmail({
    content: rawMessage.content || '', 
    contentType: rawMessage.content_type || 'text/plain'
  });
  
  // Determine channel from message data
  let channel: string = rawMessage.channel || 'email';
  
  // Extract participants from email headers - normalize keys to lowercase
  const rawHeaders = (rawMessage.email_headers ?? {}) as Record<string, string>;
  const headers: Record<string, string> = {};
  
  // Normalize header keys to lowercase for consistent access
  Object.entries(rawHeaders).forEach(([key, value]) => {
    headers[key.toLowerCase()] = value;
  });
  
  const from = parseSingleAddress(headers['from'] || rawMessage.from);
  const to = parseAddressList(headers['to'] || rawMessage.to);
  const cc = parseAddressList(headers['cc'] || rawMessage.cc);
  const bcc = parseAddressList(headers['bcc'] || rawMessage.bcc);
  
  const subject = rawMessage.email_subject || headers['subject'];
  
  // For SMS, we might have phone information
  if (channel === 'sms' && rawMessage.customer_phone && !from.email) {
    from.email = rawMessage.customer_phone; // Store phone as email for SMS
  }
  
  // Determine if this is an agent based on email headers first
  const email = from.email?.toLowerCase() || "";
  const isAgent =
    !!ctx.agentEmailSet?.has(email) ||
    !!ctx.orgDomains?.some(d => email.endsWith(`@${d}`)) ||
    rawMessage.sender_type === "agent" ||
    !!rawMessage.is_internal;
  
  // Author fields
  const authorType = isAgent ? "agent" : "customer";
  const authorLabel = isAgent ? `Agent (${email})` : email;
  
  // Avatar initial
  const initial = (from.name || from.email || "A").trim()[0]?.toUpperCase() || "A";
  
  // Determine direction
  const direction: 'inbound' | 'outbound' = isAgent ? 'outbound' : 'inbound';
  
  // Extract quoted blocks
  const quotedBlocks = parsedContent.quotedBlocks;
  
  const result: NormalizedMessage = {
    id: rawMessage.id,
    dedupKey: '', // Will be set below
    createdAt: rawMessage.created_at,
    channel,
    from,
    to,
    cc: cc.length ? cc : undefined,
    bcc: bcc.length ? bcc : undefined,
    subject,
    direction,
    authorType,
    authorLabel,
    avatarInitial: initial,
    visibleBody: parsedContent.visibleContent,
    quotedBlocks: quotedBlocks?.length > 0 ? quotedBlocks : undefined,
    originalMessage: {
      ...rawMessage,
      _quotedMessages: parsedContent.quotedMessages
    }
  };

  // Generate stable dedup key after we have the normalized message
  result.dedupKey = generateStableDedupKey(rawMessage, result);

  return result;
}


/**
 * Generate stable dedup key with 3-step fallback chain
 */
function generateStableDedupKey(raw: any, norm: NormalizedMessage): string {
  // Prefer IDs in your stored headers JSON
  const hdr = raw.email_headers || raw.headers || {};
  const explicit =
    raw.external_id ||
    raw.message_id ||
    hdr['Message-ID'] || hdr['Message-Id'] || hdr['X-Message-Id'] || raw.email_message_id;
  if (explicit) return `id:${String(explicit)}`;

  // Fallback: content hash + author + 2-min bucket
  const content = normalizeText(norm.visibleBody);
  const bucket = roundTo2Min(norm.createdAt);
  return `ch:${simpleHash(`${norm.authorType}|${content}|${bucket}`)}`;
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
