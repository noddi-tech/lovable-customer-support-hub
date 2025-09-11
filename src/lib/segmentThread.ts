import { NormalizedMessage } from './normalizeMessage';
import type { QuotedMessage } from './parseQuotedEmail';

interface SegmentationOptions {
  agentEmails?: string[];
  currentUserEmail?: string;
}

/**
 * Determine if an email belongs to an agent
 */
function isAgentEmail(email: string | undefined, opts: SegmentationOptions): boolean {
  if (!email) return false;
  
  const normalizedEmail = email.toLowerCase().trim();
  
  // Check against current user email
  if (opts.currentUserEmail && normalizedEmail === opts.currentUserEmail.toLowerCase().trim()) {
    return true;
  }
  
  // Check against known agent emails
  if (opts.agentEmails) {
    const agentEmailsSet = new Set(opts.agentEmails.map(e => e.toLowerCase().trim()));
    if (agentEmailsSet.has(normalizedEmail)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Generate author label for a quoted message
 */
function generateAuthorLabel(quotedMsg: QuotedMessage, authorType: 'agent' | 'customer'): string {
  if (authorType === 'agent') {
    if (quotedMsg.fromName) {
      return quotedMsg.fromEmail ? `${quotedMsg.fromName} (${quotedMsg.fromEmail})` : quotedMsg.fromName;
    } else if (quotedMsg.fromEmail) {
      return `Agent (${quotedMsg.fromEmail})`;
    } else {
      return 'Agent';
    }
  } else {
    if (quotedMsg.fromName) {
      return quotedMsg.fromName;
    } else if (quotedMsg.fromEmail) {
      return quotedMsg.fromEmail;
    } else {
      return 'Customer';
    }
  }
}

/**
 * Convert a single message with quoted blocks into multiple message cards
 * Returns cards in DESC order (newest first)
 */
export function segmentMessageIntoCards(
  msg: NormalizedMessage,
  opts: SegmentationOptions = {}
): NormalizedMessage[] {
  const cards: NormalizedMessage[] = [];
  
  // 1) Start with the top-level message as the first card
  cards.push(msg);
  
  // 2) For each quoted message, create a synthetic card
  if (msg.quotedBlocks && msg.quotedBlocks.length > 0) {
    // Access quotedMessages from the original parsing result
    const quotedMessages = (msg.originalMessage as any)?._quotedMessages as QuotedMessage[] | undefined;
    
    if (quotedMessages) {
      quotedMessages.forEach((quotedMsg, index) => {
        // Determine author type
        const authorType = isAgentEmail(quotedMsg.fromEmail, opts) ? 'agent' : 'customer';
        const direction = authorType === 'agent' ? 'outbound' : 'inbound';
        
        // Generate author label
        const authorLabel = generateAuthorLabel(quotedMsg, authorType);
        
        // Use quoted message's timestamp if available, otherwise fallback to parent's timestamp
        const createdAt = quotedMsg.sentAtIso || msg.createdAt;
        
        // Create synthetic normalized message
        const syntheticCard: NormalizedMessage = {
          id: `${msg.id}::q${index}`,
          dedupKey: `quoted:${msg.id}:${index}`,
          createdAt,
          channel: msg.channel,
          from: {
            email: quotedMsg.fromEmail,
            name: quotedMsg.fromName,
          },
          to: [],
          direction,
          authorType,
          authorLabel,
          visibleBody: quotedMsg.bodyHtml || quotedMsg.bodyText,
          quotedBlocks: undefined, // Quoted cards never expose deeper quotes
          originalMessage: {
            ...msg.originalMessage,
            _syntheticQuoted: true,
          }
        };
        
        cards.push(syntheticCard);
      });
    }
  }
  
  // 3) Sort cards by timestamp DESC (newest first)
  cards.sort((a, b) => {
    const timeA = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt;
    const timeB = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt;
    return timeB - timeA;
  });
  
  return cards;
}