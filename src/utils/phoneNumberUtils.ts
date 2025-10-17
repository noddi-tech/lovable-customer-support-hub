import { VoiceIntegrationConfig } from '@/hooks/useVoiceIntegrations';

interface PhoneNumber {
  id: string;
  number: string;
  label: string;
}

export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters and normalize format
  return phone.replace(/\D/g, '');
}

/**
 * Format phone number for display (Norwegian format)
 * Examples:
 * - +4792444169 → +47 92 44 41 69
 * - 92444169 → 92 44 41 69
 * - +1234567890 → +1 234 567 890 (fallback for non-Norwegian)
 */
export function formatPhoneNumber(phone?: string): string {
  if (!phone) return 'Unknown';
  
  // Remove all non-digit characters except leading +
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  
  // Handle Norwegian numbers (+47 or 47 prefix)
  if (cleanPhone.startsWith('+47') || cleanPhone.startsWith('47')) {
    const normalized = cleanPhone.replace(/^\+?47/, '');
    
    // Norwegian mobile numbers are 8 digits
    if (normalized.length === 8) {
      const pairs = normalized.match(/.{1,2}/g) || [];
      return `+47 ${pairs.join(' ')}`;
    }
  }
  
  // For other formats, preserve the + and add spaces every 2-3 digits
  if (cleanPhone.startsWith('+')) {
    const countryCode = cleanPhone.slice(0, 3); // e.g., +47
    const rest = cleanPhone.slice(3);
    const groups = rest.match(/.{1,3}/g) || [];
    return `${countryCode} ${groups.join(' ')}`;
  }
  
  // Fallback: add spaces between digit pairs for local numbers
  const groups = cleanPhone.match(/.{1,2}/g) || [];
  return groups.join(' ');
}

export function findMonitoredPhoneNumber(
  phoneToMatch: string, 
  voiceIntegration?: VoiceIntegrationConfig
): PhoneNumber | null {
  if (!phoneToMatch || !voiceIntegration?.configuration?.phoneNumbers) {
    return null;
  }

  const normalizedPhone = normalizePhoneNumber(phoneToMatch);
  
  const phoneNumbers = voiceIntegration.configuration.phoneNumbers as PhoneNumber[];
  
  return phoneNumbers.find(monitoredPhone => {
    const normalizedMonitored = normalizePhoneNumber(monitoredPhone.number);
    return normalizedPhone === normalizedMonitored;
  }) || null;
}

export function getCompanyPhoneFromCall(call: any): string | null {
  // Check if company phone is stored in metadata
  if (call.metadata?.originalPayload?.number?.digits) {
    return call.metadata.originalPayload.number.digits;
  }
  
  // Check if it's in the call data directly
  if (call.metadata?.originalPayload?.number?.e164_digits) {
    return call.metadata.originalPayload.number.e164_digits;
  }
  
  return null;
}

export function getMonitoredPhoneForCall(
  call: any, 
  voiceIntegration?: VoiceIntegrationConfig
): { phoneNumber: PhoneNumber; type: 'company' | 'agent' } | null {
  // First check for company phone number
  const companyPhone = getCompanyPhoneFromCall(call);
  if (companyPhone) {
    const matchedCompanyPhone = findMonitoredPhoneNumber(companyPhone, voiceIntegration);
    if (matchedCompanyPhone) {
      return { phoneNumber: matchedCompanyPhone, type: 'company' };
    }
  }
  
  // Then check agent phone if available
  if (call.agent_phone) {
    const matchedAgentPhone = findMonitoredPhoneNumber(call.agent_phone, voiceIntegration);
    if (matchedAgentPhone) {
      return { phoneNumber: matchedAgentPhone, type: 'agent' };
    }
  }
  
  return null;
}