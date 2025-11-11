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
 * Decodes HTML entities using browser's native decoder (industry standard approach)
 * Converts &lt;br/&gt; to <br/>, &amp; to &, etc.
 * Supports iterative decoding for nested entities like &amp;lt;br/&amp;gt;
 * Reference: Gmail API docs, Stack Overflow standard practices
 */
export function decodeHTMLEntities(html: string): string {
  if (!html) return html;
  
  const temp = document.createElement('textarea');
  temp.innerHTML = html;
  let decoded = temp.value;
  
  // Iterative decoding for nested entities (max 3 passes)
  let previousDecoded = '';
  let iterations = 0;
  while (decoded !== previousDecoded && iterations < 3) {
    previousDecoded = decoded;
    temp.innerHTML = decoded;
    decoded = temp.value;
    iterations++;
  }
  
  return decoded;
}

/**
 * Strip email client wrapper elements (like <pre> tags) that wrap entire content
 */
function stripEmailClientWrappers(body: HTMLElement): void {
  console.log('[stripEmailClientWrappers] Starting - body children:', body.children.length);
  
  // Check if the entire body is wrapped in a single <pre> or <div>
  const children = Array.from(body.children);
  
  // If there's only one child and it's a wrapper element, unwrap it
  if (children.length === 1) {
    const onlyChild = children[0];
    
    if (onlyChild.tagName === 'PRE' && !onlyChild.querySelector('code')) {
      console.log('[stripEmailClientWrappers] Unwrapping single PRE wrapper');
      // Just unwrap - content is already decoded by extractFromHtml
      body.innerHTML = onlyChild.innerHTML;
      
    } else if (onlyChild.tagName === 'DIV' && onlyChild.childElementCount === 0 && onlyChild.textContent) {
      console.log('[stripEmailClientWrappers] Unwrapping single DIV wrapper');
      body.innerHTML = onlyChild.innerHTML;
    }
  }
  
  // Handle all <pre> elements that don't contain <code> (email client formatting)
  const preElements = Array.from(body.querySelectorAll('pre'));
  console.log('[stripEmailClientWrappers] Found pre elements:', preElements.length);
  
  preElements.forEach((pre, index) => {
    const hasCodeChild = pre.querySelector('code') !== null;
    console.log(`[stripEmailClientWrappers] Pre element ${index}: hasCode=${hasCodeChild}`);
    
    if (!hasCodeChild) {
      // Just unwrap - content is already decoded by extractFromHtml
      const div = document.createElement('div');
      div.innerHTML = pre.innerHTML;
      div.style.whiteSpace = 'pre-wrap';
      div.className = 'email-client-content';
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

/**
 * Strip HTML tags and entities from raw quoted content to prevent HTML leakage
 * Critical fix for issue where HTML like <a href="mailto:..."> was showing in sender names
 */
function stripHtmlSafe(html: string): string {
  if (!html) return '';
  const temp = document.createElement('div');
  temp.innerHTML = html;
  let text = temp.textContent || temp.innerText || html;
  // Remove remaining angle brackets that might be plain text
  text = text.replace(/[<>]/g, '');
  // Decode any entities
  temp.innerHTML = text;
  return (temp.textContent || temp.innerText || text).trim();
}

/**
 * Detects if content is only an email header line (e.g., "On ... wrote:")
 * without any actual message body
 */
function isHeaderOnlyContent(html: string): boolean {
  const headerPatterns = [
    /^On\s+.+wrote:?\s*$/i,
    /^From:.+Sent:.+To:.+Subject:/is,
    /^-+\s*Original Message\s*-+/i,
    /^Le\s+.+a écrit/i,  // French
    /^Den\s+.+skrev/i,    // Norwegian
    /^På\s+.+skrev/i,     // Norwegian
  ];
  
  const cleanText = html.replace(/<[^>]+>/g, '').trim();
  
  // Check if content matches header-only patterns
  for (const pattern of headerPatterns) {
    if (pattern.test(cleanText)) {
      return true;
    }
  }
  
  // Check if content is very short (< 100 chars) and contains "wrote" keyword
  if (cleanText.length < 100 && /wrote|skrev|écrit/i.test(cleanText)) {
    return true;
  }
  
  return false;
}

function parseQuotedHeaders(raw: string, kind: QuotedBlock['kind']): QuotedMessage | null {
  // Skip header-only content (e.g., just "On ... wrote:" lines)
  if (isHeaderOnlyContent(raw)) {
    return null;
  }
  
  // CRITICAL: Strip HTML BEFORE parsing to prevent HTML leakage in sender names
  const cleanRaw = stripHtmlSafe(raw);
  
  const bodyHtml = raw; // Keep original for body display
  const bodyText = stripHtmlTags(cleanRaw); // Use cleaned version
  
  let fromEmail: string | undefined;
  let fromName: string | undefined;
  let sentAtIso: string | undefined;
  let vendor: QuotedMessage['vendor'] = 'generic';
  let confidence: QuotedMessage['confidence'] = 'low';

  // Gmail patterns - use email regex instead of angle bracket matching
  if (kind === 'gmail') {
    vendor = 'gmail';
    // Extract email using explicit email regex (not angle brackets which match HTML tags)
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    const emailMatch = cleanRaw.match(emailRegex);
    if (emailMatch) {
      fromEmail = emailMatch[1].toLowerCase();
      confidence = 'high';
    }
    // Extract name from "On ..., Name wrote:" pattern
    const nameMatch = cleanRaw.match(/On .+?,\s*(.+?)\s+wrote:/i);
    if (nameMatch && !nameMatch[1].includes('@')) {
      fromName = nameMatch[1].trim();
    }
  }
  
  // Outlook patterns - use email regex instead of angle bracket matching
  else if (kind === 'outlook') {
    vendor = 'outlook';
    // Look for "From:" headers
    const fromMatch = cleanRaw.match(/From:\s*(.+?)(?:\n|$)/i);
    if (fromMatch) {
      const fromValue = fromMatch[1].trim();
      // Use email regex instead of angle brackets
      const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
      const emailMatch = fromValue.match(emailRegex);
      fromEmail = emailMatch ? emailMatch[1].toLowerCase() : undefined;
      
      // Extract name (everything before email)
      if (emailMatch) {
        const beforeEmail = fromValue.substring(0, fromValue.indexOf(emailMatch[0])).trim();
        fromName = beforeEmail.replace(/[<>"]/g, '').trim() || undefined;
      }
      confidence = emailMatch ? 'high' : 'low';
    }
    
    // Look for "Sent:" or "Date:" headers
    const dateMatch = cleanRaw.match(/(?:Sent|Date):\s*(.+?)(?:\n|$)/i);
    if (dateMatch) {
      const dateStr = dateMatch[1].trim();
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        sentAtIso = parsedDate.toISOString();
      }
    }
  }
  
  // Header-based patterns (Norwegian, English) - use cleanRaw for parsing
  else if (kind === 'header') {
    // Norwegian patterns
    const norMatch = cleanRaw.match(/^(Den|På)\s+(.+?)\s+skrev\s+(.+?):/i);
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
    const wroteMatch = cleanRaw.match(/Skrev\s+(.+?):/i);
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

/**
 * Detect email signature patterns and separate from content
 */
function detectAndSeparateSignature(paragraphs: string[]): { contentHtml: string; signatureHtml: string } {
  const signaturePatterns = [
    /^--\s*$/,                    // Standard email signature delimiter
    /^_{3,}$/,                    // Underscore line
    /^sent from/i,                // "Sent from my iPhone" etc
    /^get outlook for/i,          // Outlook mobile signature
    /^best regards/i,
    /^kind regards/i,
    /^regards/i,
    /^sincerely/i,
    /^cheers/i,
    /^thanks/i,
    /^\+?\d{2,3}[-.\s]?\(?\d/,   // Phone numbers
  ];
  
  // Search from the end for signature patterns
  for (let i = paragraphs.length - 1; i >= Math.max(0, paragraphs.length - 8); i--) {
    const text = paragraphs[i].replace(/<[^>]+>/g, '').trim();
    
    if (signaturePatterns.some(pattern => pattern.test(text))) {
      return {
        contentHtml: paragraphs.slice(0, i).join('\n'),
        signatureHtml: paragraphs.slice(i).join('\n')
      };
    }
  }
  
  return { contentHtml: paragraphs.join('\n'), signatureHtml: '' };
}

function extractFromHtml(html: string): { visibleHTML: string; quoted: QuotedBlock[]; quotedMessages: QuotedMessage[] } {
  const quoted: QuotedBlock[] = [];
  const quotedMessages: QuotedMessage[] = [];
  
  // CRITICAL FIX: Decode HTML entities FIRST, before any DOM operations
  // This handles &lt;br/&gt; → <br/>, &gt; → >, etc.
  const decodedHtml = decodeHTMLEntities(html);
  console.log('[extractFromHtml] Decoded entities. Original preview:', html.substring(0, 100));
  console.log('[extractFromHtml] Decoded preview:', decodedHtml.substring(0, 100));
  
  const doc = htmlToDocument(stripHtmlComments(decodedHtml));
  const body = doc.body;

  // STEP 0: Strip email client wrapper elements (no decoding needed, already done)
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
      if (quotedMessage) {
        quotedMessages.push(quotedMessage);
      }
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
        if (quotedMessage) {
          quotedMessages.push(quotedMessage);
        }
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
      if (quotedMessage) {
        quotedMessages.push(quotedMessage);
      }
      
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

  // STEP 5: Convert block elements and <br> to newlines BEFORE extracting text
  // This preserves line break structure when using .textContent
  const bodyClone = body.cloneNode(true) as HTMLElement;

  // Convert <br> tags to newlines
  bodyClone.querySelectorAll('br').forEach(br => {
    br.replaceWith(doc.createTextNode('\n'));
  });

  // Convert block-level elements to add newlines before/after
  const blockElements = ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li'];
  blockElements.forEach(tag => {
    bodyClone.querySelectorAll(tag).forEach(el => {
      // Add newline before the element content
      if (el.previousSibling && el.previousSibling.nodeType === Node.TEXT_NODE) {
        const text = el.previousSibling.textContent || '';
        if (text && !text.endsWith('\n')) {
          el.previousSibling.textContent = text + '\n';
        }
      } else if (el.previousSibling) {
        el.before(doc.createTextNode('\n'));
      }
      
      // Add newline after the element content
      if (el.nextSibling && el.nextSibling.nodeType === Node.TEXT_NODE) {
        const text = el.nextSibling.textContent || '';
        if (text && !text.startsWith('\n')) {
          el.nextSibling.textContent = '\n' + text;
        }
      } else if (el.nextSibling) {
        el.after(doc.createTextNode('\n'));
      }
    });
  });

  // Now extract text content - newlines are preserved!
  const bodyText = (bodyClone.textContent || bodyClone.innerText || '').trim();
  const cleanedText = stripEmailListFooters(bodyText);
  
  // Convert cleaned text back to minimal HTML structure with smart paragraph grouping
  // Group consecutive non-empty lines into single paragraphs, preserve line break structure
  const textLines = cleanedText.split('\n');
  const paragraphs: string[] = [];
  let currentParagraph: string[] = [];
  let consecutiveEmptyLines = 0;

  for (let i = 0; i < textLines.length; i++) {
    const trimmed = textLines[i].trim();
    
    if (trimmed.length === 0) {
      consecutiveEmptyLines++;
      
      // Close current paragraph on first empty line
      if (consecutiveEmptyLines === 1 && currentParagraph.length > 0) {
        // Check if there's another empty line following (double line break)
        const hasExtraSpacing = i + 1 < textLines.length && textLines[i + 1].trim().length === 0;
        const className = hasExtraSpacing ? ' class="mb-extra"' : '';
        paragraphs.push(`<p${className}>${currentParagraph.join('<br/>')}</p>`);
        currentParagraph = [];
      }
    } else {
      consecutiveEmptyLines = 0;
      // Non-empty line - add to current paragraph
      currentParagraph.push(trimmed);
    }
  }

  // Don't forget the last paragraph
  if (currentParagraph.length > 0) {
    paragraphs.push(`<p>${currentParagraph.join('<br/>')}</p>`);
  }

  // Detect and separate signature from content
  const { contentHtml, signatureHtml } = detectAndSeparateSignature(paragraphs);
  const visibleHTML = signatureHtml 
    ? `${contentHtml}\n<div class="email-signature">${signatureHtml}</div>`
    : contentHtml;
  
  console.log('[parseQuotedEmail] Extraction complete:', {
    visibleHTMLLength: visibleHTML.length,
    bodyTextLength: bodyText.length,
    cleanedTextLength: cleanedText.length,
    quotedBlocksCount: quoted.length,
    visibleHTMLPreview: visibleHTML.substring(0, 200)
  });
  
  return { 
    visibleHTML: visibleHTML || cleanedText || bodyText, 
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
    if (quotedMessage) {
      quotedMessages.push(quotedMessage);
    }
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