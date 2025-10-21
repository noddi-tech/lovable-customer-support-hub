// Email formatting utilities for rendering emails with correct formatting
// Enhanced email processing for Apple Mail-like appearance
import DOMPurify from 'dompurify';
import { convertShortcodesToEmojis } from './emojiUtils';
import { formatPlainTextEmail } from './plainTextEmailFormatter';
import { createPlaceholder, rewriteImageSources } from './imageAssetHandler';

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  attachmentId: string;
  size: number;
  contentId?: string;
  contentLocation?: string;
  isInline?: boolean;
  contentDisposition?: string;
}

// Asset indexes for efficient image resolution
interface AssetInfo {
  attachment: EmailAttachment;
  signedUrl?: string;
  blobUrl?: string;
}

// Normalize CID for consistent lookups
const normalizeCid = (cid: string): string => {
  return cid.replace(/^cid:/i, '').replace(/[<>]/g, '').toLowerCase();
};

// Normalize Content-Location for consistent lookups
const normalizeContentLocation = (location: string): string => {
  if (location.startsWith('http://') || location.startsWith('https://')) {
    return location.toLowerCase();
  }
  return location.split('/').pop()?.toLowerCase() || location.toLowerCase();
};

// Build asset indexes from attachments
const buildAssetIndexes = (attachments: EmailAttachment[]) => {
  const byContentId = new Map<string, AssetInfo>();
  const byContentLocation = new Map<string, AssetInfo>();
  
  console.log('[EmailFormatting] Building asset indexes from attachments:', attachments);
  
  attachments.forEach((attachment, index) => {
    const assetInfo: AssetInfo = { attachment };
    
    console.log(`[EmailFormatting] Processing attachment ${index}:`, {
      filename: attachment.filename,
      contentId: attachment.contentId,
      contentLocation: attachment.contentLocation,
      isInline: attachment.isInline,
      mimeType: attachment.mimeType
    });
    
    if (attachment.contentId) {
      const normalizedCid = normalizeCid(attachment.contentId);
      console.log(`[EmailFormatting] Adding to byContentId: "${normalizedCid}" ->`, attachment.filename);
      byContentId.set(normalizedCid, assetInfo);
    }
    
    if (attachment.contentLocation) {
      const normalizedLocation = normalizeContentLocation(attachment.contentLocation);
      console.log(`[EmailFormatting] Adding to byContentLocation: "${normalizedLocation}" ->`, attachment.filename);
      byContentLocation.set(normalizedLocation, assetInfo);
    }
  });
  
  console.log('[EmailFormatting] Final asset indexes:', {
    byContentId: Array.from(byContentId.entries()),
    byContentLocation: Array.from(byContentLocation.entries())
  });
  
  return { byContentId, byContentLocation };
};

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
    ALLOWED_URI_REGEXP: /^(?:https:|data:|mailto:|tel:|#)/i,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'iframe', 'meta', 'link', 'style'],
    FORBID_ATTR: ['javascript:', 'vbscript:', 'on*'],
    // Enhanced data URL filtering - only allow safe image data URLs
    KEEP_CONTENT: false,
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
          
          // Handle data URLs with strict filtering and size limit
          if (src?.startsWith('data:')) {
            const safeDataPattern = /^data:image\/(jpeg|jpg|png|gif|webp|svg\+xml);base64,/i;
            const dataSizeInBytes = src.length * 0.75; // Approximate base64 to bytes conversion
            const maxSizeInBytes = 1024 * 1024; // 1MB limit
            
            if (!safeDataPattern.test(src) || dataSizeInBytes > maxSizeInBytes) {
              node.setAttribute('src', createPlaceholder('data-rejected'));
              node.setAttribute('alt', node.getAttribute('alt') || 'Data image rejected');
              node.setAttribute('data-error', 'data-rejected');
            }
          }
          
          // Set performance and security attributes
          node.setAttribute('loading', 'lazy');
          node.setAttribute('style', 'max-width: 100%; height: auto; display: block;');
          node.setAttribute('referrerpolicy', 'no-referrer');
          
          // Block external HTTP images to prevent mixed content warnings
          if (src && src.startsWith('http:')) {
            node.setAttribute('data-original-src', src);
            node.setAttribute('src', createPlaceholder('mixed-content'));
            node.setAttribute('alt', (node.getAttribute('alt') || 'Image') + ' (HTTP image blocked for security)');
            node.setAttribute('data-blocked', 'http-blocked');
            node.setAttribute('title', 'HTTP image blocked to prevent mixed content warnings');
          }
          // Block external images by default for privacy (HTTPS only)
          else if (src && !src.startsWith('cid:') && !src.startsWith('/') && !src.startsWith('data:') && !src.startsWith('blob:')) {
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

  // Build asset indexes for efficient lookups
  const { byContentId, byContentLocation } = buildAssetIndexes(attachments);
  
  // Strip style and script tag contents before sanitization
  let processedContent = htmlContent
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Initial CID rewriting for immediate resolution
  processedContent = processedContent.replace(
    /src=["']cid:([^"']+)["']/gi,
    (match, cidId) => {
      console.log(`[EmailFormatting] Processing CID reference: "${cidId}"`);
      const normalizedCid = normalizeCid(cidId);
      console.log(`[EmailFormatting] Normalized CID: "${normalizedCid}"`);
      const assetInfo = byContentId.get(normalizedCid);
      
      if (assetInfo) {
        const attachmentUrl = `${window.location.origin}/supabase/functions/v1/get-attachment/${assetInfo.attachment.attachmentId}?messageId=${messageId || ''}`;
        console.log(`[EmailFormatting] Found CID match, using URL: ${attachmentUrl}`);
        return `src="${attachmentUrl}"`;
      }
      
      console.log(`[EmailFormatting] CID miss for: "${normalizedCid}"`);
      return `src="${createPlaceholder('cid-miss')}"`;
    }
  );
  
  // Handle Content-Location references
  processedContent = processedContent.replace(
    /src=["']([^"']+)["']/gi,
    (match, src) => {
      // Skip if already processed or is absolute URL
      if (src.startsWith('http') || src.startsWith('data:') || src.startsWith('blob:') || src.includes('get-attachment')) {
        return match;
      }
      
      console.log(`[EmailFormatting] Processing potential Content-Location: "${src}"`);
      const normalizedLocation = normalizeContentLocation(src);
      console.log(`[EmailFormatting] Normalized location: "${normalizedLocation}"`);
      const assetInfo = byContentLocation.get(normalizedLocation);
      
      if (assetInfo) {
        const attachmentUrl = `${window.location.origin}/supabase/functions/v1/get-attachment/${assetInfo.attachment.attachmentId}?messageId=${messageId || ''}`;
        console.log(`[EmailFormatting] Found Content-Location match, using URL: ${attachmentUrl}`);
        return `src="${attachmentUrl}"`;
      }
      
      console.log(`[EmailFormatting] Content-Location miss for: "${normalizedLocation}"`);
      return match; // Keep original if no match found
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
    <div class="email-render" style="
      max-width: min(100%, 900px);
      margin: 0 auto;
      overflow-wrap: anywhere;
      background-color: transparent;
    ">
      <style>
        /* CSP-compliant email rendering styles */
        .email-render {
        }
        
        /* Force readable colors for elements without explicit color */
        .email-render :not([style*="color"]):not([color]) {
          color: inherit !important;
        }
        
        /* Minimal reset to preserve original email styling */
        .email-render * {
          box-sizing: border-box;
        }
        
        /* Preserve original table layouts and spacing */
        .email-render table {
          border-collapse: collapse;
          mso-table-lspace: 0pt !important;
          mso-table-rspace: 0pt !important;
        }
        
        /* Enhanced image rendering with proper scaling */
        .email-render img {
          max-width: 100% !important;
          height: auto !important;
          display: block;
          border: 0;
        }
        
        /* Preserve link styling but keep contrast */
        .email-render a {
          word-break: break-word;
          color: inherit !important;
          text-decoration: underline;
        }
        
        /* Subtle hr to match current text color */
        .email-render hr {
          border: none;
          border-top: 1px solid currentColor;
          opacity: 0.2;
          margin: 20px 0;
        }
        
        /* Mobile responsive adjustments */
        @media (max-width: 600px) {
          .email-render table[width="600"] {
            width: 100% !important;
          }
          
          .email-render .structure__table {
            width: 100% !important;
          }
          
          /* Ensure mobile padding on containers */
          .email-render [style*="padding:15px 60px"] {
            padding: 15px 20px !important;
          }
        }
        
        /* Preserve email-specific MSO styles for Outlook compatibility */
        .email-render [style*="mso-line-height-rule"] {
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
 * Enhanced encoding fixes for Norwegian and international characters
 */
export const fixEncodingIssues = (content: string): string => {
  let fixed = content;
  
  // Fix Norwegian character encoding issues (UTF-8 decoded as Latin-1)
  const norwegianFixes: Record<string, string> = {
    'Ã¸': 'ø',
    'Ã¥': 'å', 
    'Ã¦': 'æ',
    'Ã˜': 'Ø',
    'Ã…': 'Å',
    'Ã†': 'Æ',
    'â€™': "'",
    'â€œ': '"',
    'â€': '"',
    'â€"': '–',
    'â€•': '—',
    'Â': ' '
  };

  // Apply Norwegian character fixes
  for (const [wrong, correct] of Object.entries(norwegianFixes)) {
    fixed = fixed.replace(new RegExp(wrong, 'g'), correct);
  }
  
  // Fix HTML entities
  fixed = fixed
    .replace(/&amp;([a-zA-Z]+);/g, '&$1;')
    .replace(/\s+/g, ' ')
    .trim();
    
  return fixed;
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