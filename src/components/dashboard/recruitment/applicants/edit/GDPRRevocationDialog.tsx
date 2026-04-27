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

const REQUIRED_PHRASE = 'I forstår at samtykke trekkes';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
}

const GDPRRevocationDialog: React.FC<Props> = ({ open, onOpenChange, onConfirm, isPending }) => {
  const [text, setText] = useState('');

  const handleOpenChange = (next: boolean) => {
    if (!next) setText('');
    onOpenChange(next);
  };

  const matches = text === REQUIRED_PHRASE;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Trekke GDPR-samtykke?</AlertDialogTitle>
          <AlertDialogDescription>
            Du er i ferd med å trekke samtykket fra denne søkeren. Dette er en juridisk
            hendelse som logges i revisjonsloggen. Vurder om du heller burde slette søkeren
            permanent.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="gdpr-confirm">
            Skriv «{REQUIRED_PHRASE}» for å bekrefte:
          </Label>
          <Input
            id="gdpr-confirm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoComplete="off"
            placeholder={REQUIRED_PHRASE}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Avbryt</AlertDialogCancel>
          <AlertDialogAction
            disabled={!matches || isPending}
            onClick={(e) => {
              e.preventDefault();
              if (!matches) return;
              onConfirm();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Trekke samtykke
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default GDPRRevocationDialog;
