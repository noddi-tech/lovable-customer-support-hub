import en from './en.json';
import no from './no.json';
import es from './es.json';
import fr from './fr.json';
import de from './de.json';
import it from './it.json';
import pt from './pt.json';
import nl from './nl.json';
import sv from './sv.json';
import da from './da.json';

export type WidgetTranslations = typeof en;

// Partial: non-English files may lag behind newly added keys; getWidgetTranslations
// merges them over English so missing keys still resolve.
const translations: Record<string, Partial<WidgetTranslations>> = {
  en,
  no,
  es,
  fr,
  de,
  it,
  pt,
  nl,
  sv,
  da,
};

export const SUPPORTED_WIDGET_LANGUAGES = [
  { code: 'no', name: 'Norsk', flag: '🇳🇴' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰' },
] as const;

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
