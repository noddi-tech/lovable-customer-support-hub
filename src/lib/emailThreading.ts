/**
 * Email threading utilities for building conversation threads
 * Handles Message-ID, In-Reply-To, References parsing and normalization
 */

export interface ThreadSeed {
  messageIds: Set<string>;      // All Message-IDs from initial messages
  references: Set<string>;      // All references from initial messages  
  normalizedSubject: string;    // Normalized subject line
  participants: Set<string>;    // Email addresses involved (case-insensitive)
}

export interface MessageThreadInfo {
  messageId?: string;
  inReplyTo?: string;
  references: string[];
}

/**
 * Normalize subject line by removing Re:, Fwd: prefixes and normalizing whitespace
 */
export function normalizeSubject(subject: string): string {
  if (!subject) return '';
  
  return subject
    .replace(/^(re:|fwd?:|fw:|aw:)\s*/gi, '') // Remove prefixes
    .replace(/\s+/g, ' ')                     // Collapse whitespace
    .trim()
    .toLowerCase();
}

/**
 * Extract Message-ID, In-Reply-To, and References from email headers
 */
export function extractMessageIds(headers: any): MessageThreadInfo {
  if (!headers) return { references: [] };
  
  // Handle both array format and object format
  let messageId: string | undefined;
  let inReplyTo: string | undefined;
  let references: string[] = [];
  
  if (Array.isArray(headers)) {
    // Headers as array of {name, value} objects
    for (const header of headers) {
      const name = header.name?.toLowerCase();
      const value = header.value;
      
      if (name === 'message-id') {
        messageId = cleanMessageId(value);
      } else if (name === 'in-reply-to') {
        inReplyTo = cleanMessageId(value);
      } else if (name === 'references') {
        references = parseReferences(value);
      }
    }
  } else if (headers.raw && typeof headers.raw === 'string') {
    // Parse raw header text (line by line)
    const lines = headers.raw.split('\n');
    let currentHeader = '';
    let currentValue = '';
    
    for (const line of lines) {
      // Check if line starts a new header (doesn't start with whitespace)
      if (line.match(/^[a-z-]+:/i)) {
        // Process previous header
        if (currentHeader && currentValue) {
          const headerLower = currentHeader.toLowerCase();
          if (headerLower === 'message-id') {
            messageId = cleanMessageId(currentValue);
          } else if (headerLower === 'in-reply-to') {
            inReplyTo = cleanMessageId(currentValue);
          } else if (headerLower === 'references') {
            references = parseReferences(currentValue);
          }
        }
        
        // Start new header
        const colonIndex = line.indexOf(':');
        currentHeader = line.substring(0, colonIndex).trim();
        currentValue = line.substring(colonIndex + 1).trim();
      } else if (currentHeader) {
        // Continuation of previous header (folded line)
        currentValue += ' ' + line.trim();
      }
    }
    
    // Process last header
    if (currentHeader && currentValue) {
      const headerLower = currentHeader.toLowerCase();
      if (headerLower === 'message-id') {
        messageId = cleanMessageId(currentValue);
      } else if (headerLower === 'in-reply-to') {
        inReplyTo = cleanMessageId(currentValue);
      } else if (headerLower === 'references') {
        references = parseReferences(currentValue);
      }
    }
  } else {
    // Headers as object
    messageId = cleanMessageId(headers['Message-ID'] || headers['Message-Id'] || headers['message-id']);
    inReplyTo = cleanMessageId(headers['In-Reply-To'] || headers['in-reply-to']);
    references = parseReferences(headers['References'] || headers['references']);
  }
  
  return { messageId, inReplyTo, references };
}

/**
 * Clean and normalize a Message-ID
 */
function cleanMessageId(messageId: string | undefined): string | undefined {
  if (!messageId) return undefined;
  
  // Remove angle brackets and trim
  return messageId.replace(/^<|>$/g, '').trim() || undefined;
}

/**
 * Parse References header into array of message IDs
 */
function parseReferences(referencesHeader: string | undefined): string[] {
  if (!referencesHeader) return [];
  
  // References can be space or comma separated, and may have angle brackets
  return referencesHeader
    .split(/[,\s]+/)
    .map(ref => ref.replace(/^<|>$/g, '').trim())
    .filter(ref => ref.length > 0);
}

/**
 * Extract email address from header string like "Name <email@domain.com>"
 */
export function extractEmailAddress(headerValue: string): string {
  if (!headerValue) return '';
  
  // Try to extract from angle brackets first
  const emailMatch = headerValue.match(/<([^>]+)>/);
  if (emailMatch) {
    return emailMatch[1].trim();
  }
  
  // If no brackets, assume the whole string is an email
  // Basic email validation
  if (headerValue.includes('@')) {
    return headerValue.trim();
  }
  
  return '';
}

/**
 * Canonicalize email address for comparison (lowercase, trimmed)
 */
export function canonicalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Build thread seed from initial messages
 */
export function buildThreadSeed(
  messages: Array<{
    email_headers?: any;
    email_subject?: string;
    sender_type?: string;
    conversation?: { customer?: { email?: string } };
    // Add other fields as needed for participant extraction
  }>,
  inboxEmail?: string
): ThreadSeed {
  const messageIds = new Set<string>();
  const references = new Set<string>();
  const participants = new Set<string>();
  let normalizedSubject = '';
  
  for (const message of messages) {
    const threadInfo = extractMessageIds(message.email_headers);
    
    // Collect Message-IDs and references
    if (threadInfo.messageId) {
      messageIds.add(threadInfo.messageId);
    }
    if (threadInfo.inReplyTo) {
      references.add(threadInfo.inReplyTo);
    }
    threadInfo.references.forEach(ref => references.add(ref));
    
    // Extract normalized subject (use first non-empty one)
    if (!normalizedSubject && message.email_subject) {
      normalizedSubject = normalizeSubject(message.email_subject);
    }
    
    // Extract participants
    if (message.conversation?.customer?.email) {
      participants.add(canonicalizeEmail(message.conversation.customer.email));
    }
    if (inboxEmail) {
      participants.add(canonicalizeEmail(inboxEmail));
    }
    
    // TODO: Extract more participant emails from To/CC headers when available
  }
  
  return {
    messageIds,
    references,
    normalizedSubject,
    participants
  };
}

/**
 * Build Supabase query filter for thread messages
 */
export function buildThreadFilter(
  supabaseQuery: any,
  seed: ThreadSeed,
  opts: { windowDays?: number } = {}
) {
  const windowDays = opts.windowDays || 90;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - windowDays);
  
  // Build the OR conditions for thread matching
  const conditions: string[] = [];
  
  // Condition 1: In-Reply-To matches any of our Message-IDs
  if (seed.messageIds.size > 0) {
    const messageIdArray = Array.from(seed.messageIds);
    conditions.push(`email_headers->'In-Reply-To' ?| array[${messageIdArray.map(id => `'${id}'`).join(',')}]`);
  }
  
  // Condition 2: Message-ID matches any of our references
  if (seed.references.size > 0) {
    const referencesArray = Array.from(seed.references);
    conditions.push(`email_headers->'Message-ID' ?| array[${referencesArray.map(id => `'${id}'`).join(',')}]`);
  }
  
  // Condition 3: References contain any of our Message-IDs (JSON contains check)
  if (seed.messageIds.size > 0) {
    seed.messageIds.forEach(msgId => {
      conditions.push(`email_headers->'References' ? '${msgId}'`);
    });
  }
  
  // For now, let's use a simpler approach with basic Supabase operators
  // We'll implement the complex JSON operations as separate filters
  
  let query = supabaseQuery;
  
  // Time window filter
  query = query.gte('created_at', cutoffDate.toISOString());
  
  // For subject fallback, we'll check it separately since Supabase has limitations
  // on complex OR conditions across different column types
  
  return query;
}

/**
 * Check if a message belongs to the thread (fallback logic)
 */
export function messageMatchesThread(
  message: {
    email_headers?: any;
    email_subject?: string;
    sender_type?: string;
    conversation?: { customer?: { email?: string } };
  },
  seed: ThreadSeed,
  inboxEmail?: string
): boolean {
  const threadInfo = extractMessageIds(message.email_headers);
  
  // Check Message-ID/References matching
  if (threadInfo.messageId && seed.references.has(threadInfo.messageId)) {
    return true;
  }
  
  if (threadInfo.inReplyTo && seed.messageIds.has(threadInfo.inReplyTo)) {
    return true;
  }
  
  // Check if any references match our message IDs
  const hasMatchingRef = threadInfo.references.some(ref => seed.messageIds.has(ref));
  if (hasMatchingRef) {
    return true;
  }
  
  // Subject + participant fallback
  if (seed.normalizedSubject && message.email_subject) {
    const msgSubject = normalizeSubject(message.email_subject);
    if (msgSubject === seed.normalizedSubject) {
      // Check if participants match
      const msgParticipants = new Set<string>();
      if (message.conversation?.customer?.email) {
        msgParticipants.add(canonicalizeEmail(message.conversation.customer.email));
      }
      if (inboxEmail) {
        msgParticipants.add(canonicalizeEmail(inboxEmail));
      }
      
      // Check if there's participant overlap
      for (const participant of msgParticipants) {
        if (seed.participants.has(participant)) {
          return true;
        }
      }
    }
  }
  
  return false;
}