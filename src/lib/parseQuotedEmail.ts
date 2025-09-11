// Robust quoted-reply extraction for HTML and plain text emails
// Returns the content that should be shown in the card (visibleContent)
// and a list of quoted blocks (for optional "Show quoted history")

export type QuotedBlock = {
  kind: 'gmail' | 'outlook' | 'apple' | 'yahoo' | 'blockquote' | 'header' | 'plain';
  raw: string;
};

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
function extractFromHtml(html: string): { visibleHTML: string; quoted: QuotedBlock[] } {
  const quoted: QuotedBlock[] = [];
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
      quoted.push({ kind, raw });
      node.remove();
    });
  });

  // Fallback: detect header markers inside remaining HTML text and split
  const remaining = body.innerText || '';
  const lines = remaining.split('\n');
  const headerIdx = lines.findIndex(line => WROTE_HEADERS.some(rx => rx.test(line.trim())));
  if (headerIdx > -1) {
    const raw = lines.slice(headerIdx).join('\n');
    quoted.push({ kind: 'header', raw });
    // remove that section from DOM text by cutting innerHTML after that marker
    // Simple approach: cut body.innerHTML at the start of that line's text
    const marker = lines[headerIdx].trim();
    const idxInHtml = body.innerHTML.indexOf(marker);
    if (idxInHtml >= 0) {
      body.innerHTML = body.innerHTML.slice(0, idxInHtml);
    }
  }

  const visibleHTML = body.innerHTML.trim();
  return { visibleHTML, quoted };
}

/**
 * Extract quoted blocks from plain text.
 * Returns [visibleText, quotedBlocks]
 */
function extractFromPlain(text: string): { visibleText: string; quoted: QuotedBlock[] } {
  const quoted: QuotedBlock[] = [];
  const lines = text.split('\n');

  // If there are any ">"-prefixed lines, treat the first block of them and below as quoted
  const angleIdx = lines.findIndex(l => l.trim().startsWith('>'));
  // Or find classic header lines (On ... wrote:, Original Message, Norwegian variants)
  const headerIdx = lines.findIndex(l => WROTE_HEADERS.some(rx => rx.test(l.trim())));

  let cut = -1;
  if (headerIdx > -1) cut = headerIdx;
  else if (angleIdx > -1) cut = angleIdx;

  if (cut > -1) {
    quoted.push({
      kind: headerIdx > -1 ? 'header' : 'plain',
      raw: lines.slice(cut).join('\n'),
    });
  }

  const visible = cut > -1 ? lines.slice(0, cut).join('\n') : lines.join('\n');

  // Also drop any trailing quote-style lines from the visible preview
  const pruned = visible
    .split('\n')
    .filter(l => !l.trim().startsWith('>'))
    .join('\n');

  return { visibleText: pruned.trim(), quoted };
}

/**
 * Public API
 */
export function parseQuotedEmail(input: Input): { visibleContent: string; quotedBlocks: QuotedBlock[] } {
  const contentType = (input.contentType || '').toLowerCase();
  const content = input.content || '';

  if (contentType.includes('html') || /<\/?[a-z][\s\S]*>/i.test(content)) {
    const { visibleHTML, quoted } = extractFromHtml(content);
    return { visibleContent: visibleHTML.trim(), quotedBlocks: quoted };
  }

  // Plain text
  const { visibleText, quoted } = extractFromPlain(normalizeWhitespace(content));
  return { visibleContent: visibleText, quotedBlocks: quoted };
}