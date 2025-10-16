import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

interface DateRange {
  from: Date;
  to: Date;
}

// Helper to calculate percentage change
const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

// Helper to calculate metrics for a period
const calculatePeriodMetrics = (calls: any[]) => {
  const totalCalls = calls.length;
  const answeredCalls = calls.filter(c => c.status === 'completed').length;
  const missedCalls = calls.filter(c => c.status === 'missed').length;
  const avgDuration = calls.reduce((acc, c) => acc + (c.duration_seconds || 0), 0) / totalCalls || 0;
  const answerRate = totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0;

  return {
    totalCalls,
    avgDuration: Math.round(avgDuration / 60), // Convert to minutes
    answerRate: Math.round(answerRate),
    missedCalls,
  };
};

export const useCallAnalytics = (dateRange?: DateRange) => {
  const range = dateRange || {
    from: subDays(new Date(), 30),
    to: new Date(),
  };

  // Calculate period length and previous period dates
  const periodLengthDays = Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const previousFrom = new Date(range.from);
  previousFrom.setDate(previousFrom.getDate() - periodLengthDays);
  const previousTo = new Date(range.from);
  previousTo.setDate(previousTo.getDate() - 1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['call-analytics', range.from, range.to],
    queryFn: async () => {
      console.log('[useCallAnalytics] 🔍 Query started', {
        from: range.from,
        to: range.to,
        periodLengthDays,
        previousFrom,
        previousTo,
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

      // Fetch current period calls
      const { data: currentCalls } = await supabase
        .from('calls')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .gte('created_at', startOfDay(range.from).toISOString())
        .lte('created_at', endOfDay(range.to).toISOString());

      // Fetch previous period calls
      const { data: previousCalls } = await supabase
        .from('calls')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .gte('created_at', startOfDay(previousFrom).toISOString())
        .lte('created_at', endOfDay(previousTo).toISOString());

      console.log('[useCallAnalytics] 📞 Calls fetched', { 
        currentCount: currentCalls?.length || 0,
        previousCount: previousCalls?.length || 0,
      });

      if (!currentCalls) return null;

      const calls = currentCalls;

      // Calculate metrics for current and previous periods
      const currentMetrics = calculatePeriodMetrics(currentCalls);
      const previousMetrics = calculatePeriodMetrics(previousCalls || []);

      // Group by date for volume chart - Pre-populate all dates in range
      const volumeByDate: Record<string, any> = {};

      // Step 1: Create entries for ALL dates in the range with zero values
      let currentDate = new Date(range.from);
      while (currentDate <= range.to) {
        const dateKey = format(currentDate, 'MMM dd');
        const dateTimestamp = startOfDay(currentDate).getTime();
        
        // Only add if we haven't seen this date key yet (handles cross-month scenarios)
        if (!volumeByDate[dateKey] || volumeByDate[dateKey].timestamp < dateTimestamp) {
          volumeByDate[dateKey] = {
            date: dateKey,
            timestamp: dateTimestamp,
            inbound: 0,
            outbound: 0,
            missed: 0
          };
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Step 2: Overlay actual call data
      calls.forEach(call => {
        const callDate = new Date(call.created_at);
        const dateKey = format(callDate, 'MMM dd');
        
        if (volumeByDate[dateKey]) {
          if (call.direction === 'inbound') volumeByDate[dateKey].inbound++;
          if (call.direction === 'outbound') volumeByDate[dateKey].outbound++;
          if (call.status === 'missed') volumeByDate[dateKey].missed++;
        }
      });

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
          totalCalls: currentMetrics.totalCalls,
          avgDuration: currentMetrics.avgDuration,
          answerRate: currentMetrics.answerRate,
          missedCalls: currentMetrics.missedCalls,
          callsTrend: calculatePercentageChange(currentMetrics.totalCalls, previousMetrics.totalCalls),
          durationTrend: calculatePercentageChange(currentMetrics.avgDuration, previousMetrics.avgDuration),
          answerRateTrend: calculatePercentageChange(currentMetrics.answerRate, previousMetrics.answerRate),
          missedTrend: calculatePercentageChange(currentMetrics.missedCalls, previousMetrics.missedCalls),
        },
        volumeData: Object.values(volumeByDate)
          .sort((a: any, b: any) => a.timestamp - b.timestamp)
          .map(({ timestamp, ...rest }: any) => rest),
        agentStats,
        periodLengthDays,
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
    periodLengthDays: data?.periodLengthDays || 30,
    isLoading,
    refetch,
  };
};
