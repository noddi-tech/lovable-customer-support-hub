import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

interface DailyMessageVolume {
  date: string;
  received: number;
  sent: number;
}

interface ChannelDistribution {
  channel: string;
  count: number;
}

interface StatusDistribution {
  status: string;
  count: number;
}

export interface OperationsAnalyticsData {
  messagesReceived: number;
  messagesSent: number;
  totalConversations: number;
  totalCalls: number;
  avgResponseTimeMinutes: number;
  dailyVolume: DailyMessageVolume[];
  channelDistribution: ChannelDistribution[];
  statusDistribution: StatusDistribution[];
  aiInsights: {
    themes: { topic: string; count: number; sentiment: string }[];
    commonQuestions: string[];
    sentimentBreakdown: { positive: number; neutral: number; negative: number };
    summary: string;
  } | null;
}

export function useOperationsAnalytics(periodDays: number = 30) {
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  // Get org ID
  useEffect(() => {
    const fetchOrgId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();
      if (profile?.organization_id) {
        setOrganizationId(profile.organization_id);
      }
    };
    fetchOrgId();
  }, []);

  // Fetch core metrics from DB directly
  const coreMetrics = useQuery({
    queryKey: ['operations-analytics-core', organizationId, periodDays],
    queryFn: async () => {
      if (!organizationId) throw new Error('No org');
      const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

      // Fetch conversations
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, channel, status, created_at')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate)
        .is('deleted_at', null)
        .limit(1000);

      const convIds = (conversations || []).map(c => c.id);

      // Fetch messages
      let messagesReceived = 0;
      let messagesSent = 0;
      const dailyMap: Record<string, { received: number; sent: number }> = {};

      if (convIds.length > 0) {
        // Process in batches to avoid query size limits
        const batchSize = 50;
        for (let i = 0; i < Math.min(convIds.length, 200); i += batchSize) {
          const batch = convIds.slice(i, i + batchSize);
          const { data: messages } = await supabase
            .from('messages')
            .select('sender_type, created_at')
            .in('conversation_id', batch)
            .gte('created_at', startDate);

          for (const m of messages || []) {
            const day = m.created_at.substring(0, 10);
            if (!dailyMap[day]) dailyMap[day] = { received: 0, sent: 0 };
            if (m.sender_type === 'customer') {
              messagesReceived++;
              dailyMap[day].received++;
            } else if (m.sender_type === 'agent') {
              messagesSent++;
              dailyMap[day].sent++;
            }
          }
        }
      }

      // Fetch calls
      const { data: calls } = await supabase
        .from('calls')
        .select('id')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate)
        .limit(1000);

      // Channel distribution
      const channelMap: Record<string, number> = {};
      for (const c of conversations || []) {
        channelMap[c.channel] = (channelMap[c.channel] || 0) + 1;
      }

      // Status distribution
      const statusMap: Record<string, number> = {};
      for (const c of conversations || []) {
        statusMap[c.status] = (statusMap[c.status] || 0) + 1;
      }

      // Sort daily volume by date
      const dailyVolume = Object.entries(dailyMap)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        messagesReceived,
        messagesSent,
        totalConversations: conversations?.length || 0,
        totalCalls: calls?.length || 0,
        avgResponseTimeMinutes: 0, // Would need first_response_at calculation
        dailyVolume,
        channelDistribution: Object.entries(channelMap).map(([channel, count]) => ({ channel, count })),
        statusDistribution: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
      };
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch AI insights from edge function
  const aiInsights = useQuery({
    queryKey: ['operations-analytics-ai', organizationId, periodDays],
    queryFn: async () => {
      if (!organizationId) throw new Error('No org');
      const { data, error } = await supabase.functions.invoke('generate-analytics-report', {
        body: { organizationId, periodDays },
      });
      if (error) throw error;
      return data?.ai_insights || null;
    },
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000,
  });

  return {
    data: coreMetrics.data ? {
      ...coreMetrics.data,
      aiInsights: aiInsights.data || null,
    } as OperationsAnalyticsData : null,
    isLoading: coreMetrics.isLoading,
    isLoadingAI: aiInsights.isLoading,
    error: coreMetrics.error,
    refetch: () => {
      coreMetrics.refetch();
      aiInsights.refetch();
    },
  };
}
