import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { DryRunResultCard } from './DryRunResultCard';
import type { DryRunResult, DryRunTriggerType } from './types';
import { TRIGGER_LABELS } from '../types';

interface Props {
  status: 'idle' | 'pending' | 'success' | 'error';
  errorMessage: string | null;
  results: DryRunResult[];
  triggerType: DryRunTriggerType;
}

export function DryRunResults({ status, errorMessage, results, triggerType }: Props) {
  if (status === 'idle') {
    return (
      <Card className="flex min-h-[120px] items-center justify-center px-6 py-8 text-sm text-muted-foreground">
        Resultatet vises her etter kjøring.
      </Card>
    );
  }

  if (status === 'pending') {
    return (
      <Card className="flex min-h-[120px] items-center justify-center gap-2 px-6 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Kjører test...
      </Card>
    );
  }

  if (status === 'error') {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Testkjøringen feilet</AlertTitle>
        <AlertDescription>
          {errorMessage ?? 'Kunne ikke kjøre testen. Prøv igjen om et øyeblikk.'}
        </AlertDescription>
      </Alert>
    );
  }

  if (results.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Ingen regler matchet dette scenariet</AlertTitle>
        <AlertDescription>
          Sjekk at minst én regel har type '{TRIGGER_LABELS[triggerType]}' og korrekt fase-konfigurasjon.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((result) => (
        <DryRunResultCard key={result.execution_id} result={result} />
      ))}
    </div>
  );
}
