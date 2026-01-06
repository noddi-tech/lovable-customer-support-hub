import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'react-router-dom';

import { Json } from '@/integrations/supabase/types';

interface QueuedEvent {
  user_id: string;
  email: string;
  organization_id: string | null;
  session_id: string | null;
  event_type: string;
  event_name: string;
  event_data: Json;
  page_path: string;
  created_at: string;
}

const FLUSH_INTERVAL = 30000; // 30 seconds
const MAX_BATCH_SIZE = 50;

export function useActivityTracking(sessionId?: string | null) {
  const { user, profile } = useAuth();
  const location = useLocation();
  const eventQueueRef = useRef<QueuedEvent[]>([]);
  const flushIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Flush events to database
  const flushEvents = useCallback(async () => {
    if (eventQueueRef.current.length === 0) return;

    const eventsToFlush = eventQueueRef.current.splice(0, MAX_BATCH_SIZE);

    try {
      const { error } = await supabase
        .from('user_activity_events')
        .insert(eventsToFlush);

      if (error) {
        console.error('Failed to flush activity events:', error);
        // Put events back in queue on failure
        eventQueueRef.current.unshift(...eventsToFlush);
      }
    } catch (err) {
      console.error('Activity flush error:', err);
      eventQueueRef.current.unshift(...eventsToFlush);
    }
  }, []);

  // Track a single event
  const trackEvent = useCallback(
    (eventType: string, eventName: string, eventData?: Record<string, Json>) => {
      if (!user?.id || !user?.email) return;

      const event: QueuedEvent = {
        user_id: user.id,
        email: user.email,
        organization_id: profile?.organization_id || null,
        session_id: sessionId || null,
        event_type: eventType,
        event_name: eventName,
        event_data: (eventData || {}) as Json,
        page_path: location.pathname,
        created_at: new Date().toISOString(),
      };

      eventQueueRef.current.push(event);

      // Flush immediately if we hit max batch size
      if (eventQueueRef.current.length >= MAX_BATCH_SIZE) {
        flushEvents();
      }
    },
    [user?.id, user?.email, profile?.organization_id, sessionId, location.pathname, flushEvents]
  );

  // Convenience methods for common event types
  const trackPageView = useCallback(
    (pageName: string, data?: Record<string, Json>) => {
      trackEvent('page_view', pageName, data);
    },
    [trackEvent]
  );

  const trackFeatureUse = useCallback(
    (featureName: string, data?: Record<string, Json>) => {
      trackEvent('feature_use', featureName, data);
    },
    [trackEvent]
  );

  const trackAction = useCallback(
    (actionName: string, data?: Record<string, Json>) => {
      trackEvent('action', actionName, data);
    },
    [trackEvent]
  );

  const trackSearch = useCallback(
    (searchTerm: string, resultCount?: number) => {
      trackEvent('search', 'search_performed', { term: searchTerm, resultCount: resultCount ?? null });
    },
    [trackEvent]
  );

  // Start flush interval
  useEffect(() => {
    flushIntervalRef.current = setInterval(flushEvents, FLUSH_INTERVAL);

    return () => {
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current);
      }
      // Final flush on unmount
      flushEvents();
    };
  }, [flushEvents]);

  // Flush before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (eventQueueRef.current.length > 0) {
        // Use sendBeacon for reliable delivery
        const events = eventQueueRef.current;
        navigator.sendBeacon(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_activity_events`,
          JSON.stringify(events)
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return {
    trackEvent,
    trackPageView,
    trackFeatureUse,
    trackAction,
    trackSearch,
    flushEvents,
  };
}
