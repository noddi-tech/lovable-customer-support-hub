// Email formatting utilities
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
 * Handles inline images and applies consistent styling
 */
export const sanitizeEmailHTML = (htmlContent: string, attachments: EmailAttachment[] = []) => {
  // Configure DOMPurify for safe HTML rendering
  const config = {
    ALLOWED_TAGS: [
      'p', 'br', 'div', 'span', 'a', 'img', 'strong', 'em', 'b', 'i', 'u',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote',
      'table', 'thead', 'tbody', 'tr', 'td', 'th', 'pre', 'code', 'hr'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'width', 'height', 'style',
      'class', 'target', 'rel', 'colspan', 'rowspan'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button', 'iframe'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur'],
    KEEP_CONTENT: true,
    ADD_ATTR: ['target']
  };

  // Pre-process content to handle inline images
  let processedContent = htmlContent;

  // Handle inline images by replacing cid: references
  if (attachments && attachments.length > 0) {
    attachments.forEach((attachment) => {
      if (attachment.isInline && attachment.contentId) {
        const cidPattern = new RegExp(`cid:${attachment.contentId}`, 'gi');
        // Replace with a placeholder for now - in production you'd fetch from Gmail API
        processedContent = processedContent.replace(cidPattern, '/placeholder.svg');
        
        // Also handle src="cid:..." format
        const srcCidPattern = new RegExp(`src=["']cid:${attachment.contentId}["']`, 'gi');
        processedContent = processedContent.replace(srcCidPattern, 'src="/placeholder.svg"');
      }
    });
  }

  // Sanitize with DOMPurify
  const sanitized = DOMPurify.sanitize(processedContent, config);

  // Apply consistent styling for email content
  const styledContent = `
    <div style="
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: inherit;
      max-width: 100%;
      overflow-wrap: break-word;
      word-wrap: break-word;
    ">
      <style>
        .email-content img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
          display: block;
          margin: 8px 0;
        }
        .email-content table {
          border-collapse: collapse;
          width: 100%;
          max-width: 100%;
        }
        .email-content td, .email-content th {
          padding: 8px;
          border: 1px solid #e5e7eb;
        }
        .email-content a {
          color: hsl(var(--primary));
          text-decoration: underline;
        }
        .email-content a:hover {
          color: hsl(var(--primary-hover));
        }
        .email-content blockquote {
          border-left: 4px solid hsl(var(--border));
          padding-left: 16px;
          margin: 16px 0;
          color: hsl(var(--muted-foreground));
        }
        .email-content p {
          margin: 8px 0;
        }
        .email-content h1, .email-content h2, .email-content h3, 
        .email-content h4, .email-content h5, .email-content h6 {
          margin: 16px 0 8px 0;
          font-weight: 600;
        }
        .email-content ul, .email-content ol {
          margin: 8px 0;
          padding-left: 24px;
        }
        .email-content li {
          margin: 4px 0;
        }
        .email-content pre {
          background-color: hsl(var(--muted));
          padding: 12px;
          border-radius: 4px;
          overflow-x: auto;
          font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
          font-size: 0.85em;
        }
        .email-content code {
          background-color: hsl(var(--muted));
          padding: 2px 4px;
          border-radius: 2px;
          font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
          font-size: 0.85em;
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
 * Extracts plain text from HTML content and removes quoted email sections
 */
export const extractTextFromHTML = (htmlContent: string): string => {
  // Remove HTML tags and decode entities
  let textContent = htmlContent
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&amp;/g, '&') // Replace HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r?\n\s*\r?\n/g, '\n') // Remove extra blank lines
    .trim();

  // Remove quoted email content (common email reply patterns)
  const lines = textContent.split('\n');
  const cleanLines = [];
  let inQuotedSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for common quote patterns
    if (
      line.startsWith('>') || // Standard email quote
      line.match(/^On .+ wrote:$/i) || // "On [date] [person] wrote:"
      line.match(/^From:.+To:.+Subject:/i) || // Email headers
      line.includes('-----Original Message-----') ||
      line.includes('--- Forwarded message ---') ||
      line.match(/^\d{1,2}\/\d{1,2}\/\d{4}.+wrote:$/i) // Date patterns
    ) {
      inQuotedSection = true;
      continue;
    }
    
    // Reset quote detection if we hit a normal line after some content
    if (!line.startsWith('>') && line.length > 0 && !inQuotedSection) {
      cleanLines.push(lines[i]);
    } else if (!inQuotedSection && line.length > 0) {
      cleanLines.push(lines[i]);
    }
  }
  
  return cleanLines.join('\n').trim();
};

/**
 * Determines if content should be rendered as HTML or plain text
 */
export const shouldRenderAsHTML = (content: string, contentType: string): boolean => {
  return contentType === 'html' || (content.includes('<') && content.includes('>'));
};