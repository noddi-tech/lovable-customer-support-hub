import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';

const RELEVANT_AUDIT_EVENTS = new Set([
  'application_stage_changed',
  'applications_created',
  'applicants_created',
]);

/**
 * Subscribe to changes that affect Oversikt and invalidate the metrics query.
 * Throttled to ≤ 1 invalidation / 2s.
 */
export function useOversiktRealtime(): { connected: boolean } {
  const qc = useQueryClient();
  const { currentOrganizationId } = useOrganizationStore();
  const lastInvalidate = useRef<number>(0);
  const pendingTimer = useRef<number | null>(null);
  const connectedRef = useRef(false);

  useEffect(() => {
    if (!currentOrganizationId) return;

    const invalidate = () => {
      const now = Date.now();
      const since = now - lastInvalidate.current;
      if (since >= 2000) {
        lastInvalidate.current = now;
        qc.invalidateQueries({ queryKey: ['oversikt-metrics'] });
      } else if (pendingTimer.current === null) {
        pendingTimer.current = window.setTimeout(() => {
          pendingTimer.current = null;
          lastInvalidate.current = Date.now();
          qc.invalidateQueries({ queryKey: ['oversikt-metrics'] });
        }, 2000 - since);
      }
    };

    const orgFilter = `organization_id=eq.${currentOrganizationId}`;
    const channel = supabase
      .channel(`oversikt-realtime-${currentOrganizationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications', filter: orgFilter }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applicants', filter: orgFilter }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recruitment_followups', filter: orgFilter }, invalidate)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'recruitment_audit_events', filter: orgFilter },
        (payload: any) => {
          // High-volume table — filter in handler since postgres_changes only supports single eq filter.
          if (RELEVANT_AUDIT_EVENTS.has(payload?.new?.event_type)) invalidate();
        },
      )
      .subscribe((status) => {
        connectedRef.current = status === 'SUBSCRIBED';
      });

    return () => {
      if (pendingTimer.current) clearTimeout(pendingTimer.current);
      pendingTimer.current = null;
      supabase.removeChannel(channel);
    };
  }, [currentOrganizationId, qc]);

  return { connected: connectedRef.current };
}
