import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isExternalAction } from '../admin/rules/actionTypeMetadata';
import { useStageProgressionValidation } from '@/hooks/recruitment/useStageProgressionValidation';

export interface MatchedRule {
  rule_id: string;
  rule_name: string;
  action_type: string;
  action_config: Record<string, unknown>;
  is_external: boolean;
  execution_order: number;
  template_name?: string | null;
  user_name?: string | null;
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

export interface GateBlocked {
  applicationId: string;
  applicantId: string;
  applicantName: string;
  fromStageId: string;
  toStageId: string;
  stageName: string;
}

export function useStageMoveAutomation(opts?: { onComplete?: () => void; onCancel?: () => void }) {
  const queryClient = useQueryClient();
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [gateBlocked, setGateBlocked] = useState<GateBlocked | null>(null);
  const [busy, setBusy] = useState(false);
  const validate = useStageProgressionValidation();

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
    // Defensive: stage rename/recolor/reorder races would leave
    // ApplicantStageBadge resolving an old label (e.g. "Diskvalifisert")
    // until the next manual refresh. Refresh the pipeline lookup table too.
    queryClient.invalidateQueries({ queryKey: ['recruitment-pipeline-default'] });

    // Server-side trigger flips applications.score_status -> 'pending' on
    // stage entry (per-stage scoring rules). Invalidate each application's
    // score query so the right-rail ApplicantScoringSection flips to
    // "Vurderer..." immediately instead of waiting for its 5s poll.
    // Best-effort: cache may be undefined on first move after page load,
    // or applications[] may be missing; iteration must not throw.
    try {
      const profile = queryClient.getQueryData<any>(['applicant', applicantId]);
      const apps: any[] = Array.isArray(profile?.applications) ? profile.applications : [];
      for (const app of apps) {
        if (!app?.id) continue;
        queryClient.invalidateQueries({ queryKey: ['application-score', app.id] });
      }
    } catch {
      // non-fatal — the ['applicant', id] invalidate above will eventually
      // hydrate downstream consumers on refetch.
    }
  };

  const handleStageMove = async (
    input: HandleStageMoveInput,
    options?: { skipValidation?: boolean },
  ) => {
    if (input.fromStageId === input.toStageId) return;
    setBusy(true);
    try {
      // Stage-progression gate — single source of truth for both kanban
      // drag-drop and profile dropdown. Skipped when the caller has just
      // satisfied/overridden requirements via StageRequiredFieldsModal.
      if (!options?.skipValidation) {
        try {
          const res = await validate.mutateAsync({
            application_id: input.applicationId,
            target_stage_id: input.toStageId,
          });
          if (!res.can_progress) {
            setGateBlocked({
              applicationId: input.applicationId,
              applicantId: input.applicantId,
              applicantName: input.applicantName,
              fromStageId: input.fromStageId,
              toStageId: input.toStageId,
              stageName: input.stageName,
            });
            // Tell the caller to revert any optimistic UI (kanban card snaps back).
            opts?.onCancel?.();
            return;
          }
        } catch (e: any) {
          toast.error(e?.message ?? 'Kunne ikke validere fase-krav');
          opts?.onCancel?.();
          return;
        }
      }

      const ctx = buildContext(input);
      const matched = await matchRulesRpc(ctx);

      // Resolve UUIDs in action_config to human names so the modal can display
      // "Send e-post: 'Søknad mottatt'" instead of raw template/user IDs.
      const templateIds = Array.from(
        new Set(
          matched
            .filter((r) => r.action_type === 'send_email')
            .map((r) => (r.action_config as any)?.template_id)
            .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0),
        ),
      );
      const userIds = Array.from(
        new Set(
          matched
            .filter((r) => r.action_type === 'assign_to')
            .map((r) => (r.action_config as any)?.user_id)
            .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0),
        ),
      );

      const [templatesRes, usersRes] = await Promise.all([
        templateIds.length
          ? supabase.from('recruitment_email_templates').select('id, name').in('id', templateIds)
          : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
        userIds.length
          ? supabase.from('profiles').select('id, full_name, email').in('id', userIds)
          : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; email: string | null }> }),
      ]);

      const templateMap = new Map(
        ((templatesRes.data ?? []) as Array<{ id: string; name: string }>).map((t) => [t.id, t.name]),
      );
      const userMap = new Map(
        ((usersRes.data ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>).map(
          (p) => [p.id, p.full_name ?? p.email ?? null],
        ),
      );

      const enrichedMatched: MatchedRule[] = matched.map((r) => ({
        ...r,
        template_name:
          r.action_type === 'send_email'
            ? templateMap.get((r.action_config as any)?.template_id) ?? null
            : null,
        user_name:
          r.action_type === 'assign_to'
            ? userMap.get((r.action_config as any)?.user_id) ?? null
            : null,
      }));

      const externalRules = enrichedMatched.filter((r) => isExternalAction(r.action_type));
      const internalRules = enrichedMatched.filter((r) => !isExternalAction(r.action_type));

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

  const clearGate = () => setGateBlocked(null);
  const resumeAfterGate = () => {
    const g = gateBlocked;
    if (!g) return;
    setGateBlocked(null);
    void handleStageMove(
      {
        applicationId: g.applicationId,
        applicantId: g.applicantId,
        applicantName: g.applicantName,
        fromStageId: g.fromStageId,
        toStageId: g.toStageId,
        stageName: g.stageName,
      },
      { skipValidation: true },
    );
  };

  return {
    handleStageMove,
    pendingMove,
    gateBlocked,
    clearGate,
    resumeAfterGate,
    busy,
    confirmMoveAndSend: (skipReasonIgnored?: string) => confirmMoveAndSend.mutateAsync(),
    confirmMoveSkipExternal: (skipReason?: string) => confirmMoveSkipExternal.mutateAsync(skipReason ?? null),
    cancelMove,
    isSending: confirmMoveAndSend.isPending,
    isSkipping: confirmMoveSkipExternal.isPending,
  };
}

