// Email formatting utilities for rendering emails with correct formatting
// Updated with enhanced formatting capabilities based on analysis
import DOMPurify from 'dompurify';

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  attachmentId: string;
  size: number;
  contentId?: string;
  isInline?: boolean;
  contentDisposition?: string;
}

/**
 * Sanitizes HTML email content for safe display using DOMPurify
 * Handles inline images and applies consistent or original styling
 * @param htmlContent - Raw HTML content of the email
 * @param attachments - Array of email attachments
 * @param preserveOriginalStyles - Flag to preserve original email styles (default: false)
 * @param messageId - Gmail message ID for potential future attachment fetching
 * @returns Sanitized and styled HTML string
 */
export const sanitizeEmailHTML = (
  htmlContent: string, 
  attachments: EmailAttachment[] = [], 
  preserveOriginalStyles: boolean = false,
  messageId?: string
): string => {
  // Enhanced DOMPurify configuration for better email support
  const config = {
    ALLOWED_TAGS: [
      'p', 'br', 'div', 'span', 'a', 'img', 'strong', 'em', 'b', 'i', 'u',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote',
      'table', 'thead', 'tbody', 'tr', 'td', 'th', 'pre', 'code', 'hr',
      'center', 'font', 'small', 'big', 'sub', 'sup', 'address', 'cite',
      'del', 'ins', 'mark', 'time'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'width', 'height', 'style',
      'class', 'target', 'rel', 'colspan', 'rowspan', 'id', 'name',
      'background', 'border', 'padding', 'margin', 'font-family', 
      'font-size', 'font-weight', 'color', 'text-align', 'bgcolor',
      'cellpadding', 'cellspacing', 'valign', 'align', 'dir'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button', 'iframe', 'meta', 'link'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur', 'onsubmit'],
    KEEP_CONTENT: true,
    ADD_ATTR: ['target'],
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false
  };

  // Pre-process content to handle character encoding and inline images
  let processedContent = fixEncodingIssues(htmlContent);

  // Handle inline images by replacing cid: references
  if (attachments && attachments.length > 0) {
    attachments.forEach((attachment) => {
      if (attachment.isInline && attachment.contentId) {
        // Remove angle brackets from contentId if present
        const cleanContentId = attachment.contentId.replace(/[<>]/g, '');
        const cidPattern = new RegExp(`cid:${cleanContentId}`, 'gi');
        const srcCidPattern = new RegExp(`src=["']cid:${cleanContentId}["']`, 'gi');
        
        // Create a placeholder for inline images - in production this would fetch actual data
        const placeholderUrl = `data:${attachment.mimeType || 'image/png'};base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;
        
        processedContent = processedContent.replace(cidPattern, placeholderUrl);
        processedContent = processedContent.replace(srcCidPattern, `src="${placeholderUrl}"`);
      }
    });
  }
  
  // Handle standard image sources and preserve them
  processedContent = processedContent.replace(
    /<img([^>]*?)src=["']([^"']*?)["']([^>]*?)>/gi,
    (match, prefix, src, suffix) => {
      // Don't modify data URLs or already processed cid references
      if (src.startsWith('data:') || src.startsWith('cid:')) {
        return match;
      }
      // Preserve external image URLs
      return `<img${prefix}src="${src}"${suffix}>`;
    }
  );

  // Sanitize with DOMPurify
  const sanitized = DOMPurify.sanitize(processedContent, config);

  // Apply consistent or original styling based on preference
  const styledContent = `
    <div style="
      font-family: inherit;
      line-height: 1.5;
      color: inherit;
      max-width: 100%;
      overflow-wrap: break-word;
      word-wrap: break-word;
      ${!preserveOriginalStyles ? '' : 'all: initial; font-family: inherit;'}
    ">
      <style>
        .email-content {
          /* Enhanced email content styling with original style preservation option */
          ${preserveOriginalStyles ? 'all: initial; font-family: inherit; line-height: 1.5;' : ''}
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .email-content img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
          display: inline-block;
          margin: 4px 0;
          ${preserveOriginalStyles ? '' : 'max-height: 400px; object-fit: contain;'}
        }
        .email-content table {
          border-collapse: collapse;
          width: 100%;
          max-width: 100%;
          margin: 8px 0;
          ${preserveOriginalStyles ? '' : 'font-size: inherit;'}
        }
        .email-content td, .email-content th {
          padding: 8px;
          ${preserveOriginalStyles ? '' : 'border: 1px solid hsl(var(--border));'}
          text-align: left;
          vertical-align: top;
          word-wrap: break-word;
        }
        .email-content a {
          color: hsl(var(--primary));
          text-decoration: underline;
          word-wrap: break-word;
        }
        .email-content a:hover {
          color: hsl(var(--primary)) !important;
          opacity: 0.8;
        }
        .email-content blockquote {
          border-left: 4px solid hsl(var(--border));
          padding-left: 16px;
          margin: 16px 0;
          color: hsl(var(--muted-foreground));
          font-style: italic;
        }
        .email-content p {
          margin: 8px 0;
          line-height: 1.5;
          word-wrap: break-word;
        }
        .email-content h1, .email-content h2, .email-content h3, 
        .email-content h4, .email-content h5, .email-content h6 {
          margin: 16px 0 8px 0;
          font-weight: 600;
          line-height: 1.3;
          word-wrap: break-word;
        }
        .email-content ul, .email-content ol {
          margin: 8px 0;
          padding-left: 24px;
        }
        .email-content li {
          margin: 4px 0;
          word-wrap: break-word;
        }
        .email-content pre {
          background-color: hsl(var(--muted));
          padding: 12px;
          border-radius: 4px;
          overflow-x: auto;
          font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
          font-size: 0.85em;
          margin: 12px 0;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .email-content code {
          background-color: hsl(var(--muted));
          padding: 2px 4px;
          border-radius: 2px;
          font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
          font-size: 0.85em;
          word-wrap: break-word;
        }
        /* Enhanced support for email-specific elements */
        .email-content center {
          text-align: center;
        }
        .email-content font[color] {
          /* Preserve original font colors when specified */
        }
        .email-content [bgcolor] {
          /* Preserve background colors */
        }
        /* Preserve email signatures and formatting */
        .email-content div[style*="color"], 
        .email-content span[style*="color"], 
        .email-content p[style*="color"],
        .email-content td[style*="color"] {
          /* Let inline styles take precedence for formatted text */
        }
        /* Handle email threading and quoted content */
        .email-content > div:first-child {
          margin-top: 0;
        }
        .email-content > div:last-child {
          margin-bottom: 0;
        }
        /* Responsive design for mobile */
        @media (max-width: 768px) {
          .email-content table {
            font-size: 0.9em;
          }
          .email-content td, .email-content th {
            padding: 6px;
          }
        }
      </style>
      <div class="email-content">
        ${sanitized}
      </div>
    </div>
  `;

  return styledContent;
};

/**
 * Enhanced text extraction from HTML content with improved quote detection and encoding fixes
 */
export const extractTextFromHTML = (htmlContent: string): string => {
  // First fix encoding issues
  let content = fixEncodingIssues(htmlContent);
  
  // Remove HTML tags and decode entities more comprehensively
  let textContent = content
    .replace(/<style[^>]*>.*?<\/style>/gis, '') // Remove style blocks
    .replace(/<script[^>]*>.*?<\/script>/gis, '') // Remove script blocks
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&amp;/g, '&') // Replace HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&hellip;/g, '...')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    // Norwegian characters
    .replace(/&aring;/g, 'å')
    .replace(/&aelig;/g, 'æ')
    .replace(/&oslash;/g, 'ø')
    .replace(/&Aring;/g, 'Å')
    .replace(/&AElig;/g, 'Æ')
    .replace(/&Oslash;/g, 'Ø')
    .replace(/\r?\n\s*\r?\n/g, '\n') // Remove extra blank lines
    .trim();

  // Enhanced quoted content removal with better detection
  const lines = textContent.split('\n');
  const cleanLines = [];
  let inQuotedSection = false;
  let quoteDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Enhanced quote pattern detection
    if (line.startsWith('>')) {
      // Count quote depth for nested quotes
      quoteDepth = (line.match(/^>/g) || []).length;
      if (quoteDepth === 1) inQuotedSection = true;
      continue;
    } else if (inQuotedSection && quoteDepth > 0 && !line) {
      // Empty line might end quoted section
      inQuotedSection = false;
      quoteDepth = 0;
      continue;
    } else if (
      line.match(/^On .+ wrote:$/i) || // "On [date] [person] wrote:"
      line.match(/^From:.+To:.+Subject:/i) || // Email headers
      line.includes('-----Original Message-----') ||
      line.includes('--- Forwarded message ---') ||
      line.includes('_____') || // Common signature separators
      line.match(/^\d{1,2}\/\d{1,2}\/\d{4}.+wrote:$/i) || // Date patterns
      line.match(/^.+<.+@.+>.+wrote:$/i) || // Email with angle brackets
      line.match(/^Sent from my .+$/i) || // Mobile signatures
      line.match(/^Get Outlook for .+$/i) // Outlook signatures
    ) {
      inQuotedSection = true;
      continue;
    }
    
    // Include line if not in quoted section or if it's meaningful content
    if (!inQuotedSection || (inQuotedSection && line.length > 0 && quoteDepth === 0)) {
      cleanLines.push(lines[i]);
      // Reset quoted section for meaningful content
      if (line.length > 0 && !inQuotedSection) {
        inQuotedSection = false;
        quoteDepth = 0;
      }
    }
  }
  
  return cleanLines.join('\n').trim();
};

/**
 * Enhanced content type detection for better HTML/text rendering decisions
 */
export const shouldRenderAsHTML = (content: string, contentType: string): boolean => {
  // Check explicit content type first
  if (contentType.toLowerCase().includes('html')) {
    return true;
  }
  
  // Enhanced HTML detection patterns
  const htmlIndicators = [
    /<html[^>]*>/i,
    /<!DOCTYPE html/i,
    /<body[^>]*>/i,
    /<table[^>]*>/i,
    /<img[^>]*>/i,
    /<div[^>]*>/i,
    /<p[^>]*>/i,
    /<br\s*\/?>/i,
    /<strong[^>]*>/i,
    /<em[^>]*>/i,
    /<a[^>]*href/i
  ];
  
  // Check for multiple HTML indicators for more confidence
  const htmlMatches = htmlIndicators.filter(pattern => pattern.test(content)).length;
  
  // Require at least 2 HTML indicators or specific structural elements
  return htmlMatches >= 2 || 
         content.includes('<html') || 
         content.includes('<!DOCTYPE html') ||
         (content.includes('<table') && content.includes('</table>')) ||
         (content.includes('<div') && content.includes('</div>'));
};

/**
 * Fixes common character encoding issues in email content
 * Particularly handles Norwegian and other international characters
 */
export const fixEncodingIssues = (content: string): string => {
  return content
    // Fix common UTF-8 encoding issues with Norwegian characters
    .replace(/Ã¥/g, 'å')
    .replace(/Ã¦/g, 'æ')
    .replace(/Ã¸/g, 'ø')
    .replace(/Ã…/g, 'Å')
    .replace(/Ã†/g, 'Æ')
    .replace(/Ã˜/g, 'Ø')
    // Fix other common UTF-8 issues
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã±/g, 'ñ')
    .replace(/Ã¼/g, 'ü')
    .replace(/Ã¤/g, 'ä')
    .replace(/Ã¶/g, 'ö')
    .replace(/ÃŸ/g, 'ß')
    // Fix quotation marks and other punctuation
    .replace(/â€™/g, '\'')
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€"/g, '–')
    .replace(/â€"/g, '—')
    .replace(/â€¦/g, '...')
    // Fix spacing issues
    .replace(/Ã\s+/g, '')
    .replace(/\s+Ã/g, '')
    // Fix double-encoded entities
    .replace(/&amp;([a-zA-Z]+);/g, '&$1;')
    // Preserve emojis and fix common emoji encoding issues
    .replace(/ðŸ\s*/g, '🙂') // Fix smiley face encoding
    .replace(/ðŸ˜\s*/g, '😀') // Fix other emoji encodings
    .replace(/ðŸŽ\s*/g, '🎉') // Fix celebration emojis
    .replace(/ðŸ'\s*/g, '👍') // Fix thumbs up
    .replace(/â\s*¤\s*/g, '❤') // Fix heart emoji
    .replace(/ðŸ"§/g, '📧') // Fix email emoji
    .replace(/ðŸ"±/g, '📱') // Fix phone emoji
    .replace(/ðŸ"ž/g, '📞'); // Fix telephone emoji
};

/**
 * Utility function to clean up malformed HTML content with enhanced encoding support
 */
export const preprocessHTMLContent = (content: string): string => {
  // First fix encoding issues
  let processedContent = fixEncodingIssues(content);
  
  return processedContent
    // Fix remaining HTML entity issues
    .replace(/&([a-zA-Z]+);/g, (match, entity) => {
      const entities: Record<string, string> = {
        'nbsp': ' ',
        'amp': '&',
        'lt': '<',
        'gt': '>',
        'quot': '"',
        'apos': "'",
        'hellip': '...',
        'mdash': '—',
        'ndash': '–',
        'lsquo': '\'',
        'rsquo': '\'',
        'ldquo': '"',
        'rdquo': '"',
        'aring': 'å',
        'aelig': 'æ',
        'oslash': 'ø',
        'Aring': 'Å',
        'AElig': 'Æ',
        'Oslash': 'Ø'
      };
      return entities[entity] || match;
    })
    // Handle numeric entities for Norwegian characters
    .replace(/&#(\d+);/g, (match, code) => {
      const num = parseInt(code);
      // Common Norwegian character codes
      switch (num) {
        case 229: return 'å';
        case 230: return 'æ';
        case 248: return 'ø';
        case 197: return 'Å';
        case 198: return 'Æ';
        case 216: return 'Ø';
        default: return String.fromCharCode(num);
      }
    })
    // Ensure proper line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Clean up excessive whitespace but preserve intentional formatting
    .replace(/\n\s*\n\s*\n/g, '\n\n');
};