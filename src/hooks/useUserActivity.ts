import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserActivity {
  id: string;
  created_at: string;
  actor_email: string;
  actor_role: string;
  action_type: string;
  action_category: string;
  target_type: string;
  target_identifier: string;
  changes: Record<string, any>;
  metadata: Record<string, any>;
  organization_id?: string;
}

export function useUserActivity(userId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['user-activity', userId],
    enabled: enabled && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .eq('actor_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching user activity:', error);
        throw error;
      }

      return (data || []) as UserActivity[];
    },
  });
}
