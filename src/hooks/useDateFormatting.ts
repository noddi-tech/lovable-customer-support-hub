import { useTranslation } from 'react-i18next';
import { useUserTimezone } from './useUserTimezone';
import { 
  formatRelativeTime, 
  formatDateTime, 
  formatTime, 
  formatConversationDate 
} from '@/utils/dateFormatting';

/**
 * Hook that provides timezone-aware date formatting functions
 * Uses the user's selected timezone preference automatically
 */
export function useDateFormatting() {
  const { i18n } = useTranslation();
  const { timezone, timeFormat, isLoading } = useUserTimezone();

  const formatters = {
    /**
     * Format relative time in user's timezone
     * Examples: "2m ago", "Yesterday", "Jan 15, 2024"
     */
    relative: (date: Date | string) => 
      formatRelativeTime(date, i18n.language, timezone),

    /**
     * Format full date and time in user's timezone
     * Example: "Jan 15, 2024 14:30"
     */
    dateTime: (date: Date | string, includeTime: boolean = true) => {
      if (!date) return '';
      try {
        return formatDateTime(date, i18n.language, timezone, includeTime);
      } catch (error) {
        console.warn('Invalid date provided to dateTime formatter:', date, error);
        return 'Invalid date';
      }
    },

    /**
     * Format time only in user's timezone and preferred format
     * Example: "2:30 PM" or "14:30"
     */
    time: (date: Date | string) => 
      formatTime(date, i18n.language, timezone, timeFormat === '24h'),

    /**
     * Format date optimized for conversation lists
     * Smart formatting: "2m ago" → "2:30 PM"/"14:30" → "Wed 2:30 PM"/"Wed 14:30" → "Jan 15"
     */
    conversation: (date: Date | string) => 
      formatConversationDate(date, i18n.language, timezone, timeFormat === '24h'),

    /**
     * Format date only (no time) in user's timezone
     * Example: "Jan 15, 2024"
     */
    date: (date: Date | string) => 
      formatDateTime(date, i18n.language, timezone, false),
  };

  return {
    ...formatters,
    timezone,
    timeFormat,
    isLoading,
    locale: i18n.language,
  };
}