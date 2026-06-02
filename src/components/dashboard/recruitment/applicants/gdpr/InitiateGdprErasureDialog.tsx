import React, { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useInitiateGdprErasure } from '@/hooks/recruitment/useGdprRequests';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicantId: string;
  applicantName: string;
}

const InitiateGdprErasureDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  applicantId,
  applicantName,
}) => {
  const [nameInput, setNameInput] = useState('');
  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const mutation = useInitiateGdprErasure();

  const normalized = applicantName.trim();
  const nameMatches = nameInput.trim().toLowerCase() === normalized.toLowerCase() && !!normalized;

  const reset = () => {
    setNameInput('');
    setReason('');
    setAcknowledged(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && !mutation.isPending) reset();
    onOpenChange(next);
  };

  const canConfirm = nameMatches && acknowledged && !mutation.isPending;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    try {
      await mutation.mutateAsync({
        applicant_id: applicantId,
        confirm: true,
        reason: reason.trim() || undefined,
      });
      reset();
      onOpenChange(false);
    } catch {
      // toast handled in hook
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">
            Slette kandidat permanent?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Du er i ferd med å utføre en GDPR artikkel 17-sletting av{' '}
              <strong className="text-foreground">{normalized}</strong>. Dette anonymiserer
              alle personopplysninger umiddelbart og kan <strong>ikke</strong> reverseres.
            </span>
            <span className="block text-xs text-muted-foreground">
              Revisjonslogg, hendelser, scoring-historikk og aggregerte data bevares uten
              kobling til personnavn. Inngående meldinger fra kandidaten anonymiseres.
              Filer fjernes fra lagring.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gdpr-erase-name">
              Skriv kandidatens fulle navn for å bekrefte:
            </Label>
            <Input
              id="gdpr-erase-name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder={normalized}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gdpr-erase-reason">Begrunnelse (valgfritt)</Label>
            <Textarea
              id="gdpr-erase-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="F.eks. «Sletteforespørsel mottatt 02.06.2026»"
              rows={2}
              maxLength={500}
            />
          </div>

          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={acknowledged}
              onCheckedChange={(v) => setAcknowledged(v === true)}
              className="mt-0.5"
            />
            <span>
              Jeg bekrefter at sletting er nødvendig og at handlingen ikke kan angres.
            </span>
          </label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Avbryt</AlertDialogCancel>
          <AlertDialogAction
            disabled={!canConfirm}
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {mutation.isPending ? 'Sletter…' : 'Slett permanent'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default InitiateGdprErasureDialog;
