import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InviteEmailLog {
  id: string;
  user_id: string | null;
  email: string;
  email_type: string;
  status: string;
  provider: string;
  error_message: string | null;
  metadata: Record<string, any>;
  created_at: string;
  sent_by_id: string | null;
  organization_id: string | null;
}

export function useInviteEmailLogs(email?: string) {
  return useQuery({
    queryKey: ['invite-email-logs', email],
    queryFn: async () => {
      let query = supabase
        .from('invite_email_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (email) {
        query = query.eq('email', email);
      }

      const { data, error } = await query.limit(100);

      if (error) {
        console.error('Error fetching invite logs:', error);
        throw error;
      }

      return (data || []) as InviteEmailLog[];
    },
    enabled: true,
  });
}

export function useUserInviteStatus(email: string) {
  const { data: logs = [] } = useInviteEmailLogs(email);
  
  if (logs.length === 0) return null;
  
  const latestLog = logs[0];
  return {
    status: latestLog.status,
    sentAt: latestLog.created_at,
    emailType: latestLog.email_type,
    count: logs.length,
  };
}
