import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { enUS, es, fr, de, it, ptBR, nl, nb, sv, da } from 'date-fns/locale';

const locales = {
  en: enUS,
  es,
  fr,
  de,
  it,
  pt: ptBR,
  nl,
  no: nb,
  sv,
  da,
};

export function formatRelativeTime(date: Date | string, locale: string = 'en'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) {
    return getRelativeTimeText('justNow', locale);
  } else if (diffInMinutes < 60) {
    return getRelativeTimeText('minutesAgo', locale, diffInMinutes);
  } else if (diffInMinutes < 1440) { // 24 hours
    const hours = Math.floor(diffInMinutes / 60);
    return getRelativeTimeText('hoursAgo', locale, hours);
  } else {
    const days = Math.floor(diffInMinutes / 1440);
    if (days === 1) {
      return getRelativeTimeText('yesterday', locale);
    } else if (days < 7) {
      return getRelativeTimeText('daysAgo', locale, days);
    } else {
      // For older dates, show the actual date
      const dateFnsLocale = locales[locale as keyof typeof locales] || enUS;
      return format(dateObj, 'MMM d, yyyy', { locale: dateFnsLocale });
    }
  }
}

export function formatDateTime(date: Date | string, locale: string = 'en', timeZone?: string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const dateFnsLocale = locales[locale as keyof typeof locales] || enUS;
  
  if (timeZone) {
    return formatInTimeZone(dateObj, timeZone, 'MMM d, yyyy HH:mm', { locale: dateFnsLocale });
  }
  
  return format(dateObj, 'MMM d, yyyy HH:mm', { locale: dateFnsLocale });
}

function getRelativeTimeText(key: string, locale: string, count?: number): string {
  // This is a simplified version - in a real app you'd use the translation system
  const translations: Record<string, Record<string, string>> = {
    en: {
      justNow: 'Just now',
      yesterday: 'Yesterday',
      minutesAgo: `${count}m ago`,
      hoursAgo: `${count}h ago`,
      daysAgo: `${count}d ago`,
    },
    es: {
      justNow: 'Ahora mismo',
      yesterday: 'Ayer',
      minutesAgo: `hace ${count}m`,
      hoursAgo: `hace ${count}h`,
      daysAgo: `hace ${count}d`,
    },
    fr: {
      justNow: 'À l\'instant',
      yesterday: 'Hier',
      minutesAgo: `il y a ${count}m`,
      hoursAgo: `il y a ${count}h`,
      daysAgo: `il y a ${count}j`,
    },
    de: {
      justNow: 'Gerade eben',
      yesterday: 'Gestern',
      minutesAgo: `vor ${count}m`,
      hoursAgo: `vor ${count}h`,
      daysAgo: `vor ${count}T`,
    },
    it: {
      justNow: 'Ora',
      yesterday: 'Ieri',
      minutesAgo: `${count}m fa`,
      hoursAgo: `${count}h fa`,
      daysAgo: `${count}g fa`,
    },
    pt: {
      justNow: 'Agora mesmo',
      yesterday: 'Ontem',
      minutesAgo: `${count}m atrás`,
      hoursAgo: `${count}h atrás`,
      daysAgo: `${count}d atrás`,
    },
    nl: {
      justNow: 'Zojuist',
      yesterday: 'Gisteren',
      minutesAgo: `${count}m geleden`,
      hoursAgo: `${count}u geleden`,
      daysAgo: `${count}d geleden`,
    },
    no: {
      justNow: 'Akkurat nå',
      yesterday: 'I går',
      minutesAgo: `${count}m siden`,
      hoursAgo: `${count}t siden`,
      daysAgo: `${count}d siden`,
    },
    sv: {
      justNow: 'Just nu',
      yesterday: 'Igår',
      minutesAgo: `${count}m sedan`,
      hoursAgo: `${count}t sedan`,
      daysAgo: `${count}d sedan`,
    },
    da: {
      justNow: 'Lige nu',
      yesterday: 'I går',
      minutesAgo: `${count}m siden`,
      hoursAgo: `${count}t siden`,
      daysAgo: `${count}d siden`,
    },
  };
  
  return translations[locale]?.[key] || translations.en[key];
}