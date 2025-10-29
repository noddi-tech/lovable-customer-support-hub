import { stripHtml } from './stripHtml';

/**
 * Extract a clean preview from message content
 * Removes HTML, quote headers, signatures, and excessive whitespace
 */
export function getSmartPreview(content: string, maxLength: number = 150): string {
  if (!content) return '';
  
  // Strip HTML first
  let text = stripHtml(content);
  
  // Remove common email quote headers (case insensitive)
  const quotePatterns = [
    // English patterns
    /On .+? wrote:/gi,
    /On .+? at .+? UTC, .+? wrote:/gi,  // Gmail "On Wed, Oct 29, 2025 at 9:40 AM UTC, Fredrik wrote:"
    /From:.+Sent:.+To:.+Subject:/gi,
    /-----Original Message-----/gi,
    // Norwegian patterns
    /ons\. \d+ \. .+? skrev .+?:/gi,     // "ons. 29. okt. skrev"
    /(Den|På) .+ skrev:$/gi,
    /Från:.+Skickat:.+Till:.+Ämne:/gi,   // Swedish
    /De:.+Envoyé:.+À:.+Objet:/gi,        // French
    /Von:.+Gesendet:.+An:.+Betreff:/gi,  // German
    // Separators
    /__+/g,
    /_{3,}/g,
    /={3,}/g,
    /-{3,}/g,
    /\*{3,}/g,
  ];
  
  for (const pattern of quotePatterns) {
    text = text.replace(pattern, '');
  }
  
  // Remove signature delimiters and content after them
  const signatureDelimiters = [
    /\n--\s*\n.*/s,
    /\nBest regards.*/si,
    /\nKind regards.*/si,
    /\nSincerely.*/si,
    /\nMed vennlig hilsen.*/si,
    /\nBeste groeten.*/si,
  ];
  
  for (const delimiter of signatureDelimiters) {
    text = text.replace(delimiter, '');
  }
  
  // Remove excessive whitespace
  text = text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Truncate to maxLength
  if (text.length > maxLength) {
    return text.substring(0, maxLength).trim() + '…';
  }
  
  return text;
}

/**
 * Sanitize display name by stripping HTML and entities
 */
export function sanitizeDisplayName(name: string | undefined): string {
  if (!name) return '';
  
  // Strip HTML tags
  let clean = stripHtml(name);
  
  // Remove any remaining angle brackets
  clean = clean.replace(/[<>]/g, '');
  
  // Trim whitespace
  clean = clean.trim();
  
  return clean;
}
