import en from './en.json';
import no from './no.json';
import sv from './sv.json';

export type WidgetTranslations = typeof en;

// The Noddi customer frontend (packages/noddi-web LanguageCode) only supports
// nb / en / se, so the widget UI mirrors exactly that set. Other translation
// files are kept in the repo but are not selectable.
// Partial: non-English files may lag behind newly added keys; getWidgetTranslations
// merges them over English so missing keys still resolve.
const translations: Record<string, Partial<WidgetTranslations>> = {
  en,
  no,
  sv,
};

export const SUPPORTED_WIDGET_LANGUAGES = [
  { code: 'no', name: 'Norsk', flag: '🇳🇴' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
] as const;

export const DEFAULT_WIDGET_LANGUAGE = 'no';

/**
 * Map a host locale (BCP-47 like `nb-NO`, `en-US`, `sv-SE`, or the frontend
 * language codes `nb` / `en` / `se`) onto a widget UI language code.
 * Returns null when the value maps to nothing we support.
 */
export function normalizeWidgetLanguage(value?: string | null): string | null {
  if (!value) return null;
  const raw = String(value).trim().toLowerCase().replace('_', '-');
  const base = raw.split('-')[0];
  if (raw === 'no' || base === 'no' || base === 'nb' || base === 'nn') return 'no';
  if (base === 'en') return 'en';
  if (base === 'sv' || base === 'se') return 'sv';
  return null;
}

export function getWidgetTranslations(language: string): WidgetTranslations {
  // Merge over English so newly added keys never render as undefined in a
  // language whose file has not been updated yet.
  return { ...en, ...(translations[language] || {}) } as WidgetTranslations;

}

// Default English values (matches database defaults)
const DEFAULT_GREETING_EN = "Hi there! 👋 How can we help you today?";
const DEFAULT_RESPONSE_TIME_EN = "We usually respond within a few hours";

export function getLocalizedGreeting(
  greetingText: string,
  language: string,
  greetingTranslations?: Record<string, string>
): string {
  // 1. Check for custom translation for this language
  if (greetingTranslations && greetingTranslations[language]) {
    return greetingTranslations[language];
  }
  
  // 2. If default text matches English default, use built-in translation
  if (greetingText === DEFAULT_GREETING_EN) {
    return getWidgetTranslations(language).defaultGreeting;
  }
  
  // 3. Otherwise return the default text
  return greetingText;
}

export function getLocalizedResponseTime(
  responseTimeText: string,
  language: string,
  responseTimeTranslations?: Record<string, string>
): string {
  // 1. Check for custom translation for this language
  if (responseTimeTranslations && responseTimeTranslations[language]) {
    return responseTimeTranslations[language];
  }
  
  // 2. If default text matches English default, use built-in translation
  if (responseTimeText === DEFAULT_RESPONSE_TIME_EN) {
    return getWidgetTranslations(language).defaultResponseTime;
  }
  
  // 3. Otherwise return the default text
  return responseTimeText;
}

export default translations;
