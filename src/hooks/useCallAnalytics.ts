import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

interface DateRange {
  from: Date;
  to: Date;
}

export const useCallAnalytics = (dateRange?: DateRange) => {
  const range = dateRange || {
    from: subDays(new Date(), 30),
    to: new Date(),
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['call-analytics', range.from, range.to],
    queryFn: async () => {
      console.log('[useCallAnalytics] 🔍 Query started', {
        from: range.from,
        to: range.to,
        fromISO: startOfDay(range.from).toISOString(),
        toISO: endOfDay(range.to).toISOString()
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      console.log('[useCallAnalytics] 👤 Profile found', { 
        organization_id: profile.organization_id 
      });

      // Fetch calls within date range
      const { data: calls, error } = await supabase
        .from('calls')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .gte('created_at', startOfDay(range.from).toISOString())
        .lte('created_at', endOfDay(range.to).toISOString());

      console.log('[useCallAnalytics] 📞 Calls fetched', { 
        count: calls?.length || 0,
        error: error?.message,
        sampleCall: calls?.[0]
      });

      if (!calls) return null;

      // Calculate metrics
      const totalCalls = calls.length;
      const answeredCalls = calls.filter(c => c.status === 'completed').length;
      const missedCalls = calls.filter(c => c.status === 'missed').length;
      const avgDuration = calls.reduce((acc, c) => acc + (c.duration_seconds || 0), 0) / totalCalls || 0;
      const answerRate = totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0;

      // Group by date for volume chart
      const volumeByDate = calls.reduce((acc, call) => {
        const date = format(new Date(call.created_at), 'MMM dd');
        if (!acc[date]) {
          acc[date] = { date, inbound: 0, outbound: 0, missed: 0 };
        }
        if (call.direction === 'inbound') acc[date].inbound++;
        if (call.direction === 'outbound') acc[date].outbound++;
        if (call.status === 'missed') acc[date].missed++;
        return acc;
      }, {} as Record<string, any>);

      // Agent stats - Extract from call metadata (Aircall agents)
      const agentEmailMap: Record<string, {
        email: string;
        name: string;
        calls: any[];
        answered: any[];
        missed: any[];
      }> = {};

      // Build agent map from calls
      calls.forEach(call => {
        const metadata = call.metadata as any;
        const enrichedDetails = call.enriched_details as any;
        const agentEmail = metadata?.user?.email || enrichedDetails?.user_email;
        const agentName = metadata?.user?.name || enrichedDetails?.user_name;

        // Skip calls without agent data (missed calls with no agent assigned)
        if (!agentEmail) return;

        if (!agentEmailMap[agentEmail]) {
          agentEmailMap[agentEmail] = {
            email: agentEmail,
            name: agentName || agentEmail.split('@')[0],
            calls: [],
            answered: [],
            missed: [],
          };
        }

        agentEmailMap[agentEmail].calls.push(call);
        if (call.status === 'completed') agentEmailMap[agentEmail].answered.push(call);
        if (call.status === 'missed') agentEmailMap[agentEmail].missed.push(call);
      });

      // Convert to agent stats array
      const agentStats = Object.values(agentEmailMap).map(agent => {
        return {
          id: agent.email, // Use email as ID since they're not platform users
          name: agent.name,
          avatar: null, // Aircall agents don't have avatars in platform
          totalCalls: agent.calls.length,
          answeredCalls: agent.answered.length,
          missedCalls: agent.missed.length,
          avgDuration: Math.round(
            agent.calls.reduce((acc, c) => acc + (c.duration_seconds || 0), 0) / 
            (agent.answered.length || 1)
          ),
          answerRate: agent.calls.length > 0 ? Math.round((agent.answered.length / agent.calls.length) * 100) : 0,
        };
      }).sort((a, b) => b.totalCalls - a.totalCalls);

      return {
        metrics: {
          totalCalls,
          avgDuration: Math.round(avgDuration),
          answerRate: Math.round(answerRate),
          missedCalls,
          callsTrend: 12,
          durationTrend: -5,
          answerRateTrend: 8,
          missedTrend: -15,
        },
        volumeData: Object.values(volumeByDate),
        agentStats,
      };
    },
  });

  return {
    metrics: data?.metrics || {
      totalCalls: 0,
      avgDuration: 0,
      answerRate: 0,
      missedCalls: 0,
      callsTrend: 0,
      durationTrend: 0,
      answerRateTrend: 0,
      missedTrend: 0,
    },
    volumeData: data?.volumeData || [],
    agentStats: data?.agentStats || [],
    isLoading,
    refetch,
  };
};
