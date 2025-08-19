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