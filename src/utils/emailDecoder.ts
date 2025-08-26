// emailDecoder.ts
// Utilities for properly decoding Gmail API email bodies with support for all charsets and languages
// Updated: August 07, 2025

/**
 * Recursively finds the preferred text part (HTML or plain) from the payload.
 * @param part - The current payload part
 * @param preferredMime - Preferred MIME type ('text/html' or 'text/plain')
 * @returns The matching part or null
 */
function findTextPart(part: any, preferredMime: string = 'text/html'): any {
  if (part.parts) {
    for (const subPart of part.parts) {
      const found = findTextPart(subPart, preferredMime);
      if (found) return found;
    }
  }
  if (part.mimeType === preferredMime) {
    return part;
  }
  return null;
}

/**
 * Fix Norwegian character encoding issues (UTF-8 decoded as Latin-1)
 */
function fixNorwegianEncoding(text: string): string {
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
    'Â': ''
  };

  let fixed = text;
  for (const [wrong, correct] of Object.entries(norwegianFixes)) {
    fixed = fixed.replace(new RegExp(wrong, 'g'), correct);
  }
  
  return fixed;
}

/**
 * Decodes the email body from a Gmail API message object, handling base64url, charsets, and multipart.
 * Supports all languages by using the part's charset (falls back to utf-8).
 * @param message - The full message object from gmail.users.messages.get({format: 'FULL'})
 * @returns The decoded string content (HTML or plain text)
 */
export function getDecodedEmailContent(message: any): string {
  const payload = message.payload;
  if (!payload) return '';

  // Prefer HTML, fallback to plain text
  let part = findTextPart(payload, 'text/html');
  if (!part) part = findTextPart(payload, 'text/plain');
  if (!part || !part.body || !part.body.data) return '';

  // Extract charset from Content-Type header
  let charset = 'utf-8';
  const contentTypeHeader = part.headers?.find((h: any) => h.name.toLowerCase() === 'content-type');
  if (contentTypeHeader) {
    const match = contentTypeHeader.value.match(/charset=["']?([^"';]+)["']?/i);
    if (match) charset = match[1].toLowerCase();
  }

  // Decode base64url (Gmail-specific: replace -/+ , _// , add padding)
  let base64 = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }

  // Base64 to binary bytes
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  // Decode bytes using the charset (handles æøå, emojis, Chinese, etc.)
  try {
    const decoder = new TextDecoder(charset, { fatal: false, ignoreBOM: true });
    let decoded = decoder.decode(bytes);
    
    // Check for Norwegian character encoding issues and fix them
    if (decoded.includes('Ã¸') || decoded.includes('Ã¥') || decoded.includes('Ã¦')) {
      console.log('[EmailDecoder] Detected Norwegian encoding issues, applying fixes');
      decoded = fixNorwegianEncoding(decoded);
    }
    
    return decoded;
  } catch (e) {
    console.warn(`Decoding failed with charset '${charset}', falling back to utf-8:`, e);
    const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true });
    let decoded = decoder.decode(bytes);
    
    // Apply Norwegian fixes to fallback as well
    if (decoded.includes('Ã¸') || decoded.includes('Ã¥') || decoded.includes('Ã¦')) {
      decoded = fixNorwegianEncoding(decoded);
    }
    
    return decoded;
  }
}