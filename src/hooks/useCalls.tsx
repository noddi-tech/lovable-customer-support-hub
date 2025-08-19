import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Call {
  id: string;
  organization_id: string;
  external_id: string;
  provider: string;
  customer_phone?: string;
  agent_phone?: string;
  status: 'ringing' | 'answered' | 'missed' | 'busy' | 'failed' | 'completed' | 'transferred' | 'on_hold' | 'voicemail';
  direction: 'inbound' | 'outbound';
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  recording_url?: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface CallEvent {
  id: string;
  call_id: string;
  event_type: 'call_started' | 'call_answered' | 'call_ended' | 'call_missed' | 'call_transferred' | 'call_on_hold' | 'call_resumed' | 'voicemail_left' | 'dtmf_pressed' | 'callback_requested' | 'agent_assigned';
  event_data: any;
  timestamp: string;
  created_at: string;
}

export function useCalls() {
  const queryClient = useQueryClient();

  const { data: calls = [], isLoading, error } = useQuery({
    queryKey: ['calls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data as Call[];
    },
  });

  const { data: callEvents = [] } = useQuery({
    queryKey: ['call-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as CallEvent[];
    },
  });

  // Set up real-time subscriptions
  useEffect(() => {
    const callsChannel = supabase
      .channel('calls-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'calls'
      }, (payload) => {
        console.log('Call change received:', payload);
        queryClient.invalidateQueries({ queryKey: ['calls'] });
      })
      .subscribe();

    const eventsChannel = supabase
      .channel('call-events-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'call_events'
      }, (payload) => {
        console.log('Call event received:', payload);
        queryClient.invalidateQueries({ queryKey: ['call-events'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(callsChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, [queryClient]);

  // Derived data
  const activeCalls = calls.filter(call => 
    ['ringing', 'answered', 'on_hold', 'transferred'].includes(call.status)
  );

  const recentCalls = calls.slice(0, 10);

  const callsByStatus = calls.reduce((acc, call) => {
    acc[call.status] = (acc[call.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    calls,
    callEvents,
    activeCalls,
    recentCalls,
    callsByStatus,
    isLoading,
    error
  };
}