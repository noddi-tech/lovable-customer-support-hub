import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DryRunForm } from './DryRunForm';
import { DryRunResults } from './DryRunResults';
import { useDryRunMutation } from './hooks/useDryRunMutation';
import type { ApplicantSearchResult, DryRunResult, DryRunTriggerType } from './types';

export function DryRunPanel() {
  const [triggerType, setTriggerType] = useState<DryRunTriggerType>('stage_entered');
  const [stageId, setStageId] = useState<string | null>(null);
  const [applicant, setApplicant] = useState<ApplicantSearchResult | null>(null);
  const [results, setResults] = useState<DryRunResult[]>([]);
  const mutation = useDryRunMutation();

  const status = useMemo<'idle' | 'pending' | 'success' | 'error'>(() => {
    if (mutation.status === 'pending') return 'pending';
    if (mutation.status === 'error') return 'error';
    if (mutation.status === 'success') return 'success';
    return 'idle';
  }, [mutation.status]);

  const handleRun = () => {
    if (!applicant?.id) return;

    mutation.mutate(
      {
        triggerType,
        applicantId: applicant.id,
        stageId: triggerType === 'stage_entered' ? stageId : null,
      },
      {
        onSuccess: (data) => setResults(data),
      },
    );
  };

  const handleClear = () => {
    setTriggerType('stage_entered');
    setStageId(null);
    setApplicant(null);
    setResults([]);
    mutation.reset();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Test-kjøring av automatiseringsregler</CardTitle>
          <CardDescription>
            Simuler en utløser uten sideeffekter. Resultatet logges også i Utførelseslogg med Test-kjøring-badge.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DryRunForm
            triggerType={triggerType}
            stageId={stageId}
            applicant={applicant}
            isPending={mutation.isPending}
            onTriggerTypeChange={(value) => {
              setTriggerType(value);
              if (value !== 'stage_entered') setStageId(null);
            }}
            onStageChange={setStageId}
            onApplicantChange={setApplicant}
            onRun={handleRun}
            onClear={handleClear}
          />
        </CardContent>
      </Card>

      <DryRunResults
        status={status}
        errorMessage={mutation.error?.message ?? null}
        results={results}
        triggerType={triggerType}
      />
    </div>
  );
}
