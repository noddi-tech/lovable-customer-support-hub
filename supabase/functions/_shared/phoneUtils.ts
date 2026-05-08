// Phone normalization + SMS segment math (provider-agnostic).

export function isE164(input: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(input);
}

// Norway-default normalization. Strips spaces/dashes; bare 8-digit numbers get +47.
export function toE164(input: string, defaultCountry: 'NO' = 'NO'): string {
  if (!input) return input;
  const trimmed = input.replace(/[\s\-()]/g, '');
  if (trimmed.startsWith('+')) return trimmed;
  if (trimmed.startsWith('00')) return '+' + trimmed.slice(2);
  if (defaultCountry === 'NO' && /^[0-9]{8}$/.test(trimmed)) return '+47' + trimmed;
  if (/^47[0-9]{8}$/.test(trimmed)) return '+' + trimmed;
  return trimmed;
}

// Alphanumeric sender IDs: max 11 chars, must contain at least one letter.
export function isAlphaSender(input: string): boolean {
  return /^[A-Za-z0-9]{1,11}$/.test(input) && /[A-Za-z]/.test(input);
}

const GSM7_BASE =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1bÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM7_EXT = '\f^{}\\[~]|€';

export function isGsm7(text: string): boolean {
  for (const ch of text) {
    if (!GSM7_BASE.includes(ch) && !GSM7_EXT.includes(ch)) return false;
  }
  return true;
}

export interface SegmentInfo {
  encoding: 'GSM-7' | 'UCS-2';
  length: number; // logical length in chars (extended GSM chars count as 2)
  segments: number;
  remaining: number; // chars remaining in current segment
}

export function calculateSegments(text: string): SegmentInfo {
  if (isGsm7(text)) {
    let length = 0;
    for (const ch of text) length += GSM7_EXT.includes(ch) ? 2 : 1;
    if (length <= 160) {
      return { encoding: 'GSM-7', length, segments: length === 0 ? 0 : 1, remaining: 160 - length };
    }
    const segments = Math.ceil(length / 153);
    return { encoding: 'GSM-7', length, segments, remaining: segments * 153 - length };
  }
  const length = [...text].length;
  if (length <= 70) {
    return { encoding: 'UCS-2', length, segments: length === 0 ? 0 : 1, remaining: 70 - length };
  }
  const segments = Math.ceil(length / 67);
  return { encoding: 'UCS-2', length, segments, remaining: segments * 67 - length };
}
