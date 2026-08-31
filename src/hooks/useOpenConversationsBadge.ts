import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useInboxOutstandingCounts } from './useInboxOutstandingCounts';
import { useFaviconBadge } from './useFaviconBadge';

/**
 * Shows the number of open conversations in the currently selected (default)
 * inbox on the favicon / app badge. Falls back to all inboxes combined.
 */
export function useOpenConversationsBadge() {
  const location = useLocation();
  const { data } = useInboxOutstandingCounts();

  const inboxId = useMemo(
    () => new URLSearchParams(location.search).get('inbox'),
    [location.search]
  );

  const count = useMemo(() => {
    if (!data) return 0;
    if (inboxId && data[inboxId]) return data[inboxId].open;
    if (inboxId) return 0;
    return Object.values(data).reduce((sum, c) => sum + c.open, 0);
  }, [data, inboxId]);

  useFaviconBadge(count);

  return count;
}
