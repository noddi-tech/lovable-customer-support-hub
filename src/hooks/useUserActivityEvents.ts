import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserActivityEvent {
  id: string;
  user_id: string;
  session_id: string | null;
  email: string;
  organization_id: string | null;
  event_type: string;
  event_name: string;
  event_data: Record<string, unknown>;
  page_path: string | null;
  created_at: string;
}

export interface ActivitySummary {
  userId: string;
  totalEvents: number;
  eventsByType: Record<string, number>;
  mostVisitedPages: { path: string; count: number }[];
  mostUsedFeatures: { name: string; count: number }[];
  recentActivity: UserActivityEvent[];
}

export function useUserActivityEvents(userId: string, limit: number = 50) {
  return useQuery({
    queryKey: ['user-activity-events', userId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_activity_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as UserActivityEvent[];
    },
    enabled: !!userId,
  });
}

export function useUserActivitySummary(userId: string) {
  return useQuery({
    queryKey: ['user-activity-summary', userId],
    queryFn: async () => {
      const { data: events, error } = await supabase
        .from('user_activity_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      if (!events || events.length === 0) {
        return {
          userId,
          totalEvents: 0,
          eventsByType: {},
          mostVisitedPages: [],
          mostUsedFeatures: [],
          recentActivity: [],
        } as ActivitySummary;
      }

      // Calculate events by type
      const eventsByType: Record<string, number> = {};
      const pageCounts: Record<string, number> = {};
      const featureCounts: Record<string, number> = {};

      events.forEach((event) => {
        // Count by type
        eventsByType[event.event_type] = (eventsByType[event.event_type] || 0) + 1;

        // Count page views
        if (event.event_type === 'page_view' && event.page_path) {
          pageCounts[event.page_path] = (pageCounts[event.page_path] || 0) + 1;
        }

        // Count feature usage
        if (event.event_type === 'feature_use') {
          featureCounts[event.event_name] = (featureCounts[event.event_name] || 0) + 1;
        }
      });

      // Sort and limit top items
      const mostVisitedPages = Object.entries(pageCounts)
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const mostUsedFeatures = Object.entries(featureCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        userId,
        totalEvents: events.length,
        eventsByType,
        mostVisitedPages,
        mostUsedFeatures,
        recentActivity: events.slice(0, 20),
      } as ActivitySummary;
    },
    enabled: !!userId,
  });
}

export function useOrganizationActivityEvents(organizationId: string, limit: number = 100) {
  return useQuery({
    queryKey: ['org-activity-events', organizationId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_activity_events')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as UserActivityEvent[];
    },
    enabled: !!organizationId,
  });
}
