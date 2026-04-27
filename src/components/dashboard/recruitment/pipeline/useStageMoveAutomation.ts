import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isExternalAction } from '../admin/rules/actionTypeMetadata';

export interface MatchedRule {
  rule_id: string;
  rule_name: string;
  action_type: string;
  action_config: Record<string, unknown>;
  is_external: boolean;
  execution_order: number;
}

export interface PendingMove {
  applicationId: string;
  applicantId: string;
  applicantName: string;
  fromStageId: string;
  toStageId: string;
  stageName: string;
  externalRules: MatchedRule[];
  internalRules: MatchedRule[];
}

interface HandleStageMoveInput {
  applicationId: string;
  applicantId: string;
  applicantName: string;
  fromStageId: string;
  toStageId: string;
  stageName: string;
}

async function moveStageRpc(applicationId: string, toStageId: string) {
  const { data, error } = await supabase.rpc('move_application_stage', {
    p_application_id: applicationId,
    p_to_stage_id: toStageId,
    p_notify_preference: 'skip',
  });
  if (error) throw error;
  return data;
}

async function matchRulesRpc(triggerContext: Record<string, unknown>): Promise<MatchedRule[]> {
  const { data, error } = await supabase.rpc('match_automation_rules', {
    p_trigger_type: 'stage_entered',
    p_trigger_context: triggerContext as any,
  });
  if (error) throw error;
  return ((data ?? []) as unknown) as MatchedRule[];
}

interface ExecuteOpts {
  triggerContext: Record<string, unknown>;
  onlyRuleIds?: string[];
  skipExternal?: boolean;
  skipReason?: string | null;
}

async function executeRulesRpc({
  triggerContext,
  onlyRuleIds,
  skipExternal = false,
  skipReason = null,
}: ExecuteOpts) {
  const { data, error } = await supabase.rpc('execute_automation_rules', {
    p_trigger_type: 'stage_entered',
    p_trigger_context: triggerContext as any,
    p_dry_run: false,
    p_skip_external: skipExternal,
    p_skip_reason: skipReason,
    p_only_rule_ids: onlyRuleIds ?? null,
  });
  if (error) throw error;
  return data;
}

export function useStageMoveAutomation(opts?: { onComplete?: () => void; onCancel?: () => void }) {
  const queryClient = useQueryClient();
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [busy, setBusy] = useState(false);

  const buildContext = (i: HandleStageMoveInput) => ({
    application_id: i.applicationId,
    applicant_id: i.applicantId,
    from_stage_id: i.fromStageId,
    to_stage_id: i.toStageId,
    stage_id: i.toStageId,
  });

  const invalidate = (applicantId: string) => {
    queryClient.invalidateQueries({ queryKey: ['pipeline-applications'] });
    queryClient.invalidateQueries({ queryKey: ['applicant', applicantId] });
    queryClient.invalidateQueries({ queryKey: ['applicant-events', applicantId] });
    queryClient.invalidateQueries({ queryKey: ['applicants'] });
    queryClient.invalidateQueries({ queryKey: ['recruitment-automation-executions'] });
    queryClient.invalidateQueries({ queryKey: ['recruitment-automation-failure-count'] });
  };

  const handleStageMove = async (input: HandleStageMoveInput) => {
    if (input.fromStageId === input.toStageId) return;
    setBusy(true);
    try {
      const ctx = buildContext(input);
      const matched = await matchRulesRpc(ctx);
      const externalRules = matched.filter((r) => isExternalAction(r.action_type));
      const internalRules = matched.filter((r) => !isExternalAction(r.action_type));

      if (externalRules.length === 0) {
        // No confirmation needed: fire internals (if any) + move stage in parallel.
        await Promise.all([
          moveStageRpc(input.applicationId, input.toStageId),
          internalRules.length > 0
            ? executeRulesRpc({
                triggerContext: ctx,
                onlyRuleIds: internalRules.map((r) => r.rule_id),
              })
            : Promise.resolve(),
        ]);
        invalidate(input.applicantId);
        opts?.onComplete?.();
        return;
      }

      // External rules present → defer to modal.
      setPendingMove({
        ...input,
        externalRules,
        internalRules,
      });
    } catch (err: any) {
      toast.error(err?.message ?? 'Kunne ikke flytte søkeren');
      opts?.onCancel?.();
    } finally {
      setBusy(false);
    }
  };

  const confirmMoveAndSend = useMutation({
    mutationFn: async () => {
      if (!pendingMove) throw new Error('No pending move');
      const ctx = buildContext(pendingMove);
      const allRuleIds = [
        ...pendingMove.externalRules.map((r) => r.rule_id),
        ...pendingMove.internalRules.map((r) => r.rule_id),
      ];
      await Promise.all([
        moveStageRpc(pendingMove.applicationId, pendingMove.toStageId),
        executeRulesRpc({ triggerContext: ctx, onlyRuleIds: allRuleIds }),
      ]);
      return pendingMove;
    },
    onSuccess: (move) => {
      toast.success(`Flyttet til ${move.stageName}`);
      invalidate(move.applicantId);
      setPendingMove(null);
      opts?.onComplete?.();
    },
    onError: (err: any) => {
      toast.error(err?.message ?? 'Kunne ikke flytte og sende');
    },
  });

  const confirmMoveSkipExternal = useMutation({
    mutationFn: async (skipReason?: string | null) => {
      if (!pendingMove) throw new Error('No pending move');
      const ctx = buildContext(pendingMove);
      const allRuleIds = [
        ...pendingMove.externalRules.map((r) => r.rule_id),
        ...pendingMove.internalRules.map((r) => r.rule_id),
      ];
      await Promise.all([
        moveStageRpc(pendingMove.applicationId, pendingMove.toStageId),
        executeRulesRpc({
          triggerContext: ctx,
          onlyRuleIds: allRuleIds,
          skipExternal: true,
          skipReason: skipReason && skipReason.trim().length > 0 ? skipReason.trim() : null,
        }),
      ]);
      return pendingMove;
    },
    onSuccess: (move) => {
      toast.success(`Flyttet til ${move.stageName} uten å sende`);
      invalidate(move.applicantId);
      setPendingMove(null);
      opts?.onComplete?.();
    },
    onError: (err: any) => {
      toast.error(err?.message ?? 'Kunne ikke flytte uten å sende');
    },
  });

  const cancelMove = () => {
    setPendingMove(null);
    opts?.onCancel?.();
  };

  return {
    handleStageMove,
    pendingMove,
    busy,
    confirmMoveAndSend: (skipReasonIgnored?: string) => confirmMoveAndSend.mutateAsync(),
    confirmMoveSkipExternal: (skipReason?: string) => confirmMoveSkipExternal.mutateAsync(skipReason ?? null),
    cancelMove,
    isSending: confirmMoveAndSend.isPending,
    isSkipping: confirmMoveSkipExternal.isPending,
  };
}
