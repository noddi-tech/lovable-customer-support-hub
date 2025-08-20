import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Voicemail {
  id: string;
  organization_id: string;
  event_type: string;
  call_id?: string;
  customer_phone?: string;
  assigned_to_id?: string;
  event_data: any;
  status: string;
  created_at: string;
  updated_at: string;
  calls?: {
    customer_phone?: string;
    started_at: string;
    metadata: any;
  };
  assigned_to?: {
    user_id: string;
    full_name: string;
    avatar_url?: string;
  } | null;
}

export function useVoicemails() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: voicemails = [], isLoading, error } = useQuery({
    queryKey: ['voicemails'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('internal_events')
        .select(`
          *,
          calls (
            customer_phone,
            started_at,
            metadata
          ),
          assigned_to:profiles!assigned_to_id (
            user_id,
            full_name,
            avatar_url
          )
        `)
        .eq('event_type', 'voicemail_left')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching voicemails:', error);
        throw error;
      }
      
      return data || [];
    },
  });

  // Unified mutation for both download and playback
  const audioMutation = useMutation({
    mutationFn: async ({ voicemailId }: { voicemailId: string }) => {
      const { data, error } = await supabase.functions.invoke('download-voicemail', {
        body: { voicemailId }
      });

      if (error) throw error;
      return data;
    },
    onError: (error) => {
      console.error('Audio operation failed:', error);
    }
  });

  // Assign voicemail to agent
  const assignVoicemailMutation = useMutation({
    mutationFn: async ({ voicemailId, agentId }: { voicemailId: string; agentId: string }) => {
      const { data, error } = await supabase
        .from('internal_events')
        .update({ 
          assigned_to_id: agentId,
          status: agentId ? 'processed' : 'pending'
        })
        .eq('id', voicemailId)
        .eq('event_type', 'voicemail_left')
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Voicemail assigned",
        description: "Voicemail has been assigned to agent",
      });
      queryClient.invalidateQueries({ queryKey: ['voicemails'] });
    },
    onError: (error) => {
      toast({
        title: "Assignment failed",
        description: "Could not assign voicemail to agent",
        variant: "destructive"
      });
      console.error('Error assigning voicemail:', error);
    }
  });

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('voicemails-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'internal_events',
        filter: 'event_type=eq.voicemail_left'
      }, (payload) => {
        console.log('Voicemail change received:', payload);
        
        // Show toast notification for new voicemails
        if (payload.eventType === 'INSERT') {
          const newVoicemail = payload.new as Voicemail;
          toast({
            title: "New Voicemail",
            description: `Voicemail from ${newVoicemail.customer_phone || 'Unknown'}`,
          });
        }
        
        queryClient.invalidateQueries({ queryKey: ['voicemails'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Derived data
  const recentVoicemails = voicemails.slice(0, 10);
  const voicemailsWithRecordings = voicemails.filter((vm: any) => vm.event_data?.recording_url);
  const transcribedVoicemails = voicemails.filter((vm: any) => vm.event_data?.transcription);

  return {
    voicemails,
    recentVoicemails,
    voicemailsWithRecordings,
    transcribedVoicemails,
    isLoading,
    error,
    // Unified audio operations
    downloadVoicemail: (voicemailId: string) => {
      audioMutation.mutate({ voicemailId });
      toast({
        title: "Downloading...",
        description: "Preparing voicemail for download",
      });
    },
    getPlaybackUrl: (voicemailId: string) => audioMutation.mutateAsync({ voicemailId }),
    isAudioLoading: audioMutation.isPending,
    assignVoicemail: assignVoicemailMutation.mutate,
    isAssigning: assignVoicemailMutation.isPending
  };
}