import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
// Real-time subscriptions are now handled centrally by RealtimeProvider

export interface CallbackRequest {
  id: string;
  organization_id: string;
  event_type: string;
  call_id?: string;
  conversation_id?: string;
  customer_phone?: string;
  event_data: any;
  status: string;
  assigned_to_id?: string;
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
  assigned_to?: {
    user_id: string;
    full_name: string;
    avatar_url?: string;
  } | null;
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
          ),
          assigned_to:profiles!assigned_to_id (
            user_id,
            full_name,
            avatar_url
          )
        `)
        .eq('event_type', 'callback_requested')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
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

  // Assign callback request to agent
  const assignCallbackMutation = useMutation({
    mutationFn: async ({ callbackId, agentId }: { callbackId: string; agentId: string }) => {
      const { data, error } = await supabase
        .from('internal_events')
        .update({ 
          assigned_to_id: agentId,
          status: agentId ? 'processed' : 'pending'
        })
        .eq('id', callbackId)
        .eq('event_type', 'callback_requested')
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Callback assigned",
        description: "Callback request has been assigned to agent",
      });
      queryClient.invalidateQueries({ queryKey: ['callback-requests'] });
    },
    onError: (error) => {
      toast({
        title: "Assignment failed",
        description: "Could not assign callback request to agent",
        variant: "destructive"
      });
      console.error('Error assigning callback request:', error);
    }
  });

  // Real-time subscriptions moved to centralized RealtimeProvider
  // The provider invalidates 'callback-requests' query key on internal_events table changes

  // Derived data
  const pendingRequests = callbackRequests.filter((req: any) => req.status === 'pending');
  const processedRequests = callbackRequests.filter((req: any) => req.status === 'processed');
  const completedRequests = callbackRequests.filter((req: any) => req.status === 'completed');

  const requestsByStatus = callbackRequests.reduce((acc: any, req: any) => {
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
    isUpdating: updateStatusMutation.isPending,
    assignCallback: assignCallbackMutation.mutate,
    isAssigning: assignCallbackMutation.isPending
  };
}