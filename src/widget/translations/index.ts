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

const translations: Record<string, WidgetTranslations> = {
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
  { code: 'no', name: 'Norsk' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'sv', name: 'Svenska' },
  { code: 'da', name: 'Dansk' },
] as const;

export function getWidgetTranslations(language: string): WidgetTranslations {
  return translations[language] || translations.en;
}

// Default English values (matches database defaults)
const DEFAULT_GREETING_EN = "Hi there! 👋 How can we help you today?";
const DEFAULT_RESPONSE_TIME_EN = "We usually respond within a few hours";

export function getLocalizedGreeting(customText: string, language: string): string {
  if (customText === DEFAULT_GREETING_EN) {
    return getWidgetTranslations(language).defaultGreeting;
  }
  return customText;
}

export function getLocalizedResponseTime(customText: string, language: string): string {
  if (customText === DEFAULT_RESPONSE_TIME_EN) {
    return getWidgetTranslations(language).defaultResponseTime;
  }
  return customText;
}

export default translations;
