import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface VoiceIntegrationConfig {
  id?: string;
  organization_id?: string;
  provider: string;
  is_active: boolean;
  webhook_token?: string;
  configuration: {
    phoneNumbers?: Array<{ id: string; number: string; label: string }>;
    enabledEvents?: Array<string>;
    callEvents?: Array<{
      eventType: string;
      label: string;
      description: string;
      enabled: boolean;
    }>;
    aircallEverywhere?: {
      enabled: boolean;
      apiId: string;
      apiToken: string;
      domainName?: string;
    };
  };
}

export function useVoiceIntegrations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user's organization
  const { data: currentUserOrg } = useQuery({
    queryKey: ['current-user-organization'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data.organization_id;
    },
  });

  // Fetch all voice integrations for the current organization
  const { data: integrations = [], isLoading, error } = useQuery({
    queryKey: ['voice-integrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('voice_integrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as VoiceIntegrationConfig[];
    },
  });

  // Fetch last event timestamp for the current organization
  const { data: lastEventTimestamp } = useQuery({
    queryKey: ['last-call-event', currentUserOrg],
    queryFn: async (): Promise<string | null> => {
      if (!currentUserOrg) return null;
      
      try {
        // Query call_events through calls table to respect RLS policies
        const { data, error } = await supabase
          .from('call_events')
          .select('created_at, call_id')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching last event:', error);
          return null;
        }
        return data?.created_at || null;
      } catch (error) {
        console.error('Error fetching last event:', error);
        return null;
      }
    },
    enabled: !!currentUserOrg,
  });

  // Get specific integration by provider
  const getIntegrationByProvider = (provider: string) => {
    return integrations.find(integration => integration.provider === provider);
  };

  // Save or update voice integration configuration
  const saveIntegrationMutation = useMutation({
    mutationFn: async (config: VoiceIntegrationConfig) => {
      if (!currentUserOrg) {
        throw new Error('User organization not found');
      }

      const existingIntegration = getIntegrationByProvider(config.provider);
      
      if (existingIntegration) {
        // Update existing integration
        const { data, error } = await supabase
          .from('voice_integrations')
          .update({
            webhook_token: config.webhook_token,
            configuration: config.configuration as any,
            is_active: config.is_active,
          })
          .eq('id', existingIntegration.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new integration
        const { data, error } = await supabase
          .from('voice_integrations')
          .insert({
            organization_id: currentUserOrg,
            provider: config.provider,
            webhook_token: config.webhook_token,
            configuration: config.configuration as any,
            is_active: config.is_active,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['voice-integrations'] });
      toast({
        title: "Settings saved",
        description: `${variables.provider} integration settings have been updated successfully`,
      });
    },
    onError: (error) => {
      console.error('Error saving voice integration:', error);
      toast({
        title: "Error saving settings",
        description: "Failed to save integration settings. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Delete voice integration
  const deleteIntegrationMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      const { error } = await supabase
        .from('voice_integrations')
        .delete()
        .eq('id', integrationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-integrations'] });
      toast({
        title: "Integration removed",
        description: "Voice integration has been successfully removed",
      });
    },
    onError: (error) => {
      console.error('Error deleting voice integration:', error);
      toast({
        title: "Error removing integration",
        description: "Failed to remove integration. Please try again.",
        variant: "destructive"
      });
    }
  });

  return {
    integrations,
    isLoading,
    error,
    lastEventTimestamp,
    getIntegrationByProvider,
    saveIntegration: saveIntegrationMutation.mutate,
    deleteIntegration: deleteIntegrationMutation.mutate,
    isSaving: saveIntegrationMutation.isPending,
    isDeleting: deleteIntegrationMutation.isPending,
  };
}