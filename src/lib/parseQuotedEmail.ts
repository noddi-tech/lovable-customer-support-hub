// Robust quoted-reply extraction for HTML and plain text emails
// Returns the content that should be shown in the card (visibleContent)
// and a list of quoted blocks (for optional "Show quoted history")

// Never promote quoted blocks into cards
export const ENABLE_QUOTED_SEGMENTATION = false;

// Feature flag for showing quoted content in UI
const SHOW_QUOTED = import.meta.env.VITE_QUOTED_SEGMENTATION === '1' && false;

export type QuotedBlock = {
  kind: 'gmail' | 'outlook' | 'apple' | 'yahoo' | 'blockquote' | 'header' | 'plain';
  raw: string;
};

export interface QuotedMessage {
  bodyHtml: string;           // HTML of the quoted email body
  bodyText: string;           // plain text version
  headers?: Record<string,string>; // parsed headers if available
  fromEmail?: string;
  fromName?: string;
  sentAtIso?: string;         // ISO date if detected
  vendor?: 'gmail' | 'outlook' | 'apple' | 'generic';
  confidence: 'high'|'medium'|'low';
}

type Input = { content: string; contentType?: string };

const WROTE_HEADERS = [
  // English
  /^On .+ wrote:$/i,
  /^-----Original Message-----$/i,
  /^From: .+\n(?:Sent|Date): .+\n(?:To|Cc): .+\n(?:Subject|Re): .+$/i,
  // Norwegian
  /^(Den|På) .+ skrev:$/i,
  /^Fra: .+\n(?:Sendt|Dato): .+\n(?:Til|Kopi): .+\n(?:Emne|Re): .+$/i,
  /^Skrev .+:$/i,
];

// Common email list footer patterns to strip
const EMAIL_LIST_FOOTERS = [
  // Google Groups specific
  /To unsubscribe from this group and stop receiving emails from it,?\s*send an email to .+?@.+?\./i,
  /You received this message because you are subscribed to the Google Groups .+ group\./i,
  /To view this discussion (?:on the web )?visit https?:\/\/groups\.google\.com\/.+/i,
  /To post to this group, send email to .+?@.+?\./i,
  
  // Generic mailing list footers
  /^--+\s*$/m, // Standard email signature delimiter
  /To unsubscribe,?\s*(?:click here|visit|send an email to).+/i,
  /^Unsubscribe:.+$/im,
  /^You (?:are receiving|received) this (?:email|message) because.+$/im,
  
  // Other platforms
  /Click here to unsubscribe/i,
  /Update your email preferences/i,
  /Manage (?:your )?subscription/i,
];

/**
 * Remove email list footers from text content.
 * Searches for the first matching footer pattern and removes everything from that point onward.
 */
function stripEmailListFooters(text: string): string {
  let cleaned = text;
  let earliestMatch: { index: number; pattern: RegExp } | null = null;
  
  // Find the earliest matching footer pattern
  for (const pattern of EMAIL_LIST_FOOTERS) {
    const match = cleaned.match(pattern);
    if (match && match.index !== undefined) {
      if (!earliestMatch || match.index < earliestMatch.index) {
        earliestMatch = { index: match.index, pattern };
      }
    }
  }
  
  // If we found a footer, cut at that point
  if (earliestMatch) {
    cleaned = cleaned.slice(0, earliestMatch.index).trim();
  }
  
  return cleaned;
}

function stripHtmlComments(s: string) {
  return s.replace(/<!--[\s\S]*?-->/g, '');
}

function normalizeWhitespace(s: string) {
  return s.replace(/\r\n/g, '\n').replace(/\u00A0/g, ' ').replace(/[ \t]+/g, ' ').trim();
}

function htmlToDocument(html: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}

/**
 * Extract quoted blocks from HTML by removing known containers and blockquotes.
 * Returns [visibleHTML, quotedBlocks]
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function parseQuotedHeaders(raw: string, kind: QuotedBlock['kind']): QuotedMessage {
  const bodyHtml = raw;
  const bodyText = stripHtmlTags(raw);
  
  let fromEmail: string | undefined;
  let fromName: string | undefined;
  let sentAtIso: string | undefined;
  let vendor: QuotedMessage['vendor'] = 'generic';
  let confidence: QuotedMessage['confidence'] = 'low';

  // Gmail patterns
  if (kind === 'gmail') {
    vendor = 'gmail';
    // Look for "On ... <email> wrote:" pattern
    const gmailMatch = raw.match(/On .+?(\d{4}).+?<([^>]+)>.+?wrote:/i);
    if (gmailMatch) {
      fromEmail = gmailMatch[2];
      confidence = 'high';
    }
    // Look for name patterns
    const nameMatch = raw.match(/On .+?,\s*(.+?)\s*<[^>]+>.+?wrote:/i);
    if (nameMatch) {
      fromName = nameMatch[1].trim();
    }
  }
  
  // Outlook patterns
  else if (kind === 'outlook') {
    vendor = 'outlook';
    // Look for "From:" headers
    const fromMatch = raw.match(/From:\s*(.+?)(?:\n|<br|$)/i);
    if (fromMatch) {
      const fromValue = fromMatch[1].trim();
      const emailMatch = fromValue.match(/<([^>]+)>/);
      const nameMatch = fromValue.match(/^([^<]+)</);
      
      fromEmail = emailMatch ? emailMatch[1] : fromValue;
      fromName = nameMatch ? nameMatch[1].trim().replace(/"/g, '') : undefined;
      confidence = 'high';
    }
    
    // Look for "Sent:" or "Date:" headers
    const dateMatch = raw.match(/(?:Sent|Date):\s*(.+?)(?:\n|<br|$)/i);
    if (dateMatch) {
      const dateStr = dateMatch[1].trim();
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        sentAtIso = parsedDate.toISOString();
      }
    }
  }
  
  // Header-based patterns (Norwegian, English)
  else if (kind === 'header') {
    // Norwegian patterns
    const norMatch = raw.match(/^(Den|På)\s+(.+?)\s+skrev\s+(.+?):/i);
    if (norMatch) {
      fromEmail = norMatch[3].trim();
      const dateStr = norMatch[2].trim();
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        sentAtIso = parsedDate.toISOString();
      }
      confidence = 'medium';
    }
    
    // Simple "Wrote ..." pattern
    const wroteMatch = raw.match(/Skrev\s+(.+?):/i);
    if (wroteMatch) {
      fromEmail = wroteMatch[1].trim();
      confidence = 'medium';
    }
  }

  return {
    bodyHtml,
    bodyText,
    fromEmail,
    fromName,
    sentAtIso,
    vendor,
    confidence
  };
}

function extractFromHtml(html: string): { visibleHTML: string; quoted: QuotedBlock[]; quotedMessages: QuotedMessage[] } {
  const quoted: QuotedBlock[] = [];
  const quotedMessages: QuotedMessage[] = [];
  const doc = htmlToDocument(stripHtmlComments(html));
  const body = doc.body;

  // Known quoted containers (Gmail/Outlook/Apple/Yahoo)
  const selectors = [
    'div.gmail_quote', '.gmail_quote', '.gmail_extra', '.gmail_attr',
    '.yahoo_quoted', 'div.yahoo_quoted',
    '.AppleMailQuote', '.moz-cite-prefix', '.moz-signature',
    'blockquote[type="cite"]', 'blockquote',
    // Outlook often wraps original with a top border container
    'div[style*="border-top:1px solid #ccc"]',
    'div[style*="border-top: 1px solid #ccc"]',
    'div[style*="border-top:1pt solid"]',
  ];

  // Collect and remove nodes
  selectors.forEach(sel => {
    body.querySelectorAll(sel).forEach((node) => {
      const raw = (node as HTMLElement).outerHTML || node.textContent || '';
      // classify best-effort
      const kind: QuotedBlock['kind'] =
        sel.includes('gmail') ? 'gmail'
      : sel.includes('yahoo') ? 'yahoo'
      : sel.includes('AppleMail') ? 'apple'
      : sel.includes('moz') ? 'apple'
      : sel.startsWith('blockquote') ? 'blockquote'
      : sel.includes('border-top') ? 'outlook'
      : 'plain';
      
      const quotedBlock = { kind, raw };
      quoted.push(quotedBlock);
      
      // Parse into structured message
      const quotedMessage = parseQuotedHeaders(raw, kind);
      quotedMessages.push(quotedMessage);
      
      node.remove();
    });
  });

  // Fallback: detect header markers inside remaining HTML text and split
  const remaining = body.innerText || '';
  const lines = remaining.split('\n');
  const headerIdx = lines.findIndex(line => WROTE_HEADERS.some(rx => rx.test(line.trim())));
  if (headerIdx > -1) {
    const raw = lines.slice(headerIdx).join('\n');
    const quotedBlock = { kind: 'header' as const, raw };
    quoted.push(quotedBlock);
    
    // Parse into structured message
    const quotedMessage = parseQuotedHeaders(raw, 'header');
    quotedMessages.push(quotedMessage);
    
    // remove that section from DOM text by cutting innerHTML after that marker
    // Simple approach: cut body.innerHTML at the start of that line's text
    const marker = lines[headerIdx].trim();
    const idxInHtml = body.innerHTML.indexOf(marker);
    if (idxInHtml >= 0) {
      body.innerHTML = body.innerHTML.slice(0, idxInHtml);
    }
  }

  // Strip email list footers from the visible content
  const bodyText = body.innerText || '';
  const cleanedText = stripEmailListFooters(bodyText);
  
  return { visibleHTML: cleanedText, quoted, quotedMessages };
}

/**
 * Extract quoted blocks from plain text.
 * Returns [visibleText, quotedBlocks]
 */
function extractFromPlain(text: string): { visibleText: string; quoted: QuotedBlock[]; quotedMessages: QuotedMessage[] } {
  const quoted: QuotedBlock[] = [];
  const quotedMessages: QuotedMessage[] = [];
  const lines = text.split('\n');

  // If there are any ">"-prefixed lines, treat the first block of them and below as quoted
  const angleIdx = lines.findIndex(l => l.trim().startsWith('>'));
  // Or find classic header lines (On ... wrote:, Original Message, Norwegian variants)
  const headerIdx = lines.findIndex(l => WROTE_HEADERS.some(rx => rx.test(l.trim())));

  let cut = -1;
  if (headerIdx > -1) cut = headerIdx;
  else if (angleIdx > -1) cut = angleIdx;

  if (cut > -1) {
    const kind = headerIdx > -1 ? 'header' : 'plain';
    const raw = lines.slice(cut).join('\n');
    const quotedBlock = { kind: kind as 'header' | 'plain', raw };
    quoted.push(quotedBlock);
    
    // Parse into structured message
    const quotedMessage = parseQuotedHeaders(raw, kind as 'header' | 'plain');
    quotedMessages.push(quotedMessage);
  }

  const visible = cut > -1 ? lines.slice(0, cut).join('\n') : lines.join('\n');

  // Also drop any trailing quote-style lines from the visible preview
  const pruned = visible
    .split('\n')
    .filter(l => !l.trim().startsWith('>'))
    .join('\n');

  // Strip email list footers from the visible text
  const cleanedVisible = stripEmailListFooters(pruned.trim());

  return { visibleText: cleanedVisible, quoted, quotedMessages };
}

/**
 * Public API
 */
export function parseQuotedEmail(input: Input): { visibleContent: string; quotedBlocks: QuotedBlock[]; quotedMessages: QuotedMessage[] } {
  const contentType = (input.contentType || '').toLowerCase();
  const content = input.content || '';

  if (contentType.includes('html') || /<\/?[a-z][\s\S]*>/i.test(content)) {
    const { visibleHTML, quoted, quotedMessages } = extractFromHtml(content);
    return { 
      visibleContent: visibleHTML.trim(), 
      quotedBlocks: SHOW_QUOTED ? quoted : [],
      quotedMessages: SHOW_QUOTED ? quotedMessages : []
    };
  }

  // Plain text
  const { visibleText, quoted, quotedMessages } = extractFromPlain(normalizeWhitespace(content));
  return { 
    visibleContent: visibleText, 
    quotedBlocks: SHOW_QUOTED ? quoted : [],
    quotedMessages: SHOW_QUOTED ? quotedMessages : []
  };
}