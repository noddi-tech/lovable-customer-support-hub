/**
 * Generate a stable, consistent cache key for customer lookups
 * Uses both email and phone to ensure we always hit the same cache
 * regardless of which identifier component has access to
 */
export function getCustomerCacheKey(customer: {
  email?: string | null;
  phone?: string | null;
} | null): string {
  if (!customer) return 'no-identifier';
  
  const email = customer.email?.toLowerCase().trim();
  const phone = customer.phone?.replace(/\s/g, '');
  
  // Use both if available (most stable)
  if (email && phone) {
    return `${email}|${phone}`;
  }
  
  // Fallback to whichever is available
  return email || phone || 'no-identifier';
}
