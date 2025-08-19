/**
 * Enhanced plain text email formatting utilities
 */

/**
 * Linkifies URLs and email addresses in plain text
 */
export const linkifyText = (text: string): string => {
  // Protect code blocks from linkification
  const placeholders: string[] = [];
  const protectedText = text.replace(/<pre[\s\S]*?<\/pre>/gi, (match) => {
    const token = `__CODE_BLOCK_${placeholders.length}__`;
    placeholders.push(match);
    return token;
  });

  // URL and Email regex patterns (kept conservative to avoid trailing punctuation)
  const urlRegex = /(https?:\/\/[^\s<>"')]+[^\s<>"'`.,;:!?)]?)/g;
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

  let linked = protectedText
    .replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer nofollow">$1<\/a>')
    .replace(emailRegex, '<a href="mailto:$1">$1<\/a>');

  // Restore code blocks
  placeholders.forEach((block, i) => {
    linked = linked.replace(`__CODE_BLOCK_${i}__`, block);
  });

  return linked;
};

/**
 * Converts quoted lines (starting with >) into structured blockquote sections
 */
export const processQuotedLines = (text: string): string => {
  const lines = text.split('\n');
  const result: string[] = [];
  let currentQuote: string[] = [];
  let inQuote = false;
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trimStart();
    const isQuoteLine = trimmedLine.startsWith('>');
    
    if (isQuoteLine && !inQuote) {
      // Start of quote section
      inQuote = true;
      currentQuote = [line];
    } else if (isQuoteLine && inQuote) {
      // Continue quote section
      currentQuote.push(line);
    } else if (!isQuoteLine && inQuote) {
      // End of quote section - wrap in blockquote
      inQuote = false;
      const quoteContent = currentQuote
        .map(quoteLine => quoteLine.replace(/^\s*>+\s?/, ''))
        .join('\n');
      result.push(`<blockquote class="email-quote">${escapeHtml(quoteContent)}</blockquote>`);
      currentQuote = [];
      
      // Add current line
      if (line.trim()) {
        result.push(escapeHtml(line));
      }
    } else {
      // Regular line
      if (line.trim()) {
        result.push(escapeHtml(line));
      } else {
        result.push(''); // Preserve empty lines
      }
    }
  });
  
  // Handle any remaining quote at the end
  if (inQuote && currentQuote.length > 0) {
    const quoteContent = currentQuote
      .map(quoteLine => quoteLine.replace(/^\s*>+\s?/, ''))
      .join('\n');
    result.push(`<blockquote class="email-quote">${escapeHtml(quoteContent)}</blockquote>`);
  }
  
  return result.join('\n');
};

/**
 * Structure plain text into semantic HTML (paragraphs, lists, quotes, code, hr)
 */
export const processPlainTextStructure = (text: string): string => {
  const lines = text.split('\n');
  const result: string[] = [];

  let inCode = false;
  let codeLines: string[] = [];

  let inQuote = false;
  let quoteLines: string[] = [];

  let inUl = false;
  let inOl = false;

  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length) {
      const para = paragraphLines.join('<br/>');
      result.push(`<p>${escapeHtml(para)}</p>`);
      paragraphLines = [];
    }
  };

  const flushList = () => {
    if (inUl) {
      result.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      result.push('</ol>');
      inOl = false;
    }
  };

  const flushQuote = () => {
    if (inQuote) {
      const q = quoteLines.map(l => l.replace(/^\s*>+\s?/, '')).join('\n');
      const inner = escapeHtml(q).replace(/\n/g, '<br/>' );
      result.push(`<blockquote class="email-quote">${inner}</blockquote>`);
      quoteLines = [];
      inQuote = false;
    }
  };

  const flushCode = () => {
    if (inCode) {
      const code = codeLines.join('\n');
      result.push(`<pre><code>${escapeHtml(code)}</code></pre>`);
      codeLines = [];
      inCode = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];

    // Code blocks with ``` fences
    if (raw.trim().startsWith('```')) {
      if (!inCode) {
        flushParagraph();
        flushList();
        flushQuote();
        inCode = true;
        codeLines = [];
      } else {
        flushCode();
      }
      continue;
    }

    if (inCode) {
      codeLines.push(raw);
      continue;
    }

    const trimmedStart = raw.trimStart();
    const isQuote = trimmedStart.startsWith('>');

    if (isQuote) {
      flushParagraph();
      flushList();
      inQuote = true;
      quoteLines.push(raw);
      continue;
    } else if (inQuote) {
      flushQuote();
      // fall through to normal handling for current line
    }

    // Unordered list
    const ulMatch = /^\s*[-*]\s+/.test(raw);
    if (ulMatch) {
      flushParagraph();
      if (!inUl) {
        flushList();
        inUl = true;
        result.push('<ul>');
      }
      const item = raw.replace(/^\s*[-*]\s+/, '');
      result.push(`<li>${escapeHtml(item)}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = /^\s*\d+[\.)]\s+/.test(raw);
    if (olMatch) {
      flushParagraph();
      if (!inOl) {
        flushList();
        inOl = true;
        result.push('<ol>');
      }
      const item = raw.replace(/^\s*\d+[\.)]\s+/, '');
      result.push(`<li>${escapeHtml(item)}</li>`);
      continue;
    }

    // Horizontal rule (---, ___, ***)
    if (/^\s*([-_*])\1{2,}\s*$/.test(raw)) {
      flushParagraph();
      flushList();
      result.push('<hr/>');
      continue;
    }

    // Blank line ends paragraph/lists
    if (raw.trim() === '') {
      flushParagraph();
      flushList();
      continue;
    }

    // Default: add to paragraph
    paragraphLines.push(raw);
  }

  // Final flush
  flushCode();
  flushQuote();
  flushList();
  flushParagraph();

  return result.join('\n');
};

/**
 * Detects and marks signature sections for collapsing
 */
export const processSignature = (text: string): string => {
  // Common signature delimiters
  const signatureDelimiters = [
    /\n-- \n/,           // Standard email signature delimiter
    /\n--\n/,            // Alternative delimiter
    /\n\s*--\s*\n/,      // Delimiter with whitespace
  ];
  
  for (const delimiter of signatureDelimiters) {
    const match = text.match(delimiter);
    if (match && match.index !== undefined) {
      const beforeSignature = text.substring(0, match.index);
      const signature = text.substring(match.index + match[0].length);
      
      return beforeSignature + 
        `\n<div class="email-signature" data-collapsible="signature">${escapeHtml(signature)}</div>`;
    }
  }
  
  return text;
};

/**
 * Escape HTML entities in text
 */
export const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * Main function to format plain text emails with enhanced features
 */
export const formatPlainTextEmail = (content: string): string => {
  if (!content) return '';
  
  // First, process signatures (produces an HTML signature block if found)
  const withSignature = processSignature(content);

  const sigMarker = '<div class="email-signature"';
  const sigIndex = withSignature.indexOf(sigMarker);

  let structuredHtml = '';
  let signatureHtml = '';

  if (sigIndex !== -1) {
    const before = withSignature.slice(0, sigIndex);
    signatureHtml = withSignature.slice(sigIndex);
    structuredHtml = processPlainTextStructure(before);
  } else {
    structuredHtml = processPlainTextStructure(withSignature);
  }
  
  // Linkify (protecting code blocks). Apply to both main content and signature block
  let finalHtml = linkifyText(structuredHtml);
  if (signatureHtml) {
    finalHtml += '\n' + linkifyText(signatureHtml);
  }
  
  return finalHtml;
};