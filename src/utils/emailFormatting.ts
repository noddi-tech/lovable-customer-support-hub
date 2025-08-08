// Email formatting utilities for rendering emails with correct formatting
// Enhanced email processing for Apple Mail-like appearance
import DOMPurify from 'dompurify';
import { convertShortcodesToEmojis } from './emojiUtils';

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
 * Enhanced email HTML sanitization for Apple Mail-like appearance
 */
export const sanitizeEmailHTML = (
  htmlContent: string, 
  attachments: EmailAttachment[] = [], 
  preserveOriginalStyles: boolean = true,
  messageId?: string
): string => {
  // Comprehensive email HTML configuration
  const config = {
    ALLOWED_TAGS: [
      'div', 'span', 'p', 'br', 'a', 'img', 'strong', 'b', 'em', 'i', 'u', 
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption',
      'pre', 'code', 'hr', 'center', 'font', 'small', 'big', 'sub', 'sup',
      'address', 'cite', 'del', 'ins', 'mark', 'time', 'style'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'width', 'height', 'style', 'class', 
      'id', 'target', 'rel', 'colspan', 'rowspan', 'border', 'cellpadding', 
      'cellspacing', 'align', 'valign', 'bgcolor', 'color', 'face', 'size',
      'data-*', 'role', 'aria-*', 'dir', 'background', 'font-family', 
      'font-size', 'font-weight', 'text-align', 'margin', 'padding'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'iframe', 'meta', 'link'],
    FORBID_ATTR: ['javascript:', 'vbscript:', 'onload', 'onerror', 'onclick'],
    KEEP_CONTENT: true,
    ADD_ATTR: ['target'],
    ALLOW_DATA_ATTR: true
  };

  let processedContent = htmlContent;

  // Handle inline images with CID references
  if (attachments && attachments.length > 0) {
    attachments.forEach(attachment => {
      if (attachment.isInline && attachment.contentId) {
        const cidPattern = new RegExp(`cid:${attachment.contentId.replace(/[<>]/g, '')}`, 'gi');
        const srcCidPattern = new RegExp(`src=["']cid:${attachment.contentId.replace(/[<>]/g, '')}["']`, 'gi');
        
        // Placeholder for inline images - in production fetch actual attachment
        const placeholderUrl = `https://via.placeholder.com/400x200/e5e7eb/6b7280?text=Image`;
        
        processedContent = processedContent.replace(cidPattern, placeholderUrl);
        processedContent = processedContent.replace(srcCidPattern, `src="${placeholderUrl}"`);
      }
    });
  }

  // Fix common email HTML issues
  processedContent = processedContent
    // Fix unquoted attributes common in email HTML
    .replace(/border=(\d+)/g, 'border="$1"')
    .replace(/cellpadding=(\d+)/g, 'cellpadding="$1"')
    .replace(/cellspacing=(\d+)/g, 'cellspacing="$1"')
    .replace(/width=(\d+)/g, 'width="$1"')
    .replace(/height=(\d+)/g, 'height="$1"')
    .replace(/align=(\w+)/g, 'align="$1"')
    .replace(/valign=(\w+)/g, 'valign="$1"')
    .replace(/bgcolor=([#\w]+)/g, 'bgcolor="$1"')
    // Ensure all images are responsive
    .replace(/<img([^>]*?)>/gi, (match, attrs) => {
      if (!attrs.includes('style=')) {
        return `<img${attrs} style="max-width: 100%; height: auto; display: block;">`;
      } else if (!attrs.includes('max-width')) {
        const styleMatch = attrs.match(/style=["']([^"']*?)["']/);
        if (styleMatch) {
          const existingStyle = styleMatch[1];
          const newStyle = `${existingStyle}; max-width: 100%; height: auto;`;
          return match.replace(styleMatch[0], `style="${newStyle}"`);
        }
      }
      return match;
    });

  // Sanitize the HTML
  const sanitized = DOMPurify.sanitize(processedContent, config);

  // Apply minimal styling that preserves original email design
  return `
    <div class="email-html-content" style="
      max-width: 100%;
      overflow-wrap: break-word;
      word-wrap: break-word;
      margin: 0;
      padding: 0;
      background-color: transparent;
    ">
      <style>
        .email-html-content {
          /* Only essential variables for responsive behavior */
          --email-max-width: 100%;
        }
        
        /* Force readable colors for elements without explicit color */
        .email-html-content :not([style*="color"]):not([color]) {
          color: inherit !important;
        }
        
        /* Minimal reset to preserve original email styling */
        .email-html-content * {
          box-sizing: border-box;
        }
        
        /* Preserve original table layouts and spacing */
        .email-html-content table {
          border-collapse: collapse;
          mso-table-lspace: 0pt !important;
          mso-table-rspace: 0pt !important;
        }
        
        /* Ensure images are responsive */
        .email-html-content img {
          max-width: 100% !important;
          height: auto !important;
          border: 0;
        }
        
        /* Preserve link styling but keep contrast */
        .email-html-content a {
          word-break: break-word;
          color: inherit !important;
          text-decoration: underline;
        }
        
        /* Subtle hr to match current text color */
        .email-html-content hr {
          border: none;
          border-top: 1px solid currentColor;
          opacity: 0.2;
          margin: 20px 0;
        }
        
        /* Mobile responsive adjustments only */
        @media (max-width: 600px) {
          .email-html-content table[width="600"] {
            width: 100% !important;
          }
          
          .email-html-content .structure__table {
            width: 100% !important;
          }
          
          /* Ensure mobile padding on containers */
          .email-html-content [style*="padding:15px 60px"] {
            padding: 15px 20px !important;
          }
        }
        
        /* Preserve email-specific MSO styles for Outlook compatibility */
        .email-html-content [style*="mso-line-height-rule"] {
          line-height: inherit;
        }
      </style>
      ${sanitized}
    </div>
  `;
};

/**
 * Improved text extraction from HTML with better formatting preservation
 */
export const extractTextFromHTML = (htmlContent: string): string => {
  // Create a temporary DOM element to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = htmlContent;
  
  // Remove script and style elements
  const scripts = temp.querySelectorAll('script, style');
  scripts.forEach(el => el.remove());
  
  // Get text content with some formatting preservation
  let text = temp.textContent || temp.innerText || '';
  
  // Clean up the text
  text = text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove common email artifacts
    .replace(/\[.*?\]/g, '')
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove quoted sections (lines starting with >)
    .replace(/^>.*$/gm, '')
    // Remove email signatures (text after "Best regards", "Sincerely", etc.)
    .replace(/(\n|^)(Best regards|Sincerely|Thank you|Thanks|Cheers|BR|--)[^]*$/i, '')
    .trim();
  
  return text;
};

/**
 * Enhanced content type detection with better heuristics
 */
export const shouldRenderAsHTML = (content: string, contentType: string): boolean => {
  // If content looks like plain text with asterisks/decorative chars, don't render as HTML
  const plainTextIndicators = [
    /^\*{3,}[\s\S]*?\*{3,}/m, // Lines with multiple asterisks
    /^-{3,}/m, // Lines with multiple dashes
    /\[\s*[^\]]*\s*\(\s*https?:\/\/[^\)]+\s*\)\s*\]/m // [Link text ( url )] patterns
  ];
  
  const hasPlainTextIndicators = plainTextIndicators.some(pattern => pattern.test(content));
  
  // Check for actual HTML elements
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
    /<a[^>]*href/i,
    /<td[^>]*>/i,
    /<tr[^>]*>/i,
    /<span[^>]*>/i,
    /<h[1-6][^>]*>/i
  ];
  
  const htmlMatches = htmlIndicators.filter(pattern => pattern.test(content)).length;
  const hasRealHtml = htmlMatches >= 1;
  
  // If it looks like plain text format, treat it as plain text regardless of content type
  if (hasPlainTextIndicators && !hasRealHtml) {
    return false;
  }
  
  // Check explicit content type with HTML presence
  if (contentType.toLowerCase().includes('html') && hasRealHtml) {
    return true;
  }
  
  // Advanced HTML detection
  return hasRealHtml && (
    content.includes('<html') || 
    content.includes('<!DOCTYPE html') ||
    (content.includes('<table') && content.includes('</table>')) ||
    (content.includes('<div') && content.includes('</div>')) ||
    // Detect if content has HTML entities
    /&[a-zA-Z]+;/.test(content) ||
    // Detect common email HTML patterns
    content.includes('mso-table') ||
    content.includes('border=') ||
    content.includes('cellpadding=') ||
    content.includes('cellspacing=')
  );
};

/**
 * Enhanced text formatting for newsletter-style content
 */
export const formatEmailText = (content: string): string => {
  // Split content into lines for better processing
  const lines = content.split('\n');
  const formattedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Skip empty lines but preserve them for spacing
    if (line.trim() === '') {
      formattedLines.push('<br>');
      continue;
    }
    
    // Convert asterisk headers to proper headings
    if (/^\*{3,}(.+?)\*{3,}$/.test(line)) {
      const headerText = line.replace(/^\*{3,}(.+?)\*{3,}$/, '$1').trim();
      formattedLines.push(`<h2 style="margin: 24px 0 12px 0; font-weight: 600; font-size: 1.25em; color: #1d1d1f; line-height: 1.3;">${headerText}</h2>`);
      continue;
    }
    
    // Convert dash separators to horizontal rules
    if (/^-{3,}/.test(line)) {
      formattedLines.push('<hr style="margin: 20px 0; border: none; border-top: 1px solid #d1d1d6;">');
      continue;
    }
    
    // Convert [Link text ( url )] to proper links
    line = line.replace(/\[([^\]]+)\s+\(\s*(https?:\/\/[^\)]+)\s*\)\s*\]/g, '<a href="$2" target="_blank" style="color: #007aff; text-decoration: underline;">$1</a>');
    
    // Convert simple links like https://example.com to clickable links
    line = line.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" style="color: #007aff; text-decoration: underline;">$1</a>');
    
    // Convert bullet points with asterisks
    if (/^\*\s+/.test(line)) {
      line = line.replace(/^\*\s+(.+)$/, '• $1');
    }
    
    // Wrap regular text in paragraph tags
    if (!line.startsWith('<h') && !line.startsWith('<hr') && !line.startsWith('<br>')) {
      line = `<p style="margin: 8px 0; line-height: 1.6; color: inherit;">${line}</p>`;
    }
    
    formattedLines.push(line);
  }
  
  return formattedLines.join('\n');
};

/**
 * Basic encoding fixes for legacy content
 */
export const fixEncodingIssues = (content: string): string => {
  return content
    .replace(/&amp;([a-zA-Z]+);/g, '&$1;')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Comprehensive HTML content preprocessing
 */
export const preprocessHTMLContent = (content: string): string => {
  let processedContent = fixEncodingIssues(content);
  
  return processedContent
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
    .replace(/&#(\d+);/g, (match, code) => {
      const num = parseInt(code);
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
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n\s*\n\s*\n/g, '\n\n');
};

/**
 * Strip quoted previous messages from HTML replies for display
 */
export const stripQuotedEmailHTML = (htmlContent: string): string => {
  try {
    const container = document.createElement('div');
    container.innerHTML = htmlContent;

    // Remove common quoted sections
    const selectors = [
      'blockquote',
      '.gmail_quote',
      'blockquote[type="cite"]',
      '.yahoo_quoted',
      '.gmail_attr',
      '.gmail_extra',
      '.moz-cite-prefix',
      '.OutlookMessageHeader',
      '#OLKSrcBody',
      '.reply-border'
    ];
    selectors.forEach(sel => container.querySelectorAll(sel).forEach(el => el.remove()));

    // Remove elements that contain typical quote headers like "On ... wrote:" or "Original Message"
    const textPatterns = /(On .+wrote:|-----Original Message-----|From: .+Subject: .+)/i;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const toRemove: Element[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      const text = (node.textContent || '').trim();
      if (textPatterns.test(text)) {
        const parent = node.parentElement;
        if (parent) toRemove.push(parent);
      }
    }
    toRemove.forEach(el => el.remove());

    return container.innerHTML;
  } catch {
    return htmlContent;
  }
};

/**
 * Strip quoted previous messages from plain text replies for display
 */
export const stripQuotedEmailText = (text: string): string => {
  try {
    const cutPattern = /(On .+wrote:|-----Original Message-----|---+ Forwarded message ---+|From: .+\n.*Sent: .+\n.*To: .+\n.*Subject: .+)/i;
    let result = text.replace(cutPattern, '').trim();
    // Remove classic '>' quoted lines
    result = result.replace(/^\s*>.*$/gm, '').trim();
    return result;
  } catch {
    return text;
  }
};