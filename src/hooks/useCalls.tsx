import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
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
  const { createManagedSubscription, isConnected } = useRealtimeConnectionManager();

  console.log('[useCalls] 🚀 Hook initialized - real-time + polling fallback enabled');
  console.log('[useCalls] 📡 Real-time connected:', isConnected);

  const { data: calls = [], isLoading, error } = useQuery({
    queryKey: ['calls'],
    queryFn: async () => {
      const timestamp = new Date().toISOString();
      console.log(`[useCalls] 🔍 Fetching calls from database at ${timestamp}`);
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
        .eq('hidden', false)
        .order('started_at', { ascending: false });

      if (error) {
        console.error('[useCalls] ❌ Error fetching calls:', error);
        throw error;
      }

      console.log('[useCalls] ✅ Fetched calls:', {
        count: data.length,
        statuses: data.map(c => ({ id: c.id, status: c.status, ended_at: c.ended_at })),
        ringingCalls: data.filter(c => c.status === 'ringing').length,
        timestamp: new Date().toISOString()
      });

      return data as Call[];
    },
    // Aggressive polling fallback to ensure UI updates
    refetchInterval: 1000 * 5, // 5 seconds fallback (increased speed for production debugging)
    staleTime: 1000 * 5, // 5 seconds - refresh more frequently
    gcTime: 1000 * 60 * 60, // 1 hour cache retention
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: callEvents = [] } = useQuery({
    queryKey: ['call-events'],
    queryFn: async () => {
      console.log('[useCalls] 🔍 Fetching call events at', new Date().toISOString());
      const { data, error } = await supabase
        .from('call_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[useCalls] ❌ Error fetching call events:', error);
        throw error;
      }
      
      console.log('[useCalls] ✅ Fetched call events:', data.length);
      return data as CallEvent[];
    },
    // Aggressive polling fallback to ensure UI updates
    refetchInterval: 1000 * 5, // 5 seconds fallback (increased speed for production debugging)
    staleTime: 1000 * 5, // 5 seconds - refresh more frequently
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Set up managed real-time subscriptions
  useEffect(() => {
    console.log('[useCalls] 🔌 Setting up realtime subscriptions...');
    
    const unsubscribeCalls = createManagedSubscription(
      'calls-changes',
      (channel) => channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'calls'
      }, (payload) => {
        const timestamp = new Date().toISOString();
        console.log(`[Real-time] 📞 Calls table event received at ${timestamp}:`, {
          eventType: payload.eventType,
          table: payload.table,
          timestamp
        });
        
        // Show toast notification for new calls (only if not handled by main notifications)
        if (payload.eventType === 'INSERT') {
          const newCall = payload.new as Call;
          console.log('[Real-time] 🆕 NEW CALL INSERTED:', {
            id: newCall.id,
            status: newCall.status,
            direction: newCall.direction,
            customer_phone: newCall.customer_phone,
            started_at: newCall.started_at,
            timestamp
          });
          
          if (newCall.direction === 'inbound') {
            console.log('[Real-time] 📲 Incoming call detected - should trigger notification');
          }
        } else if (payload.eventType === 'UPDATE') {
          const updatedCall = payload.new as Call;
          const oldCall = payload.old as Call;
          console.log('[Real-time] 🔄 CALL UPDATED:', {
            id: updatedCall.id,
            oldStatus: oldCall?.status,
            newStatus: updatedCall.status,
            oldEndedAt: oldCall?.ended_at,
            newEndedAt: updatedCall.ended_at,
            timestamp
          });
          
          if (oldCall?.status !== updatedCall.status) {
            console.log(`[Real-time] ⚡ Status changed: ${oldCall?.status} → ${updatedCall.status}`);
            
            // Invalidate Noddi cache when call ends (completed or missed) to catch new bookings
            const terminalStatuses = ['completed', 'missed'];
            if (terminalStatuses.includes(updatedCall.status) && !terminalStatuses.includes(oldCall?.status || '')) {
              console.log('[Real-time] 📝 Call ended - invalidating Noddi cache for customer');
              queryClient.invalidateQueries({
                queryKey: ['noddi-customer-lookup', updatedCall.customer_phone]
              });
            }
          }
        } else if (payload.eventType === 'DELETE') {
          console.log('[Real-time] 🗑️ CALL DELETED:', {
            id: payload.old?.id,
            timestamp
          });
        }
        
        console.log('[Real-time] ♻️ Invalidating calls query to refresh UI');
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
        console.log('[useCalls] 📋 Call event received:', {
          eventType: payload.eventType,
          new: payload.new,
          timestamp: new Date().toISOString()
        });
        
        console.log('[useCalls] ♻️ Invalidating call-events query');
        queryClient.invalidateQueries({ queryKey: ['call-events'] });
      }),
      [createManagedSubscription, queryClient]
    );

    console.log('[useCalls] ✅ Realtime subscriptions created');

    return () => {
      console.log('[useCalls] 🔌 Cleaning up realtime subscriptions');
      unsubscribeCalls();
      unsubscribeEvents();
    };
  }, [createManagedSubscription, queryClient]);

  // Derived data
  const activeCalls = calls.filter(call => 
    ['ringing', 'answered', 'on_hold', 'transferred'].includes(call.status) && !call.ended_at
  );

  console.log('[useCalls] 📊 Active calls computed:', {
    totalCalls: calls.length,
    activeCalls: activeCalls.length,
    activeCallDetails: activeCalls.map(c => ({ 
      id: c.id, 
      status: c.status, 
      ended_at: c.ended_at,
      started_at: c.started_at 
    })),
    timestamp: new Date().toISOString()
  });

  const recentCalls = calls.slice(0, 10);

  const callsByStatus = calls.reduce((acc, call) => {
    acc[call.status] = (acc[call.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const removeCallMutation = useMutation({
    mutationFn: async (callId: string) => {
      const { error } = await supabase
        .from('calls')
        .update({ hidden: true })
        .eq('id', callId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      toast({
        title: 'Call removed',
        description: 'The call has been removed from your history',
      });
    },
    onError: (error) => {
      console.error('Error removing call:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove call',
        variant: 'destructive',
      });
    },
  });

  return {
    calls,
    callEvents,
    activeCalls,
    recentCalls,
    callsByStatus,
    isLoading,
    error,
    removeCall: removeCallMutation.mutate,
  };
}