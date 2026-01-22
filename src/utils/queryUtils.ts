/**
 * Utilities for safely sanitizing user input for PostgREST queries.
 * Prevents filter injection attacks via .or() clauses.
 */

/**
 * Sanitizes user input for safe use in PostgREST .or() filter strings.
 * Removes characters that have special meaning in PostgREST filter syntax.
 * 
 * @example
 * // Prevents injection like: "test,id.neq.0" from breaking filter
 * const safe = sanitizeForPostgrest(userInput);
 * .or(`name.ilike.%${safe}%,email.ilike.%${safe}%`)
 */
export function sanitizeForPostgrest(input: string): string {
  if (!input) return '';
  // Remove characters with special meaning in PostgREST filters:
  // , (separator), ; (semicolon), ( ) parentheses
  // \ (escape char)
  return input
    .replace(/[,;()\\]/g, '') // Remove filter syntax chars
    .trim();
}

/**
 * Validates and sanitizes email for use in PostgREST queries.
 * Returns null if the email format is invalid.
 * 
 * @example
 * const safeEmail = sanitizeEmailForQuery(email);
 * if (safeEmail) {
 *   .eq('email', safeEmail)
 * }
 */
export function sanitizeEmailForQuery(email: string): string | null {
  if (!email) return null;
  
  const sanitized = email
    .replace(/[,;()\\]/g, '') // Remove PostgREST special chars
    .trim()
    .toLowerCase();
  
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return null;
  }
  
  return sanitized;
}

/**
 * Sanitizes a phone number for query use.
 * Removes all non-digit characters except leading +.
 */
export function sanitizePhoneForQuery(phone: string): string {
  if (!phone) return '';
  
  // Keep only digits and leading +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Remove PostgREST special chars (shouldn't be any after above, but be safe)
  return cleaned.replace(/[,;()\\]/g, '').trim();
}
