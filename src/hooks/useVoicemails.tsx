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
      console.log('🔍 Fetching voicemails from internal_events...');
      
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

      console.log('📧 Voicemails query result:', { data, error, count: data?.length });

      if (error) {
        console.error('❌ Error fetching voicemails:', error);
        throw error;
      }
      
      return data || [];
    },
  });

  // Download voicemail recording
  // Add a mutation for getting playback URL
  const getPlaybackUrlMutation = useMutation({
    mutationFn: async ({ voicemailId, recordingUrl }: { voicemailId: string; recordingUrl: string }) => {
      const { data, error } = await supabase.functions.invoke('download-voicemail', {
        body: { voicemailId, recordingUrl }
      });

      if (error) throw error;
      return data;
    },
    onError: (error) => {
      console.error('Error getting playback URL:', error);
    }
  });

  const downloadVoicemailMutation = useMutation({
    mutationFn: async ({ voicemailId, recordingUrl }: { voicemailId: string; recordingUrl: string }) => {
      const { data, error } = await supabase.functions.invoke('download-voicemail', {
        body: { voicemailId, recordingUrl }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Voicemail downloaded",
        description: "Recording is now available locally",
      });
      queryClient.invalidateQueries({ queryKey: ['voicemails'] });
    },
    onError: (error) => {
      toast({
        title: "Download failed",
        description: "Could not download voicemail recording",
        variant: "destructive"
      });
      console.error('Error downloading voicemail:', error);
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
    downloadVoicemail: downloadVoicemailMutation.mutate,
    isDownloading: downloadVoicemailMutation.isPending,
    assignVoicemail: assignVoicemailMutation.mutate,
    isAssigning: assignVoicemailMutation.isPending,
    getPlaybackUrl: getPlaybackUrlMutation.mutateAsync,
    isGettingPlaybackUrl: getPlaybackUrlMutation.isPending
  };
}