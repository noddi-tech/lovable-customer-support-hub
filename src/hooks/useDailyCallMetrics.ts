import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay } from 'date-fns';

interface DailyMetrics {
  totalCalls: number;
  avgDuration: number;
  answerRate: number;
  missedCalls: number;
  callsTrend: number;
  durationTrend: number;
  answerRateTrend: number;
  missedTrend: number;
}

const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

const calculateDayMetrics = (calls: any[]) => {
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

export const useDailyCallMetrics = () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const { data, isLoading } = useQuery({
    queryKey: ['daily-call-metrics', startOfDay(today).toISOString()],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Fetch today's calls
      const { data: todayCalls } = await supabase
        .from('calls')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .gte('created_at', startOfDay(today).toISOString())
        .lte('created_at', endOfDay(today).toISOString());

      // Fetch yesterday's calls
      const { data: yesterdayCalls } = await supabase
        .from('calls')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .gte('created_at', startOfDay(yesterday).toISOString())
        .lte('created_at', endOfDay(yesterday).toISOString());

      const todayMetrics = calculateDayMetrics(todayCalls || []);
      const yesterdayMetrics = calculateDayMetrics(yesterdayCalls || []);

      return {
        totalCalls: todayMetrics.totalCalls,
        avgDuration: todayMetrics.avgDuration,
        answerRate: todayMetrics.answerRate,
        missedCalls: todayMetrics.missedCalls,
        callsTrend: calculatePercentageChange(todayMetrics.totalCalls, yesterdayMetrics.totalCalls),
        durationTrend: calculatePercentageChange(todayMetrics.avgDuration, yesterdayMetrics.avgDuration),
        answerRateTrend: calculatePercentageChange(todayMetrics.answerRate, yesterdayMetrics.answerRate),
        missedTrend: calculatePercentageChange(todayMetrics.missedCalls, yesterdayMetrics.missedCalls),
      };
    },
  });

  return {
    metrics: data || {
      totalCalls: 0,
      avgDuration: 0,
      answerRate: 0,
      missedCalls: 0,
      callsTrend: 0,
      durationTrend: 0,
      answerRateTrend: 0,
      missedTrend: 0,
    },
    isLoading,
  };
};
