/**
 * Conversation threading utilities
 * Groups conversations that are part of the same email thread
 */

import { normalizeSubject } from './emailThreading';

export interface ThreadableConversation {
  id: string;
  subject: string;
  customer?: {
    email?: string;
    [key: string]: any;
  };
  updated_at: string;
  received_at?: string;
  [key: string]: any; // Allow other properties to pass through
}

/**
 * Normalize subject line for thread grouping
 * More aggressive than email threading - removes all Re:, Fwd:, SV:, etc.
 */
function normalizeSubjectForThreading(subject: string): string {
  if (!subject) return '';
  
  return subject
    .replace(/^(re:|fwd?:|fw:|aw:|sv:|vs:)\s*/gi, '') // Remove all reply/forward prefixes
    .replace(/\[.*?\]/g, '') // Remove bracketed content like [External]
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim()
    .toLowerCase();
}

/**
 * Generate a thread key for grouping conversations
 */
function generateThreadKey(conversation: ThreadableConversation): string {
  const customerEmail = conversation.customer?.email?.toLowerCase().trim() || '';
  const normalizedSubject = normalizeSubjectForThreading(conversation.subject || '');
  
  // Thread key: customer email + normalized subject
  // This groups all conversations from the same customer about the same topic
  return `${customerEmail}::${normalizedSubject}`;
}

/**
 * Group conversations by thread
 * Returns the most recent conversation from each thread with thread metadata
 * 
 * @template T The conversation type (extends ThreadableConversation)
 * @param conversations Array of conversations to group
 * @returns Array of conversations with thread metadata added
 */
export function groupConversationsByThread<T extends ThreadableConversation>(
  conversations: T[]
): (T & { thread_count?: number; thread_ids?: string[]; is_thread_representative?: boolean })[] {
  if (!conversations || conversations.length === 0) {
    return [];
  }
  
  // Group conversations by thread key
  const threadMap = new Map<string, T[]>();
  
  for (const conv of conversations) {
    const threadKey = generateThreadKey(conv);
    
    if (!threadMap.has(threadKey)) {
      threadMap.set(threadKey, []);
    }
    
    threadMap.get(threadKey)!.push(conv);
  }
  
  // For each thread, select the most recent conversation as representative
  const representatives: (T & { thread_count?: number; thread_ids?: string[]; is_thread_representative?: boolean })[] = [];
  
  for (const [threadKey, threadConversations] of threadMap.entries()) {
    // Sort by received_at (or updated_at as fallback) descending
    const sorted = threadConversations.sort((a, b) => {
      const dateA = new Date(a.received_at || a.updated_at).getTime();
      const dateB = new Date(b.received_at || b.updated_at).getTime();
      return dateB - dateA; // Most recent first
    });
    
    // Take the most recent conversation as the representative
    const representative = sorted[0];
    
    // Add thread metadata
    const threadedConv = {
      ...representative,
      thread_count: threadConversations.length,
      thread_ids: threadConversations.map(c => c.id),
      is_thread_representative: true,
    };
    
    representatives.push(threadedConv);
  }
  
  // Sort representatives by date (most recent first)
  representatives.sort((a, b) => {
    const dateA = new Date(a.received_at || a.updated_at).getTime();
    const dateB = new Date(b.received_at || b.updated_at).getTime();
    return dateB - dateA;
  });
  
  return representatives;
}

/**
 * Check if threading should be applied based on conversation characteristics
 */
export function shouldGroupConversations(conversations: ThreadableConversation[]): boolean {
  // Don't group if we have very few conversations
  if (conversations.length < 2) {
    return false;
  }
  
  // Check if there are any conversations that would benefit from grouping
  // (same customer + similar subject)
  const threadKeys = new Set<string>();
  let hasDuplicates = false;
  
  for (const conv of conversations) {
    const key = generateThreadKey(conv);
    if (threadKeys.has(key)) {
      hasDuplicates = true;
      break;
    }
    threadKeys.add(key);
  }
  
  return hasDuplicates;
}
