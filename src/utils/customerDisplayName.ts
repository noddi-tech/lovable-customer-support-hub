/**
 * Smart customer display name utility
 * Prevents showing email twice and prioritizes actual names
 */

import type { NoddiLookupResponse } from '@/hooks/useNoddihKundeData';

interface CustomerDisplayResult {
  displayName: string;
  showEmail: boolean;
  email: string | null;
}

/**
 * Determines the best display name for a customer and whether to show email separately
 * Priority: noddi display_name > full_name (if different from email) > email (shown once)
 */
export function getCustomerDisplayWithNoddi(
  noddiData: NoddiLookupResponse | null | undefined,
  fullName: string | null | undefined,
  email: string | null | undefined
): CustomerDisplayResult {
  const normalizedEmail = email?.trim() || '';
  
  // Priority 1: Noddi API display_name
  const noddiDisplayName = noddiData?.data?.ui_meta?.display_name?.trim();
  if (noddiDisplayName && noddiDisplayName.toLowerCase() !== normalizedEmail.toLowerCase()) {
    return {
      displayName: noddiDisplayName,
      showEmail: !!normalizedEmail,
      email: normalizedEmail || null
    };
  }
  
  // Fallback to standard logic
  return getCustomerDisplay(fullName, email);
}

/**
 * Determines the best display name for a customer and whether to show email separately
 * Priority: full_name (if different from email) > email (shown once)
 */
export function getCustomerDisplay(
  fullName: string | null | undefined,
  email: string | null | undefined
): CustomerDisplayResult {
  const normalizedName = fullName?.trim() || '';
  const normalizedEmail = email?.trim() || '';
  
  // Check if name is essentially the same as email (case insensitive)
  const nameIsEmail = normalizedName.toLowerCase() === normalizedEmail.toLowerCase();
  
  // Check if name looks like an email (contains @)
  const nameContainsAt = normalizedName.includes('@');
  
  // If we have a proper name that's different from email
  if (normalizedName && !nameIsEmail && !nameContainsAt) {
    return {
      displayName: normalizedName,
      showEmail: !!normalizedEmail,
      email: normalizedEmail || null
    };
  }
  
  // If name is email or empty, show email as the display name (once only)
  if (normalizedEmail) {
    return {
      displayName: normalizedEmail,
      showEmail: false, // Don't show email again below
      email: normalizedEmail
    };
  }
  
  // Fallback for no data
  return {
    displayName: 'Unknown',
    showEmail: false,
    email: null
  };
}

/**
 * Gets the initial letter for avatar display
 */
export function getCustomerInitial(fullName: string | null | undefined, email: string | null | undefined): string {
  const { displayName } = getCustomerDisplay(fullName, email);
  return displayName.charAt(0).toUpperCase() || 'U';
}
