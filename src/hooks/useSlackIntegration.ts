import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import { toast } from 'sonner';

export interface SlackIntegrationConfig {
  enabled_events: string[];
  mention_assigned_user: boolean;
  include_message_preview: boolean;
}

export interface SlackIntegration {
  id: string;
  organization_id: string;
  is_active: boolean;
  team_id: string | null;
  team_name: string | null;
  bot_user_id: string | null;
  default_channel_id: string | null;
  default_channel_name: string | null;
  configuration: SlackIntegrationConfig;
  setup_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
}

export const useSlackIntegration = () => {
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useOrganizationStore();

  // Fetch Slack integration status
  const { data: integration, isLoading, error, refetch } = useQuery({
    queryKey: ['slack-integration', currentOrganizationId],
    queryFn: async () => {
      if (!currentOrganizationId) return null;

      const { data, error } = await supabase
        .from('slack_integrations')
        .select('*')
        .eq('organization_id', currentOrganizationId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      
      // Parse configuration with defaults
      const config = (data.configuration as Record<string, unknown>) || {};
      return {
        ...data,
        configuration: {
          enabled_events: (config.enabled_events as string[]) || [],
          mention_assigned_user: config.mention_assigned_user !== false,
          include_message_preview: config.include_message_preview !== false,
        },
        setup_completed: data.setup_completed || false,
      } as SlackIntegration;
    },
    enabled: !!currentOrganizationId,
  });

  // Fetch available Slack channels
  const { data: channels = [], isLoading: isLoadingChannels, refetch: refetchChannels } = useQuery({
    queryKey: ['slack-channels', currentOrganizationId],
    queryFn: async () => {
      if (!currentOrganizationId || !integration?.is_active) return [];

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];

      const response = await supabase.functions.invoke('slack-list-channels', {
        body: { organization_id: currentOrganizationId },
      });

      if (response.error) throw response.error;
      return (response.data?.channels || []) as SlackChannel[];
    },
    enabled: !!currentOrganizationId && !!integration?.is_active,
  });

  // Save bot token (main connection method)
  const saveDirectToken = useMutation({
    mutationFn: async ({ bot_token }: { bot_token: string }) => {
      if (!currentOrganizationId) throw new Error('No organization selected');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const functionUrl = `https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/slack-integration?action=save-token`;
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          bot_token, 
          organization_id: currentOrganizationId 
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data as { success: boolean; team_name: string; team_id: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['slack-integration'] });
      toast.success(`Connected to ${data.team_name}!`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to connect: ${error.message}`);
    },
  });

  // Disconnect Slack
  const disconnectSlack = useMutation({
    mutationFn: async () => {
      if (!currentOrganizationId) throw new Error('No organization selected');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const functionUrl = `https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/slack-integration?action=disconnect`;
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organization_id: currentOrganizationId }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slack-integration'] });
      queryClient.invalidateQueries({ queryKey: ['slack-channels'] });
      toast.success('Slack disconnected successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to disconnect: ${error.message}`);
    },
  });

  // Update Slack configuration
  const updateConfiguration = useMutation({
    mutationFn: async (updates: {
      default_channel_id?: string;
      default_channel_name?: string;
      is_active?: boolean;
      configuration?: Partial<SlackIntegrationConfig>;
    }) => {
      if (!currentOrganizationId || !integration) {
        throw new Error('No integration found');
      }

      const updateData: Record<string, unknown> = {};
      
      if (updates.default_channel_id !== undefined) {
        updateData.default_channel_id = updates.default_channel_id;
      }
      if (updates.default_channel_name !== undefined) {
        updateData.default_channel_name = updates.default_channel_name;
      }
      if (updates.is_active !== undefined) {
        updateData.is_active = updates.is_active;
      }
      if (updates.configuration) {
        updateData.configuration = {
          ...integration.configuration,
          ...updates.configuration,
        };
      }

      const { error } = await supabase
        .from('slack_integrations')
        .update(updateData)
        .eq('id', integration.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slack-integration'] });
      toast.success('Slack settings saved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  // Test Slack connection by sending a test message
  const testConnection = useMutation({
    mutationFn: async () => {
      if (!currentOrganizationId || !integration?.default_channel_id) {
        throw new Error('No channel configured');
      }

      const response = await supabase.functions.invoke('send-slack-notification', {
        body: {
          organization_id: currentOrganizationId,
          event_type: 'new_conversation',
          customer_name: 'Test User',
          customer_email: 'test@example.com',
          subject: 'Test Notification',
          preview_text: 'This is a test notification from your support system. If you can see this, Slack is configured correctly!',
          inbox_name: 'Test',
        },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
      
      return response.data;
    },
    onSuccess: () => {
      toast.success('Test notification sent to Slack!');
    },
    onError: (error: Error) => {
      toast.error(`Test failed: ${error.message}`);
    },
  });

  return {
    integration,
    isLoading,
    error,
    refetch,
    isConnected: !!integration?.is_active && !!integration?.team_id,
    hasCredentials: !!integration?.setup_completed,
    setupCompleted: !!integration?.setup_completed,
    channels,
    isLoadingChannels,
    refetchChannels,
    disconnectSlack,
    updateConfiguration,
    testConnection,
    saveDirectToken,
  };
};
