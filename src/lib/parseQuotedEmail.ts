// Robust quoted-reply extraction for HTML and plain text emails
// Returns the content that should be shown in the card (visibleContent)
// and a list of quoted blocks (for optional "Show quoted history")

// Feature flag: Enable thread extraction - expand quoted messages into separate cards
export const ENABLE_QUOTED_EXTRACTION = true; // Thread view enabled - splits replies into separate cards // Set to true to enable thread view

// Never promote quoted blocks into cards (deprecated, use ENABLE_QUOTED_EXTRACTION)
export const ENABLE_QUOTED_SEGMENTATION = false;

// Feature flag for showing quoted content in UI
const SHOW_QUOTED = true; // Always parse quoted messages so they're available for extraction

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
 * Strip email client wrapper elements (like <pre> tags) that wrap entire content
 */
function stripEmailClientWrappers(body: HTMLElement): void {
  console.log('[stripEmailClientWrappers] Starting - body children:', body.children.length);
  
  // Check if the entire body is wrapped in a single <pre> or <div>
  const children = Array.from(body.children);
  
  // If there's only one child and it's a wrapper element
  if (children.length === 1) {
    const onlyChild = children[0];
    
    // Check if it's a wrapper <pre> or <div> with specific characteristics
    if (
      (onlyChild.tagName === 'PRE' && !onlyChild.querySelector('code')) ||
      (onlyChild.tagName === 'DIV' && onlyChild.childElementCount === 0 && onlyChild.textContent)
    ) {
      console.log('[stripEmailClientWrappers] Unwrapping single wrapper:', onlyChild.tagName);
      // Unwrap: replace body content with the inner content
      body.innerHTML = onlyChild.innerHTML;
    }
  }
  
  // Handle all <pre> elements that don't contain <code> (email client formatting)
  // Don't use :has() - manually check each pre element
  const preElements = Array.from(body.querySelectorAll('pre'));
  console.log('[stripEmailClientWrappers] Found pre elements:', preElements.length);
  
  preElements.forEach((pre, index) => {
    // Manually check if pre contains a code element
    const hasCodeChild = pre.querySelector('code') !== null;
    console.log(`[stripEmailClientWrappers] Pre element ${index}: hasCode=${hasCodeChild}`);
    
    if (!hasCodeChild) {
      // If pre doesn't contain code, it's email client formatting - replace with div
      const div = document.createElement('div');
      div.innerHTML = pre.innerHTML;
      div.style.whiteSpace = 'pre-wrap';
      div.className = 'email-client-content'; // Add class for styling
      pre.replaceWith(div);
      console.log(`[stripEmailClientWrappers] Replaced pre ${index} with div`);
    }
  });
  
  console.log('[stripEmailClientWrappers] Complete - body children:', body.children.length);
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

  // STEP 0: Strip email client wrapper elements
  stripEmailClientWrappers(body);

  // STEP 1: Detect Outlook-specific separators and remove everything AFTER them
  // The reply content is BEFORE the separator, quoted content is AFTER
  const outlookSeparators = [
    body.querySelector('#divRplyFwdMsg'),
    // Note: #ms-outlook-mobile-body-separator-line appears BEFORE the reply, not after
    // Note: #ms-outlook-mobile-signature is part of the reply, not a separator
    ...Array.from(body.querySelectorAll('hr[style*="display:inline-block"]')),
    ...Array.from(body.querySelectorAll('hr[style*="width:98"]'))
  ].filter(Boolean);

  console.log('[parseQuotedEmail] Found Outlook separators:', outlookSeparators.length);

  if (outlookSeparators.length > 0) {
    // Sort separators by DOM position to find the TRUE first separator
    const sortedSeparators = outlookSeparators.sort((a, b) => {
      const position = (a as Element).compareDocumentPosition(b as Element);
      return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
    
    const firstSeparator = sortedSeparators[0] as Element;
    
    console.log('[parseQuotedEmail] First separator:', (firstSeparator as HTMLElement).id || firstSeparator.tagName);
    
    // Collect everything AFTER the separator as quoted content
    let quotedHTML = '';
    let currentNode = firstSeparator.nextSibling;
    
    // First, collect the quoted HTML
    while (currentNode) {
      if (currentNode.nodeType === 1) { // Element node
        quotedHTML += (currentNode as Element).outerHTML || '';
      } else if (currentNode.nodeType === 3) { // Text node
        quotedHTML += currentNode.textContent || '';
      }
      currentNode = currentNode.nextSibling;
    }
    
    // Now remove the separator and everything after it
    currentNode = firstSeparator;
    while (currentNode) {
      const next = currentNode.nextSibling;
      currentNode.parentNode?.removeChild(currentNode);
      currentNode = next;
    }
    
    console.log('[parseQuotedEmail] Removed separator and collected quoted HTML:', quotedHTML.length, 'chars');
    
    if (quotedHTML.trim()) {
      quoted.push({ kind: 'outlook', raw: quotedHTML });
      const quotedMessage = parseQuotedHeaders(quotedHTML, 'outlook');
      quotedMessages.push(quotedMessage);
    }
  }

  // STEP 2: Remove other known quoted containers (Gmail, Yahoo, Apple, blockquotes)
  const selectors = [
    'div.gmail_quote', '.gmail_quote', '.gmail_extra', '.gmail_attr',
    '.yahoo_quoted', 'div.yahoo_quoted',
    '.AppleMailQuote', '.moz-cite-prefix', '.moz-signature',
    'blockquote[type="cite"]', 'blockquote',
    'div[style*="border-top:1px solid #ccc"]',
    'div[style*="border-top: 1px solid #ccc"]',
    'div[style*="border-top:1pt solid"]',
  ];

  selectors.forEach(sel => {
    body.querySelectorAll(sel).forEach((node) => {
      const raw = (node as HTMLElement).outerHTML || node.textContent || '';
      const kind: QuotedBlock['kind'] =
        sel.includes('gmail') ? 'gmail'
      : sel.includes('yahoo') ? 'yahoo'
      : sel.includes('AppleMail') ? 'apple'
      : sel.includes('moz') ? 'apple'
      : sel.startsWith('blockquote') ? 'blockquote'
      : sel.includes('border-top') ? 'outlook'
      : 'plain';
      
      if (raw.trim()) {
        const quotedBlock = { kind, raw };
        quoted.push(quotedBlock);
        const quotedMessage = parseQuotedHeaders(raw, kind);
        quotedMessages.push(quotedMessage);
      }
      
      node.remove();
    });
  });

  // STEP 3: Plain text fallback detection for remaining content
  const remaining = body.innerText || '';
  const lines = remaining.split('\n');
  const headerIdx = lines.findIndex(line => WROTE_HEADERS.some(rx => rx.test(line.trim())));
  if (headerIdx > -1) {
    const raw = lines.slice(headerIdx).join('\n');
    if (raw.trim()) {
      const quotedBlock = { kind: 'header' as const, raw };
      quoted.push(quotedBlock);
      const quotedMessage = parseQuotedHeaders(raw, 'header');
      quotedMessages.push(quotedMessage);
      
      const marker = lines[headerIdx].trim();
      const idxInHtml = body.innerHTML.indexOf(marker);
      if (idxInHtml >= 0) {
        body.innerHTML = body.innerHTML.slice(0, idxInHtml);
      }
    }
  }

  // STEP 4: Strip email list footers from DOM before extracting HTML
  const bodyTextForCheck = body.innerText || '';
  let earliestFooterIndex: number | null = null;
  let earliestFooterPattern: RegExp | null = null;

  // Find the earliest footer match
  for (const pattern of EMAIL_LIST_FOOTERS) {
    const match = bodyTextForCheck.match(pattern);
    if (match && match.index !== undefined) {
      if (earliestFooterIndex === null || match.index < earliestFooterIndex) {
        earliestFooterIndex = match.index;
        earliestFooterPattern = pattern;
      }
    }
  }

  // If footer found, intelligently remove it
  if (earliestFooterIndex !== null && earliestFooterPattern) {
    // Find all text nodes and remove content after the footer
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    let currentTextPos = 0;
    let node: Node | null;
    
    while (node = walker.nextNode()) {
      const textContent = node.textContent || '';
      const nodeStart = currentTextPos;
      const nodeEnd = currentTextPos + textContent.length;
      
      // Check if footer starts within this text node
      if (earliestFooterIndex >= nodeStart && earliestFooterIndex < nodeEnd) {
        const cutPos = earliestFooterIndex - nodeStart;
        node.textContent = textContent.substring(0, cutPos);
        
        // Remove all following siblings
        let current = node.nextSibling;
        while (current) {
          const next = current.nextSibling;
          current.parentNode?.removeChild(current);
          current = next;
        }
        
        // Also remove following siblings of parent nodes
        let parent = node.parentNode;
        while (parent && parent !== body) {
          let current = parent.nextSibling;
          while (current) {
            const next = current.nextSibling;
            current.parentNode?.removeChild(current);
            current = next;
          }
          parent = parent.parentNode;
        }
        
        break;
      }
      
      currentTextPos = nodeEnd;
    }
  }

  // STEP 5: Get visible content with smart fallback
  const visibleHTML = body.innerHTML.trim();
  const bodyText = body.innerText.trim();
  const cleanedText = stripEmailListFooters(bodyText);
  
  console.log('[parseQuotedEmail] Extraction complete:', {
    visibleHTMLLength: visibleHTML.length,
    bodyTextLength: bodyText.length,
    cleanedTextLength: cleanedText.length,
    quotedBlocksCount: quoted.length,
    visibleHTMLPreview: visibleHTML.substring(0, 200)
  });
  
  // Priority: HTML content (now footer-stripped) > cleaned text > original text
  const finalContent = visibleHTML || cleanedText || bodyText;
  
  return { 
    visibleHTML: finalContent, 
    quoted, 
    quotedMessages 
  };
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
      quotedBlocks: quoted,
      quotedMessages: quotedMessages
    };
  }

  // Plain text
  const { visibleText, quoted, quotedMessages } = extractFromPlain(normalizeWhitespace(content));
  return { 
    visibleContent: visibleText, 
    quotedBlocks: quoted,
    quotedMessages: quotedMessages
  };
}