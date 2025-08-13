import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import en from '@/locales/en/common.json';
import es from '@/locales/es/common.json';
import fr from '@/locales/fr/common.json';
import de from '@/locales/de/common.json';
import it from '@/locales/it/common.json';
import pt from '@/locales/pt/common.json';
import nl from '@/locales/nl/common.json';
import no from '@/locales/no/common.json';
import sv from '@/locales/sv/common.json';
import da from '@/locales/da/common.json';

const resources = {
  en: { common: en },
  es: { common: es },
  fr: { common: fr },
  de: { common: de },
  it: { common: it },
  pt: { common: pt },
  nl: { common: nl },
  no: { common: no },
  sv: { common: sv },
  da: { common: da },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    
    interpolation: {
      escapeValue: false,
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
  });

export default i18n;