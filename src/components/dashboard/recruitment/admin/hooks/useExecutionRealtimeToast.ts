import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';

export function useExecutionRealtimeToast() {
  const orgId = useOrganizationStore((s) => s.currentOrganizationId);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel(`recruitment-automation-failures-${orgId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'recruitment_automation_executions',
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          const next = payload.new as {
            overall_status?: string;
            is_dry_run?: boolean;
            rule_name?: string;
          };

          if (next.overall_status !== 'failed' || next.is_dry_run) return;

          toast.error('Automasjonsregel feilet', {
            id: 'automation-failures',
            description: next.rule_name ?? '(slettet regel)',
            action: {
              label: 'Se detaljer',
              onClick: () => navigate('/admin/recruitment?tab=automation&subtab=log'),
            },
          });

          void Promise.all([
            queryClient.invalidateQueries({ queryKey: ['recruitment-automation-failure-count', orgId] }),
            queryClient.invalidateQueries({ queryKey: ['recruitment-automation-executions', orgId] }),
          ]);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [navigate, orgId, queryClient]);
}