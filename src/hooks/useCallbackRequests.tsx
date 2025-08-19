import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CallbackRequest {
  id: string;
  organization_id: string;
  event_type: string;
  call_id?: string;
  conversation_id?: string;
  customer_phone?: string;
  event_data: any;
  status: 'pending' | 'processed' | 'completed' | 'failed';
  triggered_by_event_id?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
  calls?: {
    customer_phone?: string;
    agent_phone?: string;
    started_at: string;
    metadata: any;
  };
}

export function useCallbackRequests() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: callbackRequests = [], isLoading, error } = useQuery({
    queryKey: ['callback-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('internal_events')
        .select(`
          *,
          calls (
            customer_phone,
            agent_phone,
            started_at,
            metadata
          )
        `)
        .eq('event_type', 'callback_requested')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CallbackRequest[];
    },
  });

  // Update callback request status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('internal_events')
        .update({ 
          status,
          processed_at: status === 'processed' ? new Date().toISOString() : null
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['callback-requests'] });
      toast({
        title: "Status updated",
        description: `Callback request marked as ${status}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update callback request status",
        variant: "destructive"
      });
      console.error('Error updating callback request:', error);
    }
  });

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('callback-requests-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'internal_events',
        filter: 'event_type=eq.callback_requested'
      }, (payload) => {
        console.log('Callback request change received:', payload);
        
        // Show toast notification for new callback requests
        if (payload.eventType === 'INSERT') {
          const newRequest = payload.new as CallbackRequest;
          toast({
            title: "Callback Request",
            description: `New request from ${newRequest.customer_phone || 'Unknown'}`,
          });
        } else if (payload.eventType === 'UPDATE') {
          const updatedRequest = payload.new as CallbackRequest;
          if (payload.old?.status !== updatedRequest.status) {
            toast({
              title: "Request Status Updated",
              description: `Request marked as ${updatedRequest.status}`,
            });
          }
        }
        
        queryClient.invalidateQueries({ queryKey: ['callback-requests'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Derived data
  const pendingRequests = callbackRequests.filter(req => req.status === 'pending');
  const processedRequests = callbackRequests.filter(req => req.status === 'processed');
  const completedRequests = callbackRequests.filter(req => req.status === 'completed');

  const requestsByStatus = callbackRequests.reduce((acc, req) => {
    acc[req.status] = (acc[req.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    callbackRequests,
    pendingRequests,
    processedRequests,
    completedRequests,
    requestsByStatus,
    isLoading,
    error,
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending
  };
}