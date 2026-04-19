import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  templateName: string;
  onClose: () => void;
  onConfirm: () => void;
  isPending?: boolean;
}

export function PermanentDeleteDialog({ open, templateName, onClose, onConfirm, isPending }: Props) {
  const [typed, setTyped] = useState('');
  const matches = typed.trim() === templateName.trim() && templateName.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setTyped('');
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Slett mal permanent?</DialogTitle>
          <DialogDescription>
            Denne handlingen kan ikke angres. Malen og tilhørende metadata slettes
            permanent. Historiske revisjonsoppføringer beholdes. Skriv navnet på
            malen for å bekrefte:
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="confirm-name" className="text-xs">
            Navn på mal: <code className="font-mono">{templateName}</code>
          </Label>
          <Input
            id="confirm-name"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Skriv navnet her..."
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Avbryt
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!matches || isPending}
            onClick={onConfirm}
          >
            {isPending ? 'Sletter...' : 'Slett permanent'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
