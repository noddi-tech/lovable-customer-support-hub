/**
 * Canonical message model and normalization utilities
 * Provides consistent author attribution and content parsing
 */

import { parseQuotedEmail, type QuotedBlock, type QuotedMessage } from './parseQuotedEmail';

// Helper function to parse raw email header string (e.g., "From: ...\nSubject: ...\n")
function parseRawHeaders(raw: string): Record<string, any> {
  const headers: Record<string, any> = {};
  const lines = raw.split('\n');
  let currentHeader = '';
  let currentValue = '';
  
  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) {
      continue;
    }
    
    // Check if line starts a new header (contains ':' and doesn't start with whitespace)
    if (line.match(/^[^\s:]+:/) && !line.startsWith(' ') && !line.startsWith('\t')) {
      // Save previous header if exists
      if (currentHeader) {
        headers[currentHeader] = currentValue.trim();
      }
      
      // Parse new header
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        currentHeader = line.substring(0, colonIndex).trim();
        currentValue = line.substring(colonIndex + 1).trim();
      }
    } else if (currentHeader && (line.startsWith(' ') || line.startsWith('\t'))) {
      // Continuation of previous header (folded header)
      currentValue += ' ' + line.trim();
    }
  }
  
  // Save last header
  if (currentHeader) {
    headers[currentHeader] = currentValue.trim();
  }
  
  return headers;
}

// Robust header parsing helpers
function safeParseHeaders(h: unknown): Record<string, any> {
  if (!h) return {};
  
  // If it's a string, try to parse as JSON
  if (typeof h === 'string') {
    try { 
      const o = JSON.parse(h); 
      if (typeof o === 'object' && o) {
        // Check if it has a 'raw' field with header string
        if (typeof o.raw === 'string') {
          try {
            return parseRawHeaders(o.raw);
          } catch (parseError) {
            console.error('[safeParseHeaders] Failed to parse raw headers:', parseError);
            return {}; // Fallback to empty
          }
        }
        return o as any;
      }
      return {};
    } catch { 
      return {}; 
    }
  }
  
  // If it's an object
  if (typeof h === 'object' && h) {
    const obj = h as Record<string, any>;
    
    // Check if it has a 'raw' field with header string
    if (typeof obj.raw === 'string') {
      try {
        return parseRawHeaders(obj.raw);
      } catch (parseError) {
        console.error('[safeParseHeaders] Failed to parse raw headers object:', parseError);
        return {}; // Fallback to empty
      }
    }
    
    return obj;
  }
  
  return {};
}

function firstString(v: any): string | undefined {
  if (Array.isArray(v)) return v.find(x => typeof x === 'string')?.trim();
  return typeof v === 'string' ? v.trim() : undefined;
}

function getHeader(headers: Record<string, any>, key: string): string | undefined {
  const k = Object.keys(headers).find(h => h.toLowerCase() === key.toLowerCase());
  return k ? firstString(headers[k]) : undefined;
}

function extractNameEmail(input?: string) {
  if (!input) return { name: undefined, email: undefined };
  
  // CRITICAL: Strip HTML first before parsing
  const temp = document.createElement('div');
  temp.innerHTML = input;
  const cleaned = (temp.textContent || temp.innerText || input).trim();
  
  const s = cleaned.trim();
  // "Name" <email@host>  |  Name <email@host>  |  <email@host>  |  email@host
  const m1 = s.match(/^(?:"?([^"]+)"?\s*)?<([^>]+)>$/);
  if (m1) return { name: m1[1]?.trim(), email: m1[2].trim().toLowerCase() };
  if (s.includes('@')) return { name: undefined, email: s.toLowerCase() };
  return { name: s, email: undefined };
}

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
  agentDomainsSet: Set<string>;   // case-insensitive agent domains
  orgDomains?: string[];          // fallback org domains (now array)
  currentUserEmail?: string;      // fallback current user
  inboxEmail?: string;            // inbox email for agent messages
  conversationCustomerEmail?: string;  // conversation customer email
  conversationCustomerName?: string;   // conversation customer name
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
  agentDomains?: string[];
  orgDomain?: string;
  orgDomains?: string[];
  currentUserEmail?: string;
  inboxEmail?: string;
  conversationCustomerEmail?: string;
  conversationCustomerName?: string;
}): NormalizationContext {
  const allDomains = options.agentDomains || options.orgDomains || (options.orgDomain ? [options.orgDomain] : []);
  return {
    agentEmailSet: new Set((options.agentEmails ?? []).map(e => e.toLowerCase())),
    agentPhoneSet: new Set((options.agentPhones || []).map(p => p.trim())),
    agentDomainsSet: new Set((allDomains ?? []).map(d => d.toLowerCase())),
    orgDomains: allDomains,
    currentUserEmail: options.currentUserEmail?.toLowerCase().trim(),
    inboxEmail: options.inboxEmail?.toLowerCase().trim(),
    conversationCustomerEmail: options.conversationCustomerEmail?.toLowerCase().trim(),
    conversationCustomerName: options.conversationCustomerName?.trim(),
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
  
  const headers = safeParseHeaders(rawMessage.email_headers ?? rawMessage.headers ?? rawMessage.emailHeaders);

  // Try multiple header keys (case-insensitive)
  const fromLine =
    getHeader(headers, 'From') ??
    getHeader(headers, 'Sender') ??
    getHeader(headers, 'Reply-To') ??
    (typeof rawMessage.from === 'string' ? rawMessage.from : undefined) ??
    (typeof rawMessage.sender_email === 'string' ? rawMessage.sender_email : undefined);

  // Parse name/email
  let { name: fromName, email: fromEmail } = extractNameEmail(fromLine);

  // Fallbacks if header missing
  if (!fromEmail && typeof rawMessage.sender_id === 'string' && rawMessage.sender_id.includes('@')) {
    fromEmail = rawMessage.sender_id.toLowerCase();
  }
  if (!fromName && typeof rawMessage.sender_name === 'string') {
    fromName = rawMessage.sender_name.trim() || undefined;
  }

  // For SMS, we might have phone information
  if (channel === 'sms' && rawMessage.customer_phone && !fromEmail) {
    fromEmail = rawMessage.customer_phone; // Store phone as email for SMS
  }

  // Build display label (public) - sanitize to remove HTML
  const sanitizeName = (name: string | undefined) => {
    if (!name) return undefined;
    // Remove HTML tags and decode entities
    const temp = document.createElement('div');
    temp.innerHTML = name;
    return (temp.textContent || temp.innerText || name).trim();
  };
  
  const cleanFromName = sanitizeName(fromName);
  const cleanFromEmail = fromEmail?.toLowerCase();
  
  let authorLabel =
    (cleanFromName && cleanFromEmail) ? `${cleanFromName} <${cleanFromEmail}>`
    : (cleanFromEmail || cleanFromName || undefined);

  // Detect agent/customer using context
  const isAgent =
    (fromEmail && ctx.agentEmailSet?.has(fromEmail)) ||
    (fromEmail && ctx.agentDomainsSet?.has(fromEmail.split('@')[1]?.toLowerCase() ?? ''));

  const authorType: 'agent' | 'customer' | 'system' =
    isAgent ? 'agent' : ((rawMessage.sender_type as any) ?? 'customer');

  // Use conversation fallbacks only if still missing
  if (!authorLabel) {
    if (authorType === 'customer' && ctx.conversationCustomerEmail) {
      const e = ctx.conversationCustomerEmail.toLowerCase();
      const n = ctx.conversationCustomerName;
      fromEmail = fromEmail ?? e;
      fromName  = fromName  ?? n;
      authorLabel = (n && e) ? `${n} <${e}>` : (e || n);
    } else if (authorType === 'agent') {
      // Prefer inbox email over current user email for agent messages
      fromEmail = fromEmail ?? ctx.inboxEmail?.toLowerCase() ?? ctx.currentUserEmail?.toLowerCase();
      authorLabel = fromEmail || 'Agent';
    }
  }

  const displayAuthorLabel = authorLabel ?? 'Unknown sender';

  const from = { name: fromName, email: fromEmail, userId: rawMessage.sender_id };
  const to = parseAddressList(getHeader(headers, 'To') || rawMessage.to);
  const cc = parseAddressList(getHeader(headers, 'Cc') || rawMessage.cc);
  const bcc = parseAddressList(getHeader(headers, 'Bcc') || rawMessage.bcc);
  
  const subject = rawMessage.email_subject || getHeader(headers, 'Subject');
  
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
    authorLabel: displayAuthorLabel,
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
  // Special handling for quoted extracted messages
  if (raw.is_quoted_extraction) {
    return `quoted:${raw.parent_message_id}:${raw.quoted_index || 0}`;
  }
  
  // Prefer IDs in your stored headers JSON - prioritize email_message_id as it's unique per message
  const hdr = raw.email_headers || raw.headers || {};
  const explicit =
    raw.email_message_id ||
    hdr['Message-ID'] || hdr['Message-Id'] || hdr['X-Message-Id'] ||
    raw.message_id ||
    raw.external_id; // external_id is often a thread ID, not unique per message
  
  console.log('[dedupKey]', {
    messageId: raw.id,
    email_message_id: raw.email_message_id,
    external_id: raw.external_id,
    hasHeaderMessageId: !!(hdr['Message-ID'] || hdr['Message-Id']),
    generatedKey: explicit ? `id:${String(explicit)}` : 'content-hash'
  });
  
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

/**
 * Expand quoted messages into separate normalized message cards
 * This creates a flat list showing the full thread conversation
 */
export function expandQuotedMessagesToCards(
  messages: NormalizedMessage[], 
  ctx: NormalizationContext
): NormalizedMessage[] {
  const expanded: NormalizedMessage[] = [];
  
  for (const message of messages) {
    // Add the main message first
    expanded.push(message);
    
    // Extract quoted messages if present
    const quotedMessages = message.originalMessage._quotedMessages || [];
    
    for (let i = 0; i < quotedMessages.length; i++) {
      const quoted = quotedMessages[i];
      
      // Skip if confidence is too low
      if (quoted.confidence === 'low') {
        console.log('[expandQuoted] Skipping low confidence quoted message', {
          parentId: message.id,
          index: i,
          confidence: quoted.confidence
        });
        continue;
      }
      
      // Parse sender information
      const { name: fromName, email: fromEmail } = extractNameEmail(quoted.fromEmail || '');
      
      // Determine if this is an agent or customer
      const isAgent = isAgentEmail(fromEmail, ctx);
      
      // Create a normalized message from the quoted content
      const quotedNormalized: NormalizedMessage = {
        id: `${message.id}-quoted-${i}`,
        dedupKey: `quoted:${message.id}:${i}`,
        createdAt: quoted.sentAtIso || message.createdAt,
        channel: message.channel,
        from: { name: fromName, email: fromEmail },
        to: message.to,
        subject: message.subject,
        direction: isAgent ? 'outbound' : 'inbound',
        authorType: isAgent ? 'agent' : 'customer',
        authorLabel: fromName && fromEmail ? `${fromName} <${fromEmail}>` : (fromEmail || fromName || 'Unknown'),
        avatarInitial: (fromName || fromEmail || 'U')[0].toUpperCase(),
        visibleBody: quoted.bodyHtml || quoted.bodyText,
        originalMessage: {
          ...message.originalMessage,
          content: quoted.bodyHtml || quoted.bodyText,
          content_type: quoted.bodyHtml ? 'text/html' : 'text/plain',
          is_quoted_extraction: true,
          parent_message_id: message.id,
          quoted_index: i
        }
      };
      
      console.log('[expandQuoted] Created quoted message card', {
        id: quotedNormalized.id,
        dedupKey: quotedNormalized.dedupKey,
        authorType: quotedNormalized.authorType,
        from: quotedNormalized.from,
        confidence: quoted.confidence
      });
      
      expanded.push(quotedNormalized);
    }
  }
  
  return expanded;
}
