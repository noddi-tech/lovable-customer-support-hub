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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useInitiateGdprExport } from '@/hooks/recruitment/useGdprRequests';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicantId: string;
  applicantName: string;
}

const InitiateGdprExportDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  applicantId,
  applicantName,
}) => {
  const [reason, setReason] = useState('');
  const mutation = useInitiateGdprExport();

  const handleOpenChange = (next: boolean) => {
    if (!next && !mutation.isPending) setReason('');
    onOpenChange(next);
  };

  const handleConfirm = async () => {
    try {
      await mutation.mutateAsync({
        applicant_id: applicantId,
        reason: reason.trim() || undefined,
      });
      setReason('');
      onOpenChange(false);
    } catch {
      // toast handled in hook
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eksportere persondata?</AlertDialogTitle>
          <AlertDialogDescription>
            Du oppretter en GDPR-eksport (artikkel 15 + 20) for{' '}
            <strong className="text-foreground">{applicantName}</strong>. Eksporten
            inneholder all lagret informasjon om kandidaten i et nedlastbart ZIP-arkiv
            (JSON + PDF + filer). Lenken er gyldig i 7 dager.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="gdpr-export-reason">Begrunnelse (valgfritt)</Label>
          <Textarea
            id="gdpr-export-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="F.eks. «Innsynsforespørsel mottatt 02.06.2026»"
            rows={3}
            maxLength={500}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Avbryt</AlertDialogCancel>
          <AlertDialogAction
            disabled={mutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
          >
            {mutation.isPending ? 'Starter…' : 'Start eksport'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default InitiateGdprExportDialog;
