import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BackgroundJob {
  jobid: number;
  jobname: string;
  schedule: string;
  command: string;
  active: boolean;
  last_status: string | null;
  last_start: string | null;
  last_end: string | null;
  last_duration_ms: number | null;
  last_message: string | null;
  avg_duration_ms: number | null;
  runs_24h: number;
  failures_24h: number;
}

export interface BackgroundJobRun {
  runid: number;
  jobid: number;
  jobname: string | null;
  status: string;
  start_time: string | null;
  end_time: string | null;
  duration_ms: number | null;
  return_message: string | null;
}

export function useBackgroundJobs() {
  return useQuery({
    queryKey: ['background-jobs'],
    queryFn: async (): Promise<BackgroundJob[]> => {
      const { data, error } = await (supabase as any).rpc('get_background_jobs');
      if (error) throw error;
      return (data ?? []) as BackgroundJob[];
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useBackgroundJobRuns(jobId: number | null, limit = 50) {
  return useQuery({
    queryKey: ['background-job-runs', jobId, limit],
    queryFn: async (): Promise<BackgroundJobRun[]> => {
      const { data, error } = await (supabase as any).rpc('get_background_job_runs', {
        _jobid: jobId,
        _limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as BackgroundJobRun[];
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

/** Human readable description for the most common cron expressions. */
export function describeSchedule(expr: string): string {
  const map: Record<string, string> = {
    '* * * * *': 'Every minute',
    '* * * * * *': 'Every second',
    '*/5 * * * *': 'Every 5 minutes',
    '*/10 * * * *': 'Every 10 minutes',
    '*/15 * * * *': 'Every 15 minutes',
    '*/30 * * * *': 'Every 30 minutes',
    '0 * * * *': 'Hourly',
  };
  if (map[expr]) return map[expr];

  const parts = expr.trim().split(/\s+/);
  if (parts.length === 5) {
    const [min, hour, dom, mon, dow] = parts;
    if (/^\d+$/.test(min) && /^\d+$/.test(hour) && dom === '*' && mon === '*') {
      const time = `${hour.padStart(2, '0')}:${min.padStart(2, '0')} UTC`;
      if (dow === '*') return `Daily at ${time}`;
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      if (/^\d$/.test(dow)) return `Weekly on ${days[Number(dow)]} at ${time}`;
    }
    if (/^\*\/(\d+)$/.test(min) && hour === '*') {
      return `Every ${min.split('/')[1]} minutes`;
    }
  }
  return expr;
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}
