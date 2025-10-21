import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content for safe rendering in emails
 * Allows common email formatting tags while preventing XSS attacks
 */
export const sanitizeEmailHTML = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'div', 'br', 'span', 'strong', 'em', 'u', 'a', 
      'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'img',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'width', 'height', 'style', 
      'class', 'target', 'rel', 'title', 'id', 'dir'
    ],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
};

/**
 * Sanitizes HTML content for newsletter/template rendering
 * More permissive than email sanitization but still prevents XSS
 */
export const sanitizeNewsletterHTML = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'div', 'br', 'span', 'strong', 'em', 'u', 'a', 
      'ul', 'ol', 'li', 'table', 'tbody', 'thead', 'tr', 'td', 'th', 'img',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
      'hr', 'button', 'section', 'article', 'header', 'footer'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'width', 'height', 'style', 
      'class', 'target', 'rel', 'title', 'id', 'role', 'aria-label', 'dir'
    ],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
};

/**
 * Sanitizes HTML content for admin templates
 * Even more permissive but still prevents script injection
 */
export const sanitizeTemplateHTML = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'div', 'br', 'span', 'strong', 'em', 'u', 'a', 
      'ul', 'ol', 'li', 'table', 'tbody', 'thead', 'tr', 'td', 'th', 'img',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
      'hr', 'button', 'section', 'article', 'header', 'footer', 'address'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'width', 'height', 'style', 
      'class', 'target', 'rel', 'title', 'id', 'role', 'aria-label',
      'colspan', 'rowspan', 'align', 'valign', 'dir'
    ],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
};
