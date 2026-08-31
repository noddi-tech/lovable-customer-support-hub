import { useCallback, useEffect, useRef, useState } from 'react';
import { getChatSession, markChatSessionSeen, readStoredChatSession } from '../api';

/**
 * Watches a stored (still open) chat session while the panel is closed and
 * reports how many agent messages arrived since the visitor last looked.
 * Poll is slow on purpose — this runs on every page of the host site.
 */
export function useUnreadWatcher(enabled: boolean) {
  const [unreadCount, setUnreadCount] = useState(0);
  const timerRef = useRef<number | null>(null);

  const clearUnread = useCallback(() => {
    setUnreadCount(0);
    markChatSessionSeen(new Date().toISOString());
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const check = async () => {
      if (document.hidden) return;
      const stored = readStoredChatSession();
      if (!stored) {
        if (!cancelled) setUnreadCount(0);
        return;
      }
      const session = await getChatSession(stored.sessionId);
      if (cancelled || !session) return;
      if (session.status === 'ended' || session.status === 'abandoned') {
        setUnreadCount(0);
        return;
      }
      const seenAt = stored.lastSeenAt ? new Date(stored.lastSeenAt).getTime() : 0;
      const unread = session.messages.filter(
        (m) => m.senderType === 'agent' && new Date(m.createdAt).getTime() > seenAt,
      ).length;
      setUnreadCount(unread);
    };

    check();
    timerRef.current = window.setInterval(check, 15000);

    return () => {
      cancelled = true;
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [enabled]);

  return { unreadCount, clearUnread };
}
