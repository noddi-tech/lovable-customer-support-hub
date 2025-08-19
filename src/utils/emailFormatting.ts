// Email formatting utilities for rendering emails with correct formatting
// Enhanced email processing for Apple Mail-like appearance
import DOMPurify from 'dompurify';
import { convertShortcodesToEmojis } from './emojiUtils';
import { formatPlainTextEmail } from './plainTextEmailFormatter';

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
 * Enhanced email HTML sanitization with strict security and formatting controls
 */
export const sanitizeEmailHTML = (
  htmlContent: string, 
  attachments: EmailAttachment[] = [], 
  preserveOriginalStyles: boolean = true,
  messageId?: string
): string => {
  // Strict email HTML configuration following security best practices
  const config = {
    ALLOWED_TAGS: [
      'a', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'img', 
      'table', 'thead', 'tbody', 'tr', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
      'span', 'div', 'pre', 'code'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'width', 'height', 'colspan', 'rowspan', 
      'align', 'cellpadding', 'cellspacing', 'style'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'iframe', 'meta', 'link', 'style'],
    FORBID_ATTR: ['javascript:', 'vbscript:', 'on*'],
    // Enhanced data URL filtering - only allow safe image data URLs
    KEEP_CONTENT: true,
    ADD_ATTR: ['target', 'rel'],
    ALLOW_DATA_ATTR: false,
    // Custom hook to add security attributes to links
    HOOKS: {
      afterSanitizeAttributes: function (node: Element) {
        // Enhanced link security validation
        if (node.tagName === 'A') {
          const href = node.getAttribute('href');
          if (href) {
            // Validate href against safe URL patterns
            const safeUrlPattern = /^(https?:\/\/|mailto:|tel:|#)/i;
            if (!safeUrlPattern.test(href)) {
              node.removeAttribute('href');
            } else {
              node.setAttribute('target', '_blank');
              node.setAttribute('rel', 'noopener noreferrer nofollow');
            }
          }
        }
        
        // Enhanced image security and performance
        if (node.tagName === 'IMG') {
          const src = node.getAttribute('src');
          
          // Handle data URLs with strict filtering
          if (src?.startsWith('data:')) {
            const safeDataPattern = /^data:image\/(jpeg|jpg|png|gif|webp|svg\+xml);base64,/i;
            if (!safeDataPattern.test(src)) {
              node.setAttribute('src', '');
              node.setAttribute('alt', node.getAttribute('alt') || 'Unsafe image blocked');
            }
          }
          
          // Set performance and security attributes
          node.setAttribute('loading', 'lazy');
          node.setAttribute('style', 'max-width: 100%; height: auto; display: block;');
          node.setAttribute('referrerpolicy', 'no-referrer');
          
          // Block external images by default for privacy
          if (src && !src.startsWith('cid:') && !src.startsWith('/') && !src.startsWith('data:')) {
            node.setAttribute('data-original-src', src);
            node.setAttribute('src', '');
            node.setAttribute('alt', node.getAttribute('alt') || 'Image blocked for privacy');
            node.setAttribute('data-blocked', 'true');
          }
        }
        
        // Sanitize style attributes to only allow safe properties
        if (node.hasAttribute('style')) {
          const style = node.getAttribute('style') || '';
          const safeStyles = style
            .split(';')
            .filter(rule => {
              const property = rule.split(':')[0]?.trim().toLowerCase();
              const safeProperties = [
                'color', 'background-color', 'font-family', 'font-size', 'font-weight',
                'text-decoration', 'text-align', 'margin', 'padding', 'border',
                'border-color', 'border-width', 'border-style', 'line-height', 'max-width'
              ];
              return safeProperties.includes(property);
            })
            .join(';');
          
          if (safeStyles) {
            node.setAttribute('style', safeStyles);
          } else {
            node.removeAttribute('style');
          }
        }
      }
    }
  };

  let processedContent = htmlContent;

  // Handle inline images with CID references
  if (attachments && attachments.length > 0) {
    attachments.forEach(attachment => {
      if (attachment.isInline && attachment.contentId) {
        const cidPattern = new RegExp(`cid:${attachment.contentId.replace(/[<>]/g, '')}`, 'gi');
        const srcCidPattern = new RegExp(`src=["']cid:${attachment.contentId.replace(/[<>]/g, '')}["']`, 'gi');
        
        // Use Supabase edge function to fetch attachment data
        const attachmentUrl = `${window.location.origin}/supabase/functions/v1/get-attachment/${attachment.attachmentId}?messageId=${messageId || ''}`;
        
        processedContent = processedContent.replace(cidPattern, attachmentUrl);
        processedContent = processedContent.replace(srcCidPattern, `src="${attachmentUrl}"`);
      }
    });
  }

  // Also handle CID references that might not have attachments data but are in content
  processedContent = processedContent.replace(
    /src=["']cid:([^"']+)["']/gi,
    (match, cidId) => {
      // Try to find attachment by CID
      const attachment = attachments?.find(att => 
        att.contentId && att.contentId.replace(/[<>]/g, '') === cidId
      );
      
      if (attachment) {
        return `src="${window.location.origin}/supabase/functions/v1/get-attachment/${attachment.attachmentId}?messageId=${messageId || ''}"`;
      }
      
      // Fallback to a placeholder for missing attachments
      return `src="data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="#f3f4f6"/><text x="100" y="55" text-anchor="middle" fill="#9ca3af" font-size="12">Image unavailable</text></svg>')}"`;
    }
  );

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
  // If explicitly HTML content type, check for HTML elements
  if (contentType.toLowerCase().includes('html')) {
    return true;
  }
  
  // Check for actual HTML elements (be more lenient)
  const htmlIndicators = [
    /<[^>]+>/g // Any HTML tag
  ];
  
  const hasHtmlTags = htmlIndicators.some(pattern => pattern.test(content));
  
  // If it has HTML tags and doesn't look like markdown, render as HTML
  const isMarkdown = content.includes('**') || content.includes('*') || content.includes('#') || content.includes('[') || content.includes('](');
  
  return hasHtmlTags && !isMarkdown;
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

// Re-export enhanced plain text formatter
export { formatPlainTextEmail };