/**
 * Normalize a stored phone number to E.164.
 * Norwegian numbers are stored in a variety of shapes (8 digits, 0047..., 47...),
 * so we default bare 8-digit numbers to the +47 country code.
 */
export function normalizeToE164(raw: string, defaultCountryCode = "47"): string | null {
  if (!raw) return null

  let value = raw.trim().replace(/[^\d+]/g, "")
  if (!value) return null

  if (value.startsWith("00")) {
    value = `+${value.slice(2)}`
  }

  if (!value.startsWith("+")) {
    const digits = value.replace(/\D/g, "")
    if (digits.length === 8) {
      value = `+${defaultCountryCode}${digits}`
    } else if (digits.length > 8 && digits.startsWith(defaultCountryCode)) {
      value = `+${digits}`
    } else if (digits.length >= 10) {
      value = `+${digits}`
    } else {
      return null
    }
  }

  const digitsOnly = value.slice(1).replace(/\D/g, "")
  if (digitsOnly.length < 8 || digitsOnly.length > 15) return null

  return `+${digitsOnly}`
}
