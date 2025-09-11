/**
 * Utility functions to parse and collapse quoted email content
 */

export interface ParsedEmailContent {
  visibleContent: string;
  quotedContent: string;
  hasQuotedContent: boolean;
  detectedPattern?: string;
}

/**
 * Enhanced patterns for detecting quoted email content
 */
const QUOTED_PATTERNS = [
  // Gmail/Google style
  { pattern: /^On .+ wrote:$/m, type: 'gmail' },
  { pattern: /^Den .+ skrev:$/m, type: 'gmail-no' },
  { pattern: /^På .+ skrev:$/m, type: 'gmail-no' },
  { pattern: /^Skrev .+:$/m, type: 'gmail-no' },
  
  // Standard email headers
  { pattern: /^From: .+$/m, type: 'header' },
  { pattern: /^Sent: .+$/m, type: 'header' },
  { pattern: /^To: .+$/m, type: 'header' },
  { pattern: /^Subject: .+$/m, type: 'header' },
  { pattern: /^Date: .+$/m, type: 'header' },
  
  // Exchange/Outlook
  { pattern: /-----Original Message-----/i, type: 'outlook' },
  { pattern: /_____+/, type: 'separator' },
  
  // Apple Mail
  { pattern: /^Begin forwarded message:$/m, type: 'apple' },
  
  // Generic quote indicators  
  { pattern: /^> /m, type: 'blockquote' },
  { pattern: /^&gt; /m, type: 'blockquote' },
];

/**
 * Extract quoted content from plain text email
 */
export function parseQuotedText(content: string): ParsedEmailContent {
  if (!content) {
    return { visibleContent: content, quotedContent: '', hasQuotedContent: false };
  }

  let splitPoint = -1;
  let detectedPattern = '';

  // Find the first occurrence of any quoted pattern
  for (const { pattern, type } of QUOTED_PATTERNS) {
    const match = content.match(pattern);
    if (match && match.index !== undefined) {
      if (splitPoint === -1 || match.index < splitPoint) {
        splitPoint = match.index;
        detectedPattern = type;
      }
    }
  }

  // If no pattern found, check for multiple consecutive lines starting with >
  if (splitPoint === -1) {
    const lines = content.split('\n');
    let quoteStartIndex = -1;
    let consecutiveQuoteLines = 0;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('>') || lines[i].trim().startsWith('&gt;')) {
        if (quoteStartIndex === -1) {
          quoteStartIndex = i;
        }
        consecutiveQuoteLines++;
      } else if (consecutiveQuoteLines > 0) {
        // If we had quoted lines but now don't, check if we have enough to consider it a quote block
        if (consecutiveQuoteLines >= 2) {
          splitPoint = lines.slice(0, quoteStartIndex).join('\n').length;
          break;
        }
        quoteStartIndex = -1;
        consecutiveQuoteLines = 0;
      }
    }
    
    // Check if the email ends with quoted lines
    if (consecutiveQuoteLines >= 2 && quoteStartIndex !== -1) {
      splitPoint = lines.slice(0, quoteStartIndex).join('\n').length;
    }
  }

  if (splitPoint === -1) {
    return { visibleContent: content, quotedContent: '', hasQuotedContent: false };
  }

  const visibleContent = content.substring(0, splitPoint).trim();
  const quotedContent = content.substring(splitPoint).trim();

  return {
    visibleContent,
    quotedContent,
    hasQuotedContent: quotedContent.length > 0,
    detectedPattern
  };
}

/**
 * Extract quoted content from HTML email
 */
export function parseQuotedHTML(htmlContent: string): ParsedEmailContent {
  if (!htmlContent) {
    return { visibleContent: htmlContent, quotedContent: '', hasQuotedContent: false };
  }

  // Create a temporary DOM element to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;

  // Look for common quoted content containers with enhanced selectors
  const quotedElements = tempDiv.querySelectorAll(
    'blockquote, .quote, .quoted-text, .gmail_quote, .outlook_quote, .yahoo_quoted, .AppleMailQuote, [class*="quote"], [style*="border-top"], div[class*="gmail"]'
  );

  if (quotedElements.length === 0) {
    // Try text-based parsing on the HTML content
    const textContent = tempDiv.textContent || '';
    const parsed = parseQuotedText(textContent);
    
    if (!parsed.hasQuotedContent) {
      return { visibleContent: htmlContent, quotedContent: '', hasQuotedContent: false };
    }
    
    // If we found quoted text, try to find the corresponding HTML split point
    const visibleTextLength = parsed.visibleContent.length;
    let htmlLength = 0;
    let splitIndex = 0;
    
    for (const node of tempDiv.childNodes) {
      const nodeText = node.textContent || '';
      if (htmlLength + nodeText.length >= visibleTextLength) {
        break;
      }
      htmlLength += nodeText.length;
      splitIndex++;
    }
    
    const visibleNodes = Array.from(tempDiv.childNodes).slice(0, splitIndex);
    const quotedNodes = Array.from(tempDiv.childNodes).slice(splitIndex);
    
    const visibleHTML = visibleNodes.map(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        return (node as Element).outerHTML;
      }
      return node.textContent || '';
    }).join('');
    
    const quotedHTML = quotedNodes.map(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        return (node as Element).outerHTML;
      }
      return node.textContent || '';
    }).join('');
    
    return {
      visibleContent: visibleHTML,
      quotedContent: quotedHTML,
      hasQuotedContent: quotedHTML.trim().length > 0
    };
  }

  // Remove quoted elements and get the remaining HTML
  quotedElements.forEach(element => element.remove());
  
  const visibleHTML = tempDiv.innerHTML;
  
  // Get the quoted content
  const quotedHTML = Array.from(quotedElements)
    .map(element => element.outerHTML)
    .join('\n');

  return {
    visibleContent: visibleHTML,
    quotedContent: quotedHTML,
    hasQuotedContent: quotedHTML.trim().length > 0,
    detectedPattern: 'html-elements'
  };
}

/**
 * Main function to parse email content based on content type
 */
export function parseEmailContent(content: string, contentType: string = 'text/plain'): ParsedEmailContent {
  if (contentType.includes('html')) {
    return parseQuotedHTML(content);
  } else {
    return parseQuotedText(content);
  }
}