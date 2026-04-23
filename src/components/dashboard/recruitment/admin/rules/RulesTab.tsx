import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRules, useStagesForOrg, usePositionsForOrg, useActiveTemplatesForOrg, useAssignableUsersForOrg } from './hooks/useRules';
import { useRuleMutations } from './hooks/useRuleMutations';
import { RulesList } from './RulesList';
import { RuleEditor, type EditorState } from './RuleEditor';
import type { AutomationRule, RuleLookups } from './types';
import { ExecutionLogPanel } from './executions/ExecutionLogPanel';
import { DryRunPanel } from './dryrun/DryRunPanel';

export function RulesTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: rules, isLoading } = useRules();
  const { data: stages } = useStagesForOrg();
  const { data: positions } = usePositionsForOrg();
  const { data: templates } = useActiveTemplatesForOrg();
  const { data: users } = useAssignableUsersForOrg();
  const { deleteRule } = useRuleMutations();
  const [editorState, setEditorState] = useState<EditorState>(null);
  const [ruleToDelete, setRuleToDelete] = useState<AutomationRule | null>(null);
  const rawSubtab = searchParams.get('subtab');
  const subtab = rawSubtab === 'log' || rawSubtab === 'dry-run' ? rawSubtab : 'rules';

  const lookups = useMemo<RuleLookups>(
    () => ({
      stages: (stages ?? []).map((s) => ({ id: s.id, name: s.name, color: s.color })),
      positions: (positions ?? []).map((p) => ({ id: p.id, title: p.title })),
      templates: templates ?? [],
      users: users ?? [],
    }),
    [stages, positions, templates, users],
  );

  const hasRules = (rules?.length ?? 0) > 0;

  const handleConfirmDelete = () => {
    if (!ruleToDelete) return;

    deleteRule.mutate(ruleToDelete.id, {
      onSuccess: () => {
        toast.success('Regel slettet');
        setRuleToDelete(null);
      },
      onError: (e: any) => {
        toast.error(e?.message ?? 'Kunne ikke slette');
        setRuleToDelete(null);
      },
    });
  };

  const handleSubtabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'automation');
    next.set('subtab', value);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Automasjonsregler</h2>
          <p className="text-sm text-muted-foreground">
            Automatiske regler som kjører når hendelser skjer i søknadsflyten.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => setEditorState({ mode: 'create' })}
        >
          <Plus />
          Ny regel
        </Button>
      </div>

      <Tabs value={subtab} onValueChange={handleSubtabChange} className="w-full">
        <TabsList className="w-auto">
          <TabsTrigger value="rules">Regler</TabsTrigger>
          <TabsTrigger value="log">Utførelseslogg</TabsTrigger>
          <TabsTrigger value="dry-run">Test-kjøring</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          {isLoading ? (
            <Card className="flex items-center justify-center min-h-[200px] text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </Card>
          ) : !hasRules ? (
            <Card className="flex flex-col items-center justify-center text-center min-h-[300px] gap-3 py-10">
              <Zap className="h-10 w-10 text-muted-foreground opacity-40" />
              <div className="space-y-1 max-w-md">
                <h3 className="font-semibold">Ingen automasjonsregler ennå</h3>
                <p className="text-sm text-muted-foreground">
                  Opprett regler for å automatisk sende e-post, tildele ansvarlige,
                  eller varsle eksterne systemer når søkere beveger seg gjennom
                  rekrutteringsløpet.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setEditorState({ mode: 'create' })}
              >
                <Plus />
                Opprett første regel
              </Button>
            </Card>
          ) : (
            <RulesList
              rules={rules ?? []}
              lookups={lookups}
              onEdit={(rule) => setEditorState({ mode: 'edit', rule })}
              onRequestDelete={(rule) => setRuleToDelete(rule)}
            />
          )}
        </TabsContent>

        <TabsContent value="log">
          <ExecutionLogPanel />
        </TabsContent>

        <TabsContent value="dry-run">
          <DryRunPanel />
        </TabsContent>
      </Tabs>

      <RuleEditor state={editorState} onClose={() => setEditorState(null)} />

      <AlertDialog
        open={ruleToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setRuleToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett automasjonsregel?</AlertDialogTitle>
            <AlertDialogDescription>
              Dette vil slette '{ruleToDelete?.name}' permanent. Utførelseshistorikk
              bevares for revisjonsformål.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Slett regel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
