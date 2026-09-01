import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InboxSupportMetrics {
  days: number;
  generated_at: string;
  volume: { received: number; closed: number; per_day: number };
  first_response: {
    answered: number;
    awaiting: number;
    avg_minutes: number | null;
    median_minutes: number | null;
    p90_minutes: number | null;
    sla_target_minutes: number | null;
    sla_attainment_pct: number | null;
  };
  resolution: {
    avg_minutes: number | null;
    median_minutes: number | null;
    p90_minutes: number | null;
    sla_target_minutes: number | null;
    sla_attainment_pct: number | null;
    resolution_rate_pct: number | null;
  };
  efficiency: {
    one_touch_pct: number | null;
    avg_agent_replies: number | null;
    avg_customer_messages: number | null;
  };
  backlog: {
    open: number;
    unassigned: number;
    awaiting_customer_reply: number;
    awaiting_us: number;
    breaching_now: number;
    at_risk_2h: number;
    oldest_open_hours: number | null;
  };
}

/**
 * Support KPIs for one inbox (or every inbox when inboxId is null).
 * Computed server-side against conversations + messages.
 */
export function useInboxSupportMetrics(
  inboxId: string | null,
  days: number,
  enabled = true,
) {
  return useQuery({
    queryKey: ['inbox_support_metrics', inboxId, days],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<InboxSupportMetrics> => {
      const { data, error } = await supabase.rpc('get_inbox_support_metrics', {
        p_inbox_id: inboxId,
        p_days: days,
      } as never);
      if (error) throw error;
      return data as unknown as InboxSupportMetrics;
    },
  });
}

/** Human-friendly duration from a minute count. */
export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return '—';
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(hours < 10 ? 1 : 0)} h`;
  const days = hours / 24;
  return `${days.toFixed(days < 10 ? 1 : 0)} d`;
}

export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${value}%`;
}
