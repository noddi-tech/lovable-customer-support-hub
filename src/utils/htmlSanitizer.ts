import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content for safe rendering in emails
 * Allows common email formatting tags while preventing XSS attacks
 */
export const sanitizeEmailHTML = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'div', 'br', 'span', 'strong', 'em', 'u', 'a', 
      'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'img',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
      'b', 'i', 's', 'sub', 'sup', 'address', 'center', 'font',
      'caption', 'colgroup', 'col', 'style'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'width', 'height', 'style', 
      'class', 'target', 'rel', 'title', 'id', 'dir',
      'cellpadding', 'cellspacing', 'border', 'bgcolor', 'background',
      'valign', 'align', 'colspan', 'rowspan', 'color', 'face', 'size'
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
      'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'img',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
      'hr', 'button', 'section', 'article', 'header', 'footer',
      'b', 'i', 's', 'sub', 'sup', 'address', 'center', 'font',
      'caption', 'colgroup', 'col', 'style'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'width', 'height', 'style', 
      'class', 'target', 'rel', 'title', 'id', 'role', 'aria-label', 'dir',
      'cellpadding', 'cellspacing', 'border', 'bgcolor', 'background',
      'valign', 'align', 'colspan', 'rowspan', 'color', 'face', 'size'
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
      'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'img',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
      'hr', 'button', 'section', 'article', 'header', 'footer', 'address',
      'b', 'i', 's', 'sub', 'sup', 'center', 'font',
      'caption', 'colgroup', 'col', 'style'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'width', 'height', 'style', 
      'class', 'target', 'rel', 'title', 'id', 'role', 'aria-label', 'dir',
      'cellpadding', 'cellspacing', 'border', 'bgcolor', 'background',
      'valign', 'align', 'colspan', 'rowspan', 'color', 'face', 'size'
    ],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
};
