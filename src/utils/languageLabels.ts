/**
 * Human-readable labels for the locales the support widget supports.
 * Falls back to the raw code (upper-cased) for anything unexpected.
 */
const LANGUAGE_LABELS: Record<string, { label: string; flag: string }> = {
  nb: { label: 'Norsk', flag: '🇳🇴' },
  no: { label: 'Norsk', flag: '🇳🇴' },
  nn: { label: 'Norsk', flag: '🇳🇴' },
  en: { label: 'English', flag: '🇬🇧' },
  sv: { label: 'Svenska', flag: '🇸🇪' },
  se: { label: 'Svenska', flag: '🇸🇪' },
  da: { label: 'Dansk', flag: '🇩🇰' },
  de: { label: 'Deutsch', flag: '🇩🇪' },
  fr: { label: 'Français', flag: '🇫🇷' },
  es: { label: 'Español', flag: '🇪🇸' },
  it: { label: 'Italiano', flag: '🇮🇹' },
  pl: { label: 'Polski', flag: '🇵🇱' },
  lt: { label: 'Lietuvių', flag: '🇱🇹' },
};

/** Normalizes "nb-NO" / "EN_us" to a base language code such as "nb". */
export function normalizeLocale(locale?: string | null): string | null {
  if (!locale || typeof locale !== 'string') return null;
  const base = locale.trim().toLowerCase().split(/[-_]/)[0];
  return base.length >= 2 ? base : null;
}

export function getLanguageLabel(locale?: string | null): string | null {
  const base = normalizeLocale(locale);
  if (!base) return null;
  return LANGUAGE_LABELS[base]?.label ?? base.toUpperCase();
}

export function getLanguageFlag(locale?: string | null): string {
  const base = normalizeLocale(locale);
  return (base && LANGUAGE_LABELS[base]?.flag) || '🌐';
}
