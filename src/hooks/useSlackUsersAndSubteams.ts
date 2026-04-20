import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';

export interface SlackSubteam {
  id: string;
  handle: string;
  name: string;
  description?: string;
  user_count?: number;
}

export interface SlackUser {
  id: string;
  name: string;
  real_name?: string;
  display_name?: string;
  email?: string;
  is_bot?: boolean;
  deleted?: boolean;
}

/**
 * Fetches Slack User Groups (subteams) for the org's connected Slack workspace.
 * Used by the critical-alert routing UI to let admins pick a group to ping
 * instead of @channel.
 */
export const useSlackSubteams = (enabled = true, useSecondary = false) => {
  const { currentOrganizationId } = useOrganizationStore();

  return useQuery({
    queryKey: ['slack-subteams', currentOrganizationId, useSecondary],
    queryFn: async () => {
      if (!currentOrganizationId) return [];
      const response = await supabase.functions.invoke('slack-list-subteams', {
        body: { organization_id: currentOrganizationId, use_secondary: useSecondary },
      });
      if (response.error) throw response.error;
      return (response.data?.subteams || []) as SlackSubteam[];
    },
    enabled: !!currentOrganizationId && enabled,
    staleTime: 5 * 60 * 1000, // 5 min
  });
};

/**
 * Fetches Slack workspace members (humans only, no bots) for the
 * "Single user" mention mode in the critical-alert routing UI.
 */
export const useSlackUsers = (enabled = true, useSecondary = false) => {
  const { currentOrganizationId } = useOrganizationStore();

  return useQuery({
    queryKey: ['slack-users', currentOrganizationId, useSecondary],
    queryFn: async () => {
      if (!currentOrganizationId) return [];
      const response = await supabase.functions.invoke('slack-list-users', {
        body: { organization_id: currentOrganizationId, use_secondary: useSecondary },
      });
      if (response.error) throw response.error;
      return (response.data?.users || []) as SlackUser[];
    },
    enabled: !!currentOrganizationId && enabled,
    staleTime: 5 * 60 * 1000,
  });
};
