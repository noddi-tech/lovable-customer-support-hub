import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format, startOfDay, endOfDay } from 'date-fns';

export interface AiAnalytics {
  totalConversations: number;
  totalMessages: number;
  resolvedByAi: number;
  escalatedToHuman: number;
  resolutionRate: number;
  avgMessagesPerConversation: number;
  positiveRatings: number;
  negativeRatings: number;
  satisfactionRate: number;
  topIntents: { intent: string; count: number }[];
  toolUsage: { tool: string; count: number }[];
  volumeByDate: { date: string; conversations: number; messages: number }[];
  feedbackByDate: { date: string; positive: number; negative: number }[];
  conversationTrend: number;
  pendingKnowledgeEntries: number;
}

interface UseAiAnalyticsProps {
  organizationId: string | null;
  days?: number;
}

export function useAiAnalytics({ organizationId, days = 30 }: UseAiAnalyticsProps) {
  return useQuery({
    queryKey: ['ai-analytics', organizationId, days],
    queryFn: async (): Promise<AiAnalytics> => {
      if (!organizationId) return getEmptyAnalytics();

      const now = new Date();
      const startDate = startOfDay(subDays(now, days));
      const endDate = endOfDay(now);
      const prevStartDate = startOfDay(subDays(startDate, days));

      // Fetch conversations
      const { data: conversations } = await supabase
        .from('widget_ai_conversations')
        .select('id, status, resolved_by_ai, message_count, tools_used, primary_intent, created_at, escalated_at')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Previous period for trend
      const { count: prevCount } = await supabase
        .from('widget_ai_conversations')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('created_at', prevStartDate.toISOString())
        .lt('created_at', startDate.toISOString());

      // Feedback
      const { data: feedback } = await supabase
        .from('widget_ai_feedback')
        .select('rating, created_at')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Pending knowledge entries
      const { count: pendingCount } = await supabase
        .from('knowledge_pending_entries')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('review_status', 'pending');

      const convos = conversations || [];
      const fb = feedback || [];

      const totalConversations = convos.length;
      const totalMessages = convos.reduce((sum, c) => sum + (c.message_count || 0), 0);
      const resolvedByAi = convos.filter(c => c.resolved_by_ai).length;
      const escalatedToHuman = convos.filter(c => c.escalated_at).length;
      const resolutionRate = totalConversations > 0 ? Math.round((resolvedByAi / totalConversations) * 100) : 0;
      const avgMessagesPerConversation = totalConversations > 0 ? Math.round((totalMessages / totalConversations) * 10) / 10 : 0;

      const positiveRatings = fb.filter(f => f.rating === 'positive').length;
      const negativeRatings = fb.filter(f => f.rating === 'negative').length;
      const totalRatings = positiveRatings + negativeRatings;
      const satisfactionRate = totalRatings > 0 ? Math.round((positiveRatings / totalRatings) * 100) : 0;

      // Top intents
      const intentCounts: Record<string, number> = {};
      convos.forEach(c => {
        const intent = c.primary_intent || 'unknown';
        intentCounts[intent] = (intentCounts[intent] || 0) + 1;
      });
      const topIntents = Object.entries(intentCounts)
        .map(([intent, count]) => ({ intent, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Tool usage
      const toolCounts: Record<string, number> = {};
      convos.forEach(c => {
        const tools = c.tools_used as string[] | null;
        tools?.forEach(t => {
          toolCounts[t] = (toolCounts[t] || 0) + 1;
        });
      });
      const toolUsage = Object.entries(toolCounts)
        .map(([tool, count]) => ({ tool, count }))
        .sort((a, b) => b.count - a.count);

      // Volume by date
      const volumeByDate: { date: string; conversations: number; messages: number }[] = [];
      for (let i = 0; i < days; i++) {
        const date = subDays(new Date(), days - 1 - i);
        const dateStr = format(date, 'MMM d');
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);
        const dayConvos = convos.filter(c => {
          const d = new Date(c.created_at);
          return d >= dayStart && d <= dayEnd;
        });
        volumeByDate.push({
          date: dateStr,
          conversations: dayConvos.length,
          messages: dayConvos.reduce((s, c) => s + (c.message_count || 0), 0),
        });
      }

      // Feedback by date
      const feedbackByDate: { date: string; positive: number; negative: number }[] = [];
      for (let i = 0; i < days; i++) {
        const date = subDays(new Date(), days - 1 - i);
        const dateStr = format(date, 'MMM d');
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);
        const dayFb = fb.filter(f => {
          const d = new Date(f.created_at);
          return d >= dayStart && d <= dayEnd;
        });
        feedbackByDate.push({
          date: dateStr,
          positive: dayFb.filter(f => f.rating === 'positive').length,
          negative: dayFb.filter(f => f.rating === 'negative').length,
        });
      }

      const conversationTrend = (prevCount || 0) > 0
        ? Math.round(((totalConversations - (prevCount || 0)) / (prevCount || 1)) * 100)
        : totalConversations > 0 ? 100 : 0;

      return {
        totalConversations,
        totalMessages,
        resolvedByAi,
        escalatedToHuman,
        resolutionRate,
        avgMessagesPerConversation,
        positiveRatings,
        negativeRatings,
        satisfactionRate,
        topIntents,
        toolUsage,
        volumeByDate,
        feedbackByDate,
        conversationTrend,
        pendingKnowledgeEntries: pendingCount || 0,
      };
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

function getEmptyAnalytics(): AiAnalytics {
  return {
    totalConversations: 0,
    totalMessages: 0,
    resolvedByAi: 0,
    escalatedToHuman: 0,
    resolutionRate: 0,
    avgMessagesPerConversation: 0,
    positiveRatings: 0,
    negativeRatings: 0,
    satisfactionRate: 0,
    topIntents: [],
    toolUsage: [],
    volumeByDate: [],
    feedbackByDate: [],
    conversationTrend: 0,
    pendingKnowledgeEntries: 0,
  };
}
