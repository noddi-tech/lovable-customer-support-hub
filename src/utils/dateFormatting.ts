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

/**
 * Format relative time with optional timezone support
 * @param date - The date to format
 * @param locale - The locale to use (default: 'en')
 * @param timeZone - Optional timezone (if not provided, uses browser timezone)
 * @returns Formatted relative time string
 */
export function formatRelativeTime(
  date: Date | string, 
  locale: string = 'en',
  timeZone?: string
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Use timezone-aware current time if timezone is provided
  const now = timeZone ? new Date() : new Date();
  const timezoneDate = timeZone ? 
    new Date(formatInTimeZone(dateObj, timeZone, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")) : 
    dateObj;
  const timezoneNow = timeZone ? 
    new Date(formatInTimeZone(now, timeZone, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")) : 
    now;
    
  const diffInMinutes = Math.floor((timezoneNow.getTime() - timezoneDate.getTime()) / (1000 * 60));
  
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
      // For older dates, show the actual date in the specified timezone
      const dateFnsLocale = locales[locale as keyof typeof locales] || enUS;
      if (timeZone) {
        return formatInTimeZone(dateObj, timeZone, 'MMM d, yyyy', { locale: dateFnsLocale });
      } else {
        return format(dateObj, 'MMM d, yyyy', { locale: dateFnsLocale });
      }
    }
  }
}

/**
 * Format date and time with optional timezone support
 * @param date - The date to format
 * @param locale - The locale to use (default: 'en')
 * @param timeZone - Optional timezone (if not provided, uses browser timezone)
 * @param includeTime - Whether to include time (default: true)
 * @returns Formatted date/time string
 */
export function formatDateTime(
  date: Date | string, 
  locale: string = 'en', 
  timeZone?: string,
  includeTime: boolean = true
): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date provided to formatDateTime:', date);
      return 'Invalid date';
    }
    
    const dateFnsLocale = locales[locale as keyof typeof locales] || enUS;
    const formatString = includeTime ? 'MMM d, yyyy HH:mm' : 'MMM d, yyyy';
    
    if (timeZone) {
      return formatInTimeZone(dateObj, timeZone, formatString, { locale: dateFnsLocale });
    }
    
    return format(dateObj, formatString, { locale: dateFnsLocale });
  } catch (error) {
    console.warn('Error formatting date:', date, error);
    return 'Invalid date';
  }
}

/**
 * Format time only with timezone support
 * @param date - The date to format
 * @param locale - The locale to use (default: 'en')
 * @param timeZone - Optional timezone (if not provided, uses browser timezone)
 * @param format24Hour - Whether to use 24-hour format (default: false)
 * @returns Formatted time string
 */
export function formatTime(
  date: Date | string,
  locale: string = 'en',
  timeZone?: string,
  format24Hour: boolean = false
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const dateFnsLocale = locales[locale as keyof typeof locales] || enUS;
  
  const formatString = format24Hour ? 'HH:mm' : 'h:mm a';
  
  if (timeZone) {
    return formatInTimeZone(dateObj, timeZone, formatString, { locale: dateFnsLocale });
  }
  
  return format(dateObj, formatString, { locale: dateFnsLocale });
}

/**
 * Format date for display in conversation lists with timezone support
 * @param date - The date to format
 * @param locale - The locale to use (default: 'en')
 * @param timeZone - Optional timezone (if not provided, uses browser timezone)
 * @returns Formatted date string optimized for conversation lists
 */
export function formatConversationDate(
  date: Date | string,
  locale: string = 'en',
  timeZone?: string,
  format24Hour: boolean = false
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  // Get timezone-aware dates for comparison
  const targetDate = timeZone ? 
    new Date(formatInTimeZone(dateObj, timeZone, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")) : 
    dateObj;
  const currentDate = timeZone ? 
    new Date(formatInTimeZone(now, timeZone, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")) : 
    now;
    
  const diffInMinutes = Math.floor((currentDate.getTime() - targetDate.getTime()) / (1000 * 60));
  
  // If less than an hour ago, show relative time
  if (diffInMinutes < 60) {
    return formatRelativeTime(date, locale, timeZone);
  }
  
  // If today, show time only  
  const isToday = targetDate.toDateString() === currentDate.toDateString();
  if (isToday) {
    return formatTime(date, locale, timeZone, format24Hour);
  }
  
  // If this week, show day and time
  const diffInDays = Math.floor(diffInMinutes / (24 * 60));
  if (diffInDays < 7) {
    const dateFnsLocale = locales[locale as keyof typeof locales] || enUS;
    // Use the correct format pattern based on 24-hour preference
    const dayTimePattern = format24Hour ? 'EEE HH:mm' : 'EEE h:mm a';
    
    if (timeZone) {
      return formatInTimeZone(dateObj, timeZone, dayTimePattern, { locale: dateFnsLocale });
    } else {
      return format(dateObj, dayTimePattern, { locale: dateFnsLocale });
    }
  }
  
  // Otherwise show date
  return formatDateTime(date, locale, timeZone, false);
}

// Legacy function for backward compatibility (keeping exact same signature)
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