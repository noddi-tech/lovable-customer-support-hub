import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  organization_id: string;
  email_on_ticket_assigned: boolean;
  email_on_ticket_updated: boolean;
  email_on_ticket_commented: boolean;
  email_on_sla_breach: boolean;
  app_on_ticket_assigned: boolean;
  app_on_ticket_updated: boolean;
  app_on_ticket_commented: boolean;
  app_on_sla_breach: boolean;
  daily_digest_enabled: boolean;
  weekly_digest_enabled: boolean;
}

export function useNotificationPreferences() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id || !profile?.organization_id) return null;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', profile.organization_id)
        .maybeSingle();

      if (error) throw error;

      // If no preferences exist, create defaults
      if (!data) {
        const { data: newPrefs, error: createError } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: user.id,
            organization_id: profile.organization_id,
            email_on_ticket_assigned: true,
            email_on_ticket_updated: false,
            email_on_ticket_commented: true,
            email_on_sla_breach: true,
            app_on_ticket_assigned: true,
            app_on_ticket_updated: true,
            app_on_ticket_commented: true,
            app_on_sla_breach: true,
            daily_digest_enabled: false,
            weekly_digest_enabled: true,
          })
          .select()
          .single();

        if (createError) throw createError;
        return newPrefs as NotificationPreferences;
      }

      return data as NotificationPreferences;
    },
    enabled: !!user?.id && !!profile?.organization_id,
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      if (!preferences?.id) throw new Error('No preferences found');

      const { data, error } = await supabase
        .from('notification_preferences')
        .update(updates)
        .eq('id', preferences.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences', user?.id] });
      toast({
        title: 'Preferences saved',
        description: 'Your notification preferences have been updated.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
        variant: 'destructive',
      });
    },
  });

  return {
    preferences,
    isLoading,
    updatePreferences: updatePreferences.mutate,
    isUpdating: updatePreferences.isPending,
  };
}
