import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import type { AutomationRule, RuleFormValues } from '../types';

const KEY = 'recruitment-automation-rules';

export function useRuleMutations() {
  const qc = useQueryClient();
  const orgId = useOrganizationStore((s) => s.currentOrganizationId);

  const invalidate = () => qc.invalidateQueries({ queryKey: [KEY, orgId] });

  const createRule = useMutation({
    mutationFn: async (values: RuleFormValues) => {
      const existing = (qc.getQueryData<AutomationRule[]>([KEY, orgId]) ?? []);
      const nextOrder =
        existing.length > 0
          ? Math.max(...existing.map((r) => r.execution_order ?? 0)) + 1
          : 0;
      const { data, error } = await supabase
        .from('recruitment_automation_rules')
        .insert({
          organization_id: orgId!,
          name: values.name,
          description: values.description || null,
          trigger_type: values.trigger_type,
          trigger_config: values.trigger_config as any,
          action_type: values.action_type,
          action_config: values.action_config as any,
          is_active: values.is_active,
          execution_order: nextOrder,
          created_by: null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as AutomationRule;
    },
    onSuccess: invalidate,
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: RuleFormValues }) => {
      const { data, error } = await supabase
        .from('recruitment_automation_rules')
        .update({
          name: values.name,
          description: values.description || null,
          trigger_type: values.trigger_type,
          trigger_config: values.trigger_config as any,
          action_type: values.action_type,
          action_config: values.action_config as any,
          is_active: values.is_active,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as AutomationRule;
    },
    onSuccess: invalidate,
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recruitment_automation_rules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('recruitment_automation_rules')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, is_active }) => {
      await qc.cancelQueries({ queryKey: [KEY, orgId] });
      const prev = qc.getQueryData<AutomationRule[]>([KEY, orgId]);
      qc.setQueryData<AutomationRule[]>([KEY, orgId], (old) =>
        (old ?? []).map((r) => (r.id === id ? { ...r, is_active } : r)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData([KEY, orgId], ctx.prev);
    },
    onSettled: invalidate,
  });

  const duplicateRule = useMutation({
    mutationFn: async (rule: AutomationRule) => {
      const existing = qc.getQueryData<AutomationRule[]>([KEY, orgId]) ?? [];
      const nextOrder =
        existing.length > 0
          ? Math.max(...existing.map((r) => r.execution_order ?? 0)) + 1
          : 0;
      const { data, error } = await supabase
        .from('recruitment_automation_rules')
        .insert({
          organization_id: orgId!,
          name: `${rule.name} (kopi)`,
          description: rule.description ?? null,
          trigger_type: rule.trigger_type,
          trigger_config: rule.trigger_config as any,
          action_type: rule.action_type,
          action_config: rule.action_config as any,
          is_active: false,
          execution_order: nextOrder,
          created_by: null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as AutomationRule;
    },
    onSuccess: invalidate,
  });

  const reorderRules = useMutation({
    mutationFn: async (updates: Array<{ id: string; execution_order: number }>) => {
      const results = await Promise.all(
        updates.map((u) =>
          supabase
            .from('recruitment_automation_rules')
            .update({ execution_order: u.execution_order })
            .eq('id', u.id),
        ),
      );
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;
    },
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: [KEY, orgId] });
      const prev = qc.getQueryData<AutomationRule[]>([KEY, orgId]);
      const orderMap = new Map(updates.map((u) => [u.id, u.execution_order]));
      qc.setQueryData<AutomationRule[]>([KEY, orgId], (old) => {
        if (!old) return old;
        return [...old]
          .map((r) =>
            orderMap.has(r.id) ? { ...r, execution_order: orderMap.get(r.id)! } : r,
          )
          .sort((a, b) => a.execution_order - b.execution_order);
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData([KEY, orgId], ctx.prev);
    },
    onSettled: invalidate,
  });

  return {
    createRule,
    updateRule,
    deleteRule,
    toggleActive,
    duplicateRule,
    reorderRules,
  };
}
