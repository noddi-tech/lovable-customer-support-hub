import { z } from 'zod';

export type TriggerType = 'stage_entered' | 'application_created';
export type ActionType = 'send_email' | 'assign_to' | 'webhook';
export type ActionTypeAll =
  | ActionType
  | 'send_sms'
  | 'create_task';

export interface AutomationRule {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  action_type: string;
  action_config: Record<string, unknown>;
  is_active: boolean;
  execution_order: number;
  created_by: string | null;
  last_executed_at: string | null;
  execution_count: number;
  created_at: string;
  updated_at: string;
}

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  stage_entered: 'Søker bytter til en fase',
  application_created: 'Ny søknad opprettes',
};

export const ACTION_OPTIONS: Array<{
  value: ActionTypeAll;
  label: string;
  disabled?: boolean;
  comingSoon?: boolean;
}> = [
  { value: 'send_email', label: 'Send e-post' },
  { value: 'assign_to', label: 'Tildel ansvarlig' },
  { value: 'webhook', label: 'Send webhook' },
  { value: 'send_sms', label: 'Send SMS', disabled: true, comingSoon: true },
  { value: 'create_task', label: 'Opprett oppgave', disabled: true, comingSoon: true },
];

export const ACTION_LABELS: Record<string, string> = {
  send_email: 'Send e-post',
  assign_to: 'Tildel ansvarlig',
  webhook: 'Send webhook',
  send_sms: 'Send SMS',
  create_task: 'Opprett oppgave',
};

export const ruleFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Navn er påkrevd').max(100, 'Maks 100 tegn'),
    description: z.string().max(300, 'Maks 300 tegn').nullable().optional(),
    is_active: z.boolean(),
    trigger_type: z.enum(['stage_entered', 'application_created']),
    trigger_config: z.record(z.unknown()).default({}),
    action_type: z.enum(['send_email', 'assign_to', 'webhook']),
    action_config: z.record(z.unknown()).default({}),
  })
  .superRefine((data, ctx) => {
    if (data.trigger_type === 'stage_entered' && !data.trigger_config.stage_id) {
      ctx.addIssue({
        path: ['trigger_config', 'stage_id'],
        code: 'custom',
        message: 'Velg en fase',
      });
    }
    if (data.action_type === 'send_email' && !data.action_config.template_id) {
      ctx.addIssue({
        path: ['action_config', 'template_id'],
        code: 'custom',
        message: 'Velg en mal',
      });
    }
    if (data.action_type === 'assign_to' && !data.action_config.user_id) {
      ctx.addIssue({
        path: ['action_config', 'user_id'],
        code: 'custom',
        message: 'Velg en bruker',
      });
    }
    if (data.action_type === 'webhook') {
      const url = data.action_config.url;
      if (!url || typeof url !== 'string') {
        ctx.addIssue({
          path: ['action_config', 'url'],
          code: 'custom',
          message: 'URL er påkrevd',
        });
      } else {
        try {
          const parsed = new URL(url);
          if (parsed.protocol !== 'https:') {
            ctx.addIssue({
              path: ['action_config', 'url'],
              code: 'custom',
              message: 'URL må starte med https://',
            });
          }
        } catch {
          ctx.addIssue({
            path: ['action_config', 'url'],
            code: 'custom',
            message: 'Ugyldig URL',
          });
        }
      }
    }
  });

export type RuleFormValues = z.infer<typeof ruleFormSchema>;

export const NEW_RULE_DEFAULTS: RuleFormValues = {
  name: '',
  description: '',
  is_active: true,
  trigger_type: 'stage_entered',
  trigger_config: {},
  action_type: 'send_email',
  action_config: {},
};

export interface RuleLookups {
  stages: Array<{ id: string; name: string; color?: string }>;
  positions: Array<{ id: string; title: string }>;
  templates: Array<{ id: string; name: string; subject: string }>;
  users: Array<{ id: string; full_name: string | null; role: string }>;
}

export function formatTriggerSummary(rule: AutomationRule, lookups: RuleLookups): string {
  if (rule.trigger_type === 'stage_entered') {
    const stageId = rule.trigger_config?.stage_id as string | undefined;
    const stage = lookups.stages.find((s) => s.id === stageId);
    return `Når søker går til '${stage?.name ?? stageId ?? '?'}'`;
  }
  if (rule.trigger_type === 'application_created') {
    const positionId = rule.trigger_config?.position_id as string | undefined;
    if (!positionId) return 'Når ny søknad opprettes';
    const position = lookups.positions.find((p) => p.id === positionId);
    return `Når ny søknad til '${position?.title ?? positionId}'`;
  }
  return TRIGGER_LABELS[rule.trigger_type as TriggerType] ?? rule.trigger_type;
}

export function formatActionSummary(rule: AutomationRule, lookups: RuleLookups): string {
  switch (rule.action_type) {
    case 'send_email': {
      const tplId = rule.action_config?.template_id as string | undefined;
      const tpl = lookups.templates.find((t) => t.id === tplId);
      return `Send e-post: '${tpl?.name ?? tplId ?? '?'}'`;
    }
    case 'assign_to': {
      const userId = rule.action_config?.user_id as string | undefined;
      const user = lookups.users.find((u) => u.id === userId);
      return `Tildel til ${user?.full_name ?? userId ?? '?'}`;
    }
    case 'webhook': {
      const url = rule.action_config?.url as string | undefined;
      try {
        return `Webhook → ${url ? new URL(url).hostname : '?'}`;
      } catch {
        return 'Webhook';
      }
    }
    default:
      return ACTION_LABELS[rule.action_type] ?? rule.action_type;
  }
}
