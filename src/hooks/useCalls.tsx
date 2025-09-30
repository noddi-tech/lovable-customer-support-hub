import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeConnectionManager } from "./useRealtimeConnectionManager";

export interface Call {
  id: string;
  organization_id: string;
  external_id: string;
  provider: string;
  customer_phone?: string;
  agent_phone?: string;
  customer_id?: string;
  status: 'ringing' | 'answered' | 'missed' | 'busy' | 'failed' | 'completed' | 'transferred' | 'on_hold' | 'voicemail';
  direction: 'inbound' | 'outbound';
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  recording_url?: string;
  metadata: any;
  created_at: string;
  updated_at: string;
  // Enriched fields from call events
  end_reason?: string;
  webhook_event_type?: string;
  ivr_interaction?: any;
  availability_status?: string;
  hangup_cause?: string;
  enriched_details?: any;
  // Linked customer data
  customers?: {
    id: string;
    full_name?: string;
    email?: string;
    phone?: string;
    metadata?: any;
  };
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
  const { toast } = useToast();
  const { createManagedSubscription } = useRealtimeConnectionManager();

  console.log('🔍 useCalls hook initialized - CONSOLIDATING SUBSCRIPTIONS');

  const { data: calls = [], isLoading, error } = useQuery({
    queryKey: ['calls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calls')
        .select(`
          *,
          customers (
            id,
            full_name,
            email,
            phone,
            metadata
          )
        `)
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

  // Set up managed real-time subscriptions
  useEffect(() => {
    console.log('📡 useCalls: Setting up realtime subscriptions...');
    
    const unsubscribeCalls = createManagedSubscription(
      'calls-changes',
      (channel) => channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'calls'
      }, (payload) => {
        console.log('Call change received:', payload);
        
        // Show toast notification for new calls (only if not handled by main notifications)
        if (payload.eventType === 'INSERT') {
          const newCall = payload.new as Call;
          if (newCall.direction === 'inbound') {
            // This is now handled by useRealTimeCallNotifications
            console.log('New incoming call detected in useCalls');
          }
        } else if (payload.eventType === 'UPDATE') {
          const updatedCall = payload.new as Call;
          if (payload.old?.status !== updatedCall.status) {
            console.log(`Call status updated: ${updatedCall.status}`);
          }
        }
        
        queryClient.invalidateQueries({ queryKey: ['calls'] });
      }),
      [createManagedSubscription, queryClient]
    );

    const unsubscribeEvents = createManagedSubscription(
      'call-events-changes',
      (channel) => channel.on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'call_events'
      }, (payload) => {
        console.log('Call event received:', payload);
        
        // Let useRealTimeCallNotifications handle the main notifications
        queryClient.invalidateQueries({ queryKey: ['call-events'] });
      }),
      [createManagedSubscription, queryClient]
    );

    return () => {
      unsubscribeCalls();
      unsubscribeEvents();
    };
  }, [createManagedSubscription, queryClient]);

  // Derived data
  const activeCalls = calls.filter(call => 
    ['ringing', 'answered', 'on_hold', 'transferred'].includes(call.status) && !call.ended_at
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