/**
 * Utilities for safely sanitizing user input for PostgREST queries.
 * Prevents filter injection attacks via .or() clauses.
 * 
 * Edge Function version - duplicated from src/utils/queryUtils.ts
 */

/**
 * Sanitizes user input for safe use in PostgREST .or() filter strings.
 * Removes characters that have special meaning in PostgREST filter syntax.
 */
export function sanitizeForPostgrest(input: string): string {
  if (!input) return '';
  return input
    .replace(/[,;()\\]/g, '')
    .trim();
}

/**
 * Validates and sanitizes email for use in PostgREST queries.
 * Returns null if the email format is invalid.
 */
export function sanitizeEmailForQuery(email: string): string | null {
  if (!email) return null;
  
  const sanitized = email
    .replace(/[,;()\\]/g, '')
    .trim()
    .toLowerCase();
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return null;
  }
  
  return sanitized;
}

/**
 * Sanitizes a phone number for query use.
 */
export function sanitizePhoneForQuery(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned.replace(/[,;()\\]/g, '').trim();
}
