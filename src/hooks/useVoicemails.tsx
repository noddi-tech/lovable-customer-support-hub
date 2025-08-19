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
  event_data: {
    recording_url?: string;
    duration?: number;
    transcription?: string;
  };
  status: string;
  created_at: string;
  updated_at: string;
  calls?: {
    customer_phone?: string;
    started_at: string;
    metadata: any;
  };
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
          )
        `)
        .eq('event_type', 'voicemail_left')
        .order('created_at', { ascending: false });

      console.log('📧 Voicemails query result:', { data, error, count: data?.length });

      if (error) {
        console.error('❌ Error fetching voicemails:', error);
        throw error;
      }
      
      return data as Voicemail[];
    },
  });

  // Download voicemail recording
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
        queryClient.invalidateQueries({ queryKey: ['voicemails'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Derived data
  const recentVoicemails = voicemails.slice(0, 10);
  const voicemailsWithRecordings = voicemails.filter(vm => vm.event_data.recording_url);
  const transcribedVoicemails = voicemails.filter(vm => vm.event_data.transcription);

  return {
    voicemails,
    recentVoicemails,
    voicemailsWithRecordings,
    transcribedVoicemails,
    isLoading,
    error,
    downloadVoicemail: downloadVoicemailMutation.mutate,
    isDownloading: downloadVoicemailMutation.isPending
  };
}