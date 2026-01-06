import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserSessionSummary {
  userId: string;
  totalSessions: number;
  lastLoginAt: string | null;
  totalActiveTime: number; // in minutes
  averageSessionDuration: number; // in minutes
  mostUsedDevice: string;
  mostUsedBrowser: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  email: string;
  organization_id: string | null;
  started_at: string;
  last_active_at: string;
  ended_at: string | null;
  session_type: string;
  user_agent: string | null;
  device_type: string | null;
  browser: string | null;
  is_active: boolean;
  end_reason: string | null;
}

export function useUserSessions(userId: string, limit: number = 20) {
  return useQuery({
    queryKey: ['user-sessions', userId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as UserSession[];
    },
    enabled: !!userId,
  });
}

export function useUserSessionSummary(userId: string) {
  return useQuery({
    queryKey: ['user-session-summary', userId],
    queryFn: async () => {
      const { data: sessions, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });

      if (error) throw error;

      if (!sessions || sessions.length === 0) {
        return {
          userId,
          totalSessions: 0,
          lastLoginAt: null,
          totalActiveTime: 0,
          averageSessionDuration: 0,
          mostUsedDevice: 'N/A',
          mostUsedBrowser: 'N/A',
        } as UserSessionSummary;
      }

      // Calculate total active time
      let totalMinutes = 0;
      const deviceCounts: Record<string, number> = {};
      const browserCounts: Record<string, number> = {};

      sessions.forEach((session) => {
        const start = new Date(session.started_at).getTime();
        const end = session.ended_at
          ? new Date(session.ended_at).getTime()
          : new Date(session.last_active_at).getTime();
        totalMinutes += (end - start) / (1000 * 60);

        // Count devices and browsers
        const device = session.device_type || 'desktop';
        const browser = session.browser || 'unknown';
        deviceCounts[device] = (deviceCounts[device] || 0) + 1;
        browserCounts[browser] = (browserCounts[browser] || 0) + 1;
      });

      // Find most used device and browser
      const mostUsedDevice = Object.entries(deviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
      const mostUsedBrowser = Object.entries(browserCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

      return {
        userId,
        totalSessions: sessions.length,
        lastLoginAt: sessions[0]?.started_at || null,
        totalActiveTime: Math.round(totalMinutes),
        averageSessionDuration: Math.round(totalMinutes / sessions.length),
        mostUsedDevice,
        mostUsedBrowser,
      } as UserSessionSummary;
    },
    enabled: !!userId,
  });
}

export function useOrganizationSessions(organizationId: string, limit: number = 50) {
  return useQuery({
    queryKey: ['org-sessions', organizationId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as UserSession[];
    },
    enabled: !!organizationId,
  });
}
