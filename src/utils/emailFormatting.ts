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

  // Apply Apple Mail-inspired styling for exact visual match
  return `
    <div class="email-html-content" style="
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
      font-size: 16px;
      line-height: 1.47;
      color: #1d1d1f;
      max-width: 100%;
      overflow-wrap: break-word;
      word-wrap: break-word;
      margin: 0;
      padding: 0;
      background-color: #f5f5f7;
    ">
      <div style="
        background-color: #ffffff;
        margin: 0;
        padding: 20px 32px;
        border-radius: 0;
      ">
      <style>
        .email-html-content {
          --email-primary: #0071e3;
          --email-text: #1d1d1f;
          --email-text-secondary: #6e6e73;
          --email-border: #d2d2d7;
          --email-bg-light: #f5f5f7;
          --email-link: #0071e3;
        }
        
        /* Reset and base styles for Apple Mail consistency */
        .email-html-content * {
          box-sizing: border-box;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        /* Typography matching Apple Mail */
        .email-html-content p {
          margin: 0 0 16px 0;
          line-height: 1.47;
          color: var(--email-text);
          font-size: 16px;
        }
        
        .email-html-content h1, .email-html-content h2, .email-html-content h3,
        .email-html-content h4, .email-html-content h5, .email-html-content h6 {
          margin: 32px 0 16px 0;
          font-weight: 600;
          line-height: 1.25;
          color: var(--email-text);
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
        }
        
        .email-html-content h1 { font-size: 32px; }
        .email-html-content h2 { font-size: 28px; }
        .email-html-content h3 { font-size: 24px; }
        .email-html-content h4 { font-size: 20px; }
        
        /* Links matching Apple Mail style */
        .email-html-content a {
          color: var(--email-link) !important;
          text-decoration: underline;
          text-decoration-color: var(--email-link);
          word-break: break-word;
          -webkit-text-decoration-color: var(--email-link);
        }
        
        .email-html-content a:hover {
          color: #004085 !important;
          text-decoration: underline;
        }
        
        /* Images with Apple Mail spacing */
        .email-html-content img {
          max-width: 100% !important;
          height: auto !important;
          border-radius: 0;
          margin: 16px 0;
          display: block;
          border: 0;
        }
        
        /* Tables - Critical for email layout matching Apple Mail */
        .email-html-content table {
          border-collapse: collapse;
          width: 100%;
          margin: 20px 0;
          font-size: inherit;
          line-height: inherit;
        }
        
        .email-html-content td, .email-html-content th {
          padding: 12px 16px;
          border: 1px solid var(--email-border);
          text-align: left;
          vertical-align: top;
          line-height: 1.47;
          font-size: 16px;
        }
        
        .email-html-content th {
          background-color: var(--email-bg-light);
          font-weight: 600;
          color: var(--email-text);
        }
        
        /* Handle nested tables (common in email layouts) */
        .email-html-content table table {
          margin: 0;
          width: 100%;
        }
        
        .email-html-content table table td {
          border: none;
          padding: 8px 12px;
        }
        
        /* Lists matching Apple Mail */
        .email-html-content ul, .email-html-content ol {
          margin: 16px 0;
          padding-left: 24px;
          line-height: 1.47;
        }
        
        .email-html-content li {
          margin: 8px 0;
          line-height: 1.47;
          color: var(--email-text);
        }
        
        /* Email-specific elements */
        .email-html-content center {
          text-align: center;
          margin: 20px 0;
        }
        
        .email-html-content [align="center"] {
          text-align: center;
          margin: 20px 0;
        }
        
        .email-html-content blockquote {
          margin: 20px 0;
          padding: 16px 20px;
          border-left: 4px solid var(--email-primary);
          background-color: var(--email-bg-light);
          font-style: italic;
          line-height: 1.47;
        }
        
        .email-html-content hr {
          margin: 32px 0;
          border: none;
          border-top: 1px solid var(--email-border);
        }
        
        .email-html-content pre {
          background-color: var(--email-bg-light);
          border-radius: 8px;
          padding: 16px;
          overflow-x: auto;
          font-size: 14px;
          margin: 20px 0;
          line-height: 1.4;
          font-family: 'SF Mono', Monaco, 'Consolas', monospace;
        }
        
        .email-html-content code {
          background-color: var(--email-bg-light);
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 14px;
          font-family: 'SF Mono', Monaco, 'Consolas', monospace;
        }
        
        /* Strong/bold text */
        .email-html-content strong, .email-html-content b {
          font-weight: 600;
          color: var(--email-text);
        }
        
        /* Button styling for Apple Mail-like appearance */
        .email-html-content [style*="background-color: #4285f4"],
        .email-html-content [style*="background-color:#4285f4"],
        .email-html-content [style*="background-color: #0071e3"],
        .email-html-content [style*="background-color:#0071e3"],
        .email-html-content [style*="background-color: rgb(66, 133, 244)"],
        .email-html-content [style*="background-color: rgb(0, 113, 227)"] {
          display: inline-block !important;
          padding: 12px 24px !important;
          border-radius: 8px !important;
          text-decoration: none !important;
          font-weight: 500 !important;
          text-align: center !important;
          line-height: 1.2 !important;
          color: #ffffff !important;
          font-size: 16px !important;
          margin: 8px 0 !important;
          border: none !important;
        }
        
        /* Preserve email font attributes while ensuring consistency */
        .email-html-content font[face] {
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif !important;
        }
        
        .email-html-content font[size="1"] { font-size: 12px !important; }
        .email-html-content font[size="2"] { font-size: 14px !important; }
        .email-html-content font[size="3"] { font-size: 16px !important; }
        .email-html-content font[size="4"] { font-size: 18px !important; }
        .email-html-content font[size="5"] { font-size: 20px !important; }
        .email-html-content font[size="6"] { font-size: 24px !important; }
        .email-html-content font[size="7"] { font-size: 28px !important; }
        
        /* Small text */
        .email-html-content small {
          font-size: 14px;
          color: var(--email-text-secondary);
          line-height: 1.47;
        }
        
        /* Responsive design maintaining Apple Mail proportions */
        @media (max-width: 600px) {
          .email-html-content {
            font-size: 16px;
            padding: 16px 20px;
          }
          
          .email-html-content table {
            font-size: 16px;
          }
          
          .email-html-content td, .email-html-content th {
            padding: 8px 12px;
            font-size: 16px;
          }
          
          .email-html-content h1 { font-size: 28px; }
          .email-html-content h2 { font-size: 24px; }
          .email-html-content h3 { font-size: 20px; }
          .email-html-content h4 { font-size: 18px; }
        }
        
        /* Ensure proper spacing for email footer/header content */
        .email-html-content > table:first-child {
          margin-top: 0;
        }
        
        .email-html-content > table:last-child {
          margin-bottom: 0;
        }
        
        /* Handle email-specific alignment */
        .email-html-content td[align="center"] {
          text-align: center;
        }
        
        .email-html-content td[align="left"] {
          text-align: left;
        }
        
        .email-html-content td[align="right"] {
          text-align: right;
        }
      </style>
      ${sanitized}
      </div>
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
      line = `<p style="margin: 8px 0; line-height: 1.6; color: #000;">${line}</p>`;
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