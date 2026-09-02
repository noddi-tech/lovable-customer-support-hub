export interface PhoneCountryInfo {
  prefix: string
  placeholder: string
  flag: string
  digitLength: number // expected local number length (for normalization)
}

const phoneCountryCodes: Record<string, PhoneCountryInfo> = {
  no: { prefix: "+47", placeholder: "XXX XX XXX", flag: "🇳🇴", digitLength: 8 },
  en: { prefix: "+44", placeholder: "XXXX XXXXXX", flag: "🇬🇧", digitLength: 10 },
  sv: { prefix: "+46", placeholder: "XX XXX XX XX", flag: "🇸🇪", digitLength: 9 },
  da: { prefix: "+45", placeholder: "XX XX XX XX", flag: "🇩🇰", digitLength: 8 },
  de: { prefix: "+49", placeholder: "XXX XXXXXXX", flag: "🇩🇪", digitLength: 10 },
  fr: { prefix: "+33", placeholder: "X XX XX XX XX", flag: "🇫🇷", digitLength: 9 },
  es: { prefix: "+34", placeholder: "XXX XXX XXX", flag: "🇪🇸", digitLength: 9 },
  it: { prefix: "+39", placeholder: "XXX XXX XXXX", flag: "🇮🇹", digitLength: 10 },
  pt: { prefix: "+351", placeholder: "XXX XXX XXX", flag: "🇵🇹", digitLength: 9 },
  nl: { prefix: "+31", placeholder: "X XXXXXXXX", flag: "🇳🇱", digitLength: 9 },
}

const DEFAULT_COUNTRY: PhoneCountryInfo = phoneCountryCodes.no

export function getPhoneCountryInfo(language?: string): PhoneCountryInfo {
  if (!language) return DEFAULT_COUNTRY
  return phoneCountryCodes[language.toLowerCase()] || DEFAULT_COUNTRY
}
