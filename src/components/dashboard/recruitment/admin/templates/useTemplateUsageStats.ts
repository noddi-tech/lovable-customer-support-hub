import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TemplateUsageStats {
  sentCount: number;
  openedCount: number;
  openRatePercent: number | null;
  lastUsedAt: string | null;
}

const isMissingRelation = (e: any): boolean =>
  e?.code === '42P01' || /does not exist/i.test(e?.message ?? '');

function computeFromEvents(rows: any[]): TemplateUsageStats {
  const sent = rows.filter((r) => r.event_type === 'sent' || r.event_type === 'delivered');
  const opened = rows.filter((r) => r.event_type === 'open' || r.event_type === 'opened');
  const sentCount = sent.length;
  const openedCount = opened.length;
  const lastUsedAt = sent.length
    ? sent.map((r) => r.created_at).sort().reverse()[0]
    : null;
  return {
    sentCount,
    openedCount,
    openRatePercent: sentCount > 0 ? Math.round((openedCount / sentCount) * 100) : null,
    lastUsedAt,
  };
}

function computeFromMessages(rows: any[]): TemplateUsageStats {
  const sentCount = rows.length;
  const lastUsedAt = rows.length
    ? rows.map((r) => r.created_at).sort().reverse()[0]
    : null;
  return {
    sentCount,
    openedCount: 0,
    openRatePercent: null,
    lastUsedAt,
  };
}

export function useTemplateUsageStats(templateId: string | null | undefined) {
  return useQuery({
    queryKey: ['recruitment-template-usage', templateId],
    queryFn: async (): Promise<TemplateUsageStats | null> => {
      if (!templateId) return null;

      // Try 1: email_events table
      try {
        const { data, error } = await (supabase as any)
          .from('email_events')
          .select('event_type, created_at')
          .eq('template_id', templateId);
        if (!error) return computeFromEvents(data ?? []);
        if (!isMissingRelation(error)) throw error;
      } catch (e) {
        if (!isMissingRelation(e)) throw e;
      }

      // Try 2: messages.metadata->>'template_id'
      try {
        const { data, error } = await (supabase as any)
          .from('messages')
          .select('created_at, metadata')
          .filter('metadata->>template_id', 'eq', templateId);
        if (!error) return computeFromMessages(data ?? []);
        if (!isMissingRelation(error)) throw error;
      } catch (e) {
        if (!isMissingRelation(e)) throw e;
      }

      return null; // signals "—" fallback
    },
    enabled: !!templateId,
  });
}
