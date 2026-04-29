import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StepIndicator } from './StepIndicator';
import { Step1Prerequisites } from './Step1Prerequisites';
import { Step2SelectPage } from './Step2SelectPage';
import { Step3Permissions } from './Step3Permissions';
import { Step4Webhook } from './Step4Webhook';
import { Step5Forms } from './Step5Forms';
import type { MetaIntegration } from '../../types';

export type WizardStep = 1 | 2 | 3 | 4 | 5;
export type WizardMode = 'create' | 'reconnect';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: WizardMode;
  initialStep?: WizardStep;
  initialStateId?: string | null;
  existingIntegrationId?: string | null;
}

const STEPS = [
  { id: 1, label: 'Forhåndskrav' },
  { id: 2, label: 'Velg side' },
  { id: 3, label: 'Tilganger' },
  { id: 4, label: 'Aktiver webhook' },
  { id: 5, label: 'Skjemaer' },
];

export function MetaConnectionWizard({
  open,
  onOpenChange,
  mode,
  initialStep = 1,
  initialStateId = null,
  existingIntegrationId = null,
}: Props) {
  const [step, setStep] = useState<WizardStep>(initialStep);
  const [stateId, setStateId] = useState<string | null>(initialStateId);
  const [oauthSelection, setOauthSelection] = useState<{
    page_id: string;
    page_name: string;
    granted_scopes: string[];
  } | null>(null);
  const [flow, setFlow] = useState<'oauth' | 'manual'>('oauth');
  const [activeIntegration, setActiveIntegration] = useState<MetaIntegration | null>(null);

  // Reset internals whenever the wizard re-opens with new initial props.
  useEffect(() => {
    if (open) {
      setStep(initialStep);
      setStateId(initialStateId);
      setOauthSelection(null);
      setFlow(initialStateId ? 'oauth' : 'oauth');
      setActiveIntegration(null);
    }
  }, [open, initialStep, initialStateId]);

  const handleClose = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'reconnect' ? 'Koble til Meta-side på nytt' : 'Koble til Meta-side'}
          </DialogTitle>
          <DialogDescription>
            Sett opp automatisk mottak av søkere fra Facebook og Instagram Lead Ads.
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2 pb-4">
          <StepIndicator steps={STEPS} current={step} />
        </div>

        {step === 1 && (
          <Step1Prerequisites onNext={() => setStep(2)} onCancel={handleClose} />
        )}

        {step === 2 && (
          <Step2SelectPage
            mode={mode}
            existingIntegrationId={existingIntegrationId}
            stateId={stateId}
            onPickedOAuth={(sel) => {
              setStateId(sel.state_id);
              setOauthSelection({
                page_id: sel.page_id,
                page_name: sel.page_name,
                granted_scopes: sel.granted_scopes,
              });
              setFlow('oauth');
              setStep(3);
            }}
            onPickedManual={(integration) => {
              setActiveIntegration(integration);
              setFlow('manual');
              // Manual path skips the read-only scope display (we have no token introspection here).
              setStep(4);
            }}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <Step3Permissions
            grantedScopes={oauthSelection?.granted_scopes ?? []}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && (
          <Step4Webhook
            flow={flow}
            stateId={stateId}
            pageId={oauthSelection?.page_id ?? null}
            manualIntegrationId={activeIntegration?.id ?? null}
            onDone={(integration) => {
              setActiveIntegration(integration);
              setStep(5);
            }}
            onBack={() => setStep(flow === 'oauth' ? 3 : 2)}
          />
        )}

        {step === 5 && activeIntegration && (
          <Step5Forms
            integrationId={activeIntegration.id}
            onFinish={handleClose}
            onBack={() => setStep(4)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
