import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format, startOfDay, endOfDay } from 'date-fns';

export interface WidgetAnalytics {
  totalSessions: number;
  chatSessions: number;
  contactFormSubmissions: number;
  avgResponseTimeMinutes: number | null;
  avgChatDurationMinutes: number | null;
  chatCompletionRate: number;
  sessionsTrend: number;
  chatsTrend: number;
  volumeByDate: { date: string; sessions: number; chats: number }[];
  chatsByStatus: { status: string; count: number }[];
  topPageUrls: { url: string; count: number }[];
}

interface UseWidgetAnalyticsProps {
  widgetId: string | null;
  days?: number;
}

export function useWidgetAnalytics({ widgetId, days = 30 }: UseWidgetAnalyticsProps) {
  return useQuery({
    queryKey: ['widget-analytics', widgetId, days],
    queryFn: async (): Promise<WidgetAnalytics> => {
      if (!widgetId) {
        return getEmptyAnalytics();
      }

      const now = new Date();
      const startDate = startOfDay(subDays(now, days));
      const endDate = endOfDay(now);
      const previousStartDate = startOfDay(subDays(startDate, days));

      // Fetch all widget sessions (widget opens)
      const { data: widgetSessions, error: sessionsError } = await supabase
        .from('widget_sessions')
        .select('id, visitor_id, created_at, metadata')
        .eq('widget_config_id', widgetId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (sessionsError) throw sessionsError;

      // Fetch chat sessions for current period
      const { data: chatSessions, error: chatError } = await supabase
        .from('widget_chat_sessions')
        .select('id, widget_config_id, visitor_id, status, started_at, ended_at, metadata')
        .eq('widget_config_id', widgetId)
        .gte('started_at', startDate.toISOString())
        .lte('started_at', endDate.toISOString());

      if (chatError) throw chatError;

      // Fetch chat sessions for previous period (for trend calculation)
      const { data: previousChatSessions } = await supabase
        .from('widget_chat_sessions')
        .select('id')
        .eq('widget_config_id', widgetId)
        .gte('started_at', previousStartDate.toISOString())
        .lt('started_at', startDate.toISOString());

      // Fetch contact form submissions (conversations via widget)
      const { data: widgetConfig } = await supabase
        .from('widget_configs')
        .select('inbox_id')
        .eq('id', widgetId)
        .single();

      let contactFormCount = 0;
      if (widgetConfig?.inbox_id) {
        const { count } = await supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .eq('inbox_id', widgetConfig.inbox_id)
          .eq('channel', 'widget')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());
        contactFormCount = count || 0;
      }

      // Calculate metrics
      const currentChatCount = chatSessions?.length || 0;
      const previousChatCount = previousChatSessions?.length || 0;
      const widgetOpensCount = widgetSessions?.length || 0;
      
      // Total sessions = widget opens (all interactions with the widget)
      const totalSessions = widgetOpensCount > 0 ? widgetOpensCount : (currentChatCount + contactFormCount);

      // Chat completion rate
      const completedChats = chatSessions?.filter(s => s.status === 'ended').length || 0;
      const chatCompletionRate = currentChatCount > 0 
        ? Math.round((completedChats / currentChatCount) * 100) 
        : 0;

      // Calculate trends
      const chatsTrend = previousChatCount > 0 
        ? Math.round(((currentChatCount - previousChatCount) / previousChatCount) * 100)
        : currentChatCount > 0 ? 100 : 0;

      // Volume by date
      const volumeByDate = calculateVolumeByDate(chatSessions || [], startDate, days);

      // Chats by status
      const chatsByStatus = calculateChatsByStatus(chatSessions || []);

      // Average response time and chat duration
      const { avgResponseTimeMinutes, avgChatDurationMinutes } = calculateTimeMetrics(chatSessions || []);

      // Top page URLs
      const topPageUrls = calculateTopPageUrls(chatSessions || []);

      return {
        totalSessions,
        chatSessions: currentChatCount,
        contactFormSubmissions: contactFormCount,
        avgResponseTimeMinutes,
        avgChatDurationMinutes,
        chatCompletionRate,
        sessionsTrend: chatsTrend, // Using chats trend for now
        chatsTrend,
        volumeByDate,
        chatsByStatus,
        topPageUrls,
      };
    },
    enabled: !!widgetId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

function getEmptyAnalytics(): WidgetAnalytics {
  return {
    totalSessions: 0,
    chatSessions: 0,
    contactFormSubmissions: 0,
    avgResponseTimeMinutes: null,
    avgChatDurationMinutes: null,
    chatCompletionRate: 0,
    sessionsTrend: 0,
    chatsTrend: 0,
    volumeByDate: [],
    chatsByStatus: [],
    topPageUrls: [],
  };
}

function calculateVolumeByDate(
  sessions: any[], 
  startDate: Date, 
  days: number
): { date: string; sessions: number; chats: number }[] {
  const result: { date: string; sessions: number; chats: number }[] = [];
  
  for (let i = 0; i < days; i++) {
    const date = subDays(new Date(), days - 1 - i);
    const dateStr = format(date, 'MMM d');
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    const dayChats = sessions.filter(s => {
      const sessionDate = new Date(s.started_at);
      return sessionDate >= dayStart && sessionDate <= dayEnd;
    }).length;
    
    result.push({
      date: dateStr,
      sessions: dayChats, // Using chat sessions as proxy
      chats: dayChats,
    });
  }
  
  return result;
}

function calculateChatsByStatus(sessions: any[]): { status: string; count: number }[] {
  const statusCounts: Record<string, number> = {};
  
  sessions.forEach(session => {
    const status = session.status || 'unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  
  return Object.entries(statusCounts).map(([status, count]) => ({
    status: status.charAt(0).toUpperCase() + status.slice(1),
    count,
  }));
}

function calculateTimeMetrics(sessions: any[]): {
  avgResponseTimeMinutes: number | null;
  avgChatDurationMinutes: number | null;
} {
  const completedSessions = sessions.filter(s => s.ended_at && s.started_at);
  
  if (completedSessions.length === 0) {
    return { avgResponseTimeMinutes: null, avgChatDurationMinutes: null };
  }
  
  let totalDuration = 0;
  completedSessions.forEach(session => {
    const start = new Date(session.started_at).getTime();
    const end = new Date(session.ended_at).getTime();
    totalDuration += (end - start) / 1000 / 60; // Convert to minutes
  });
  
  const avgChatDurationMinutes = Math.round(totalDuration / completedSessions.length);
  
  // Response time would need first agent message timestamp - using placeholder
  return {
    avgResponseTimeMinutes: null, // Would need message data
    avgChatDurationMinutes,
  };
}

function calculateTopPageUrls(sessions: any[]): { url: string; count: number }[] {
  const urlCounts: Record<string, number> = {};
  
  sessions.forEach(session => {
    // Page URL may be stored in metadata
    const metadata = session.metadata as Record<string, any> | null;
    const url = metadata?.page_url || 'Unknown';
    // Simplify URL for display
    const simplifiedUrl = url === 'Unknown' ? url : (url.replace(/^https?:\/\/[^/]+/, '').split('?')[0] || '/');
    urlCounts[simplifiedUrl] = (urlCounts[simplifiedUrl] || 0) + 1;
  });
  
  return Object.entries(urlCounts)
    .map(([url, count]) => ({ url, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}
