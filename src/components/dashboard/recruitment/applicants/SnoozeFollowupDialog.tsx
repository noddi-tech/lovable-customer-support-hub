import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSnoozeFollowup } from '@/hooks/recruitment/useFollowups';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  followupId: string;
}

function isoOffsetDays(days: number, hour = 9): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function nextMonday(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun..6=Sat
  const offset = ((1 - day + 7) % 7) || 7;
  d.setDate(d.getDate() + offset);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

function defaultCustom(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
}

export default function SnoozeFollowupDialog({ open, onOpenChange, followupId }: Props) {
  const snooze = useSnoozeFollowup();
  const [custom, setCustom] = useState<string>(defaultCustom());
  const [showCustom, setShowCustom] = useState(false);

  const choose = async (iso: string) => {
    await snooze.mutateAsync({ id: followupId, snoozed_to: iso });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Utsett påminnelse</DialogTitle>
        </DialogHeader>
        {!showCustom ? (
          <div className="grid grid-cols-1 gap-2">
            <Button variant="outline" onClick={() => choose(isoOffsetDays(1))}>I morgen</Button>
            <Button variant="outline" onClick={() => choose(isoOffsetDays(3))}>Om 3 dager</Button>
            <Button variant="outline" onClick={() => choose(nextMonday())}>Neste mandag</Button>
            <Button variant="ghost" onClick={() => setShowCustom(true)}>Tilpasset…</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Label htmlFor="snooze-custom">Velg tidspunkt</Label>
            <Input
              id="snooze-custom"
              type="datetime-local"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCustom(false)}>Tilbake</Button>
              <Button onClick={() => choose(new Date(custom).toISOString())} disabled={snooze.isPending}>
                Utsett
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
