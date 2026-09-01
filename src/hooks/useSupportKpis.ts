import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/* ------------------------------------------------------------------ */
/* Live chat KPIs (totals + per brand)                                  */
/* ------------------------------------------------------------------ */

export interface ChatKpiTotals {
  chats: number;
  resolved: number;
  open: number;
  unanswered: number;
  abandoned: number;
  per_day: number;
  avg_first_response_minutes: number | null;
  median_first_response_minutes: number | null;
  p90_first_response_minutes: number | null;
  avg_resolution_minutes: number | null;
  median_resolution_minutes: number | null;
  avg_agent_replies: number | null;
  avg_customer_messages: number | null;
  resolution_rate_pct: number | null;
}

export interface ChatKpiBrandRow {
  brand: string;
  chats: number;
  resolved: number;
  open: number;
  avg_first_response_minutes: number | null;
  median_first_response_minutes: number | null;
  avg_resolution_minutes: number | null;
  avg_agent_replies: number | null;
  resolution_rate_pct: number | null;
}

export interface ChatKpis {
  days: number;
  generated_at: string;
  totals: ChatKpiTotals;
  by_brand: ChatKpiBrandRow[];
}

export function useChatSupportMetrics(days: number, enabled = true) {
  return useQuery({
    queryKey: ['chat_support_metrics', days],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<ChatKpis> => {
      const { data, error } = await supabase.rpc('get_chat_support_metrics', { p_days: days } as never);
      if (error) throw error;
      return data as unknown as ChatKpis;
    },
  });
}

/* ------------------------------------------------------------------ */
/* Channel overview (email / text message / live chat)                  */
/* ------------------------------------------------------------------ */

export interface ChannelRow {
  channel: string;
  received: number;
  closed: number;
  open: number;
  awaiting_us: number;
  median_first_response_minutes: number | null;
  resolution_rate_pct: number | null;
}

export interface ChannelOverview {
  days: number;
  generated_at: string;
  channels: ChannelRow[];
  totals: { received: number; closed: number; open: number; awaiting_us: number };
}

export function useChannelOverview(days: number, enabled = true) {
  return useQuery({
    queryKey: ['channel_overview_metrics', days],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<ChannelOverview> => {
      const { data, error } = await supabase.rpc('get_channel_overview_metrics', { p_days: days } as never);
      if (error) throw error;
      return data as unknown as ChannelOverview;
    },
  });
}

/* ------------------------------------------------------------------ */
/* Agent leaderboard                                                    */
/* ------------------------------------------------------------------ */

export interface LeaderboardRow {
  profile_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  resolved: number;
  avg_resolve_minutes: number | null;
  median_resolve_minutes: number | null;
  replies_sent: number;
  first_replies: number;
  avg_first_response_minutes: number | null;
  median_first_response_minutes: number | null;
  score: number;
}

export interface Leaderboard {
  days: number;
  generated_at: string;
  leaders: LeaderboardRow[];
}

export function useAgentLeaderboard(days: number, limit = 10, enabled = true) {
  return useQuery({
    queryKey: ['agent_leaderboard', days, limit],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<Leaderboard> => {
      const { data, error } = await supabase.rpc('get_agent_leaderboard', {
        p_days: days,
        p_limit: limit,
      } as never);
      if (error) throw error;
      return data as unknown as Leaderboard;
    },
  });
}

export const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  sms: 'Text messages',
  widget: 'Live chat',
};
