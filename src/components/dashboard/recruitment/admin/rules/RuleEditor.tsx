import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  ruleFormSchema,
  type RuleFormValues,
  type AutomationRule,
  type ActionType,
  type TriggerType,
  NEW_RULE_DEFAULTS,
} from './types';
import { TriggerConfigSection } from './sections/TriggerConfigSection';
import { ActionConfigSection } from './sections/ActionConfigSection';
import { useRuleMutations } from './hooks/useRuleMutations';

export type EditorState =
  | { mode: 'create' }
  | { mode: 'edit'; rule: AutomationRule }
  | null;

interface Props {
  state: EditorState;
  onClose: () => void;
}

export function RuleEditor({ state, onClose }: Props) {
  const open = state !== null;
  const { createRule, updateRule } = useRuleMutations();

  const defaultValues = useMemo<RuleFormValues>(() => {
    if (!state || state.mode === 'create') return NEW_RULE_DEFAULTS;
    const r = state.rule;
    return {
      name: r.name ?? '',
      description: r.description ?? '',
      is_active: r.is_active,
      trigger_type: (r.trigger_type as TriggerType) ?? 'stage_entered',
      trigger_config: (r.trigger_config as Record<string, unknown>) ?? {},
      action_type: (r.action_type as ActionType) ?? 'send_email',
      action_config: (r.action_config as Record<string, unknown>) ?? {},
    };
  }, [state]);

  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  useEffect(() => {
    if (open) form.reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultValues]);

  const watched = form.watch();
  const isSaving = createRule.isPending || updateRule.isPending;

  const onSubmit = (values: RuleFormValues) => {
    if (!state) return;
    if (state.mode === 'create') {
      createRule.mutate(values, {
        onSuccess: () => {
          toast.success('Regel opprettet');
          setTimeout(() => onClose(), 0);
        },
        onError: (e: any) => toast.error(e?.message ?? 'Kunne ikke opprette regel'),
      });
    } else {
      updateRule.mutate(
        { id: state.rule.id, values },
        {
          onSuccess: () => {
            toast.success('Regel lagret');
            setTimeout(() => onClose(), 0);
          },
          onError: (e: any) => toast.error(e?.message ?? 'Kunne ikke lagre regel'),
        },
      );
    }
  };

  const handleTriggerTypeChange = (value: TriggerType) => {
    form.setValue('trigger_type', value, { shouldDirty: true, shouldValidate: true });
    form.setValue('trigger_config', {}, { shouldDirty: true, shouldValidate: true });
  };

  const handleActionTypeChange = (value: ActionType) => {
    form.setValue('action_type', value, { shouldDirty: true, shouldValidate: true });
    form.setValue('action_config', {}, { shouldDirty: true, shouldValidate: true });
  };

  const triggerErrors = (form.formState.errors as any).trigger_config;
  const actionErrors = (form.formState.errors as any).action_config;

  const headerTitle =
    state?.mode === 'edit' ? `Rediger regel: ${state.rule.name}` : 'Ny regel';

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl p-0 flex flex-col gap-0"
      >
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle className="pr-8">{headerTitle}</SheetTitle>
        </SheetHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-5">
            {/* Navn */}
            <div className="space-y-1.5">
              <Label htmlFor="rule-name" className="text-xs font-medium">
                Navn <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rule-name"
                {...form.register('name')}
                placeholder="f.eks. 'Send velkomstmail ved kvalifisering'"
                maxLength={100}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            {/* Beskrivelse */}
            <div className="space-y-1.5">
              <Label htmlFor="rule-desc" className="text-xs font-medium">
                Beskrivelse
              </Label>
              <Textarea
                id="rule-desc"
                rows={3}
                maxLength={300}
                emojiAutocomplete={false}
                value={watched.description ?? ''}
                onChange={(e) =>
                  form.setValue('description', e.target.value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                placeholder="Valgfri beskrivelse av hva regelen gjør..."
              />
              {form.formState.errors.description && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>

            {/* Aktiv */}
            <div className="flex items-start justify-between rounded-md border border-input bg-background px-3 py-2">
              <div className="space-y-0.5">
                <Label htmlFor="rule-active" className="text-xs font-medium">
                  Aktiv
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Inaktive regler kjøres ikke selv når utløseren matcher.
                </p>
              </div>
              <Switch
                id="rule-active"
                checked={watched.is_active}
                onCheckedChange={(v) =>
                  form.setValue('is_active', v, { shouldDirty: true })
                }
              />
            </div>

            <Separator />

            <TriggerConfigSection
              triggerType={watched.trigger_type}
              triggerConfig={watched.trigger_config ?? {}}
              onTriggerTypeChange={handleTriggerTypeChange}
              onTriggerConfigChange={(cfg) =>
                form.setValue('trigger_config', cfg, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              errors={triggerErrors}
            />

            <Separator />

            <ActionConfigSection
              actionType={watched.action_type}
              actionConfig={watched.action_config ?? {}}
              onActionTypeChange={handleActionTypeChange}
              onActionConfigChange={(cfg) =>
                form.setValue('action_config', cfg, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              errors={actionErrors}
            />
          </div>

          <div className="border-t bg-background px-6 py-3 flex items-center justify-end gap-2 shrink-0">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              <X />
              Avbryt
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!form.formState.isValid || isSaving}
            >
              {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
              {isSaving ? 'Lagrer...' : 'Lagre'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
