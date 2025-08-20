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

// Enhanced i18n initialization with robust error handling
const initializeI18n = async () => {
  try {
    console.log('🌐 Starting i18n initialization...');
    
    await i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        resources,
        fallbackLng: 'en',
        defaultNS: 'common',
        debug: process.env.NODE_ENV === 'development',
        
        interpolation: {
          escapeValue: false,
        },
        
        detection: {
          order: ['localStorage', 'navigator'],
          lookupLocalStorage: 'i18nextLng',
          caches: ['localStorage'],
        },
        
        // Robust fallback configuration
        returnNull: false,
        returnEmptyString: false,
        returnObjects: false,
        keySeparator: '.',
        nsSeparator: ':',
        
        // Immediate initialization without waiting
        initImmediate: false,
        
        // Handle missing translations gracefully
        saveMissing: process.env.NODE_ENV === 'development',
        missingKeyHandler: (lng, ns, key, fallbackValue) => {
          console.warn(`🚨 Missing translation: ${lng}.${ns}.${key}`);
          return fallbackValue || key;
        },
      });
    
    console.log('✅ i18n initialized successfully:', {
      language: i18n.language,
      isInitialized: i18n.isInitialized,
      loadedNamespaces: Object.keys(i18n.services.resourceStore.data)
    });
    
    return true;
  } catch (error) {
    console.error('❌ i18n initialization failed:', error);
    
    // Fallback to basic English-only setup
    try {
      await i18n.init({
        resources: { en: { common: en } },
        lng: 'en',
        fallbackLng: 'en',
        defaultNS: 'common',
        returnNull: false,
        returnEmptyString: false,
      });
      console.log('⚠️ i18n fallback initialization successful');
      return true;
    } catch (fallbackError) {
      console.error('💥 Even fallback i18n initialization failed:', fallbackError);
      return false;
    }
  }
};

// Initialize immediately
initializeI18n();

export default i18n;