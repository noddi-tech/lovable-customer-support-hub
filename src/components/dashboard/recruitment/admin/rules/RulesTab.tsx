import { useMemo, useState } from 'react';
import { Plus, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRules, useStagesForOrg, usePositionsForOrg, useActiveTemplatesForOrg, useAssignableUsersForOrg } from './hooks/useRules';
import { RulesList } from './RulesList';
import { RuleEditor, type EditorState } from './RuleEditor';
import type { RuleLookups } from './types';

export function RulesTab() {
  const { data: rules, isLoading } = useRules();
  const { data: stages } = useStagesForOrg();
  const { data: positions } = usePositionsForOrg();
  const { data: templates } = useActiveTemplatesForOrg();
  const { data: users } = useAssignableUsersForOrg();
  const [editorState, setEditorState] = useState<EditorState>(null);

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
        />
      )}

      <RuleEditor state={editorState} onClose={() => setEditorState(null)} />
    </div>
  );
}
