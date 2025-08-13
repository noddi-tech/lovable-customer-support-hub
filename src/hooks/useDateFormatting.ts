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
  const { timezone, isLoading } = useUserTimezone();

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
    dateTime: (date: Date | string, includeTime: boolean = true) => 
      formatDateTime(date, i18n.language, timezone, includeTime),

    /**
     * Format time only in user's timezone
     * Example: "2:30 PM" or "14:30"
     */
    time: (date: Date | string, format24Hour: boolean = false) => 
      formatTime(date, i18n.language, timezone, format24Hour),

    /**
     * Format date optimized for conversation lists
     * Smart formatting: "2m ago" → "2:30 PM" → "Wed 2:30 PM" → "Jan 15"
     */
    conversation: (date: Date | string) => 
      formatConversationDate(date, i18n.language, timezone),

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
    isLoading,
    locale: i18n.language,
  };
}