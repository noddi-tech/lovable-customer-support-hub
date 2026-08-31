import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCaseResolutionCodes, useUpdateCase, type CaseRecord } from '@/hooks/useCases';

interface CloseCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: CaseRecord;
  targetStatus?: 'resolved' | 'closed';
}

export function CloseCaseDialog({ open, onOpenChange, record, targetStatus = 'resolved' }: CloseCaseDialogProps) {
  const { data: codes = [] } = useCaseResolutionCodes();
  const updateCase = useUpdateCase();
  const [codeId, setCodeId] = useState(record.resolution_code_id ?? '');
  const [notes, setNotes] = useState(record.resolution_notes ?? '');

  useEffect(() => {
    if (open) {
      setCodeId(record.resolution_code_id ?? '');
      setNotes(record.resolution_notes ?? '');
    }
  }, [open, record.resolution_code_id, record.resolution_notes]);

  const handleSubmit = async () => {
    if (!codeId) return;
    await updateCase.mutateAsync({
      id: record.id,
      updates: {
        status: targetStatus,
        resolution_code_id: codeId,
        resolution_notes: notes.trim() || null,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md">
        <DialogHeader>
          <DialogTitle>{targetStatus === 'closed' ? 'Close case' : 'Resolve case'}</DialogTitle>
          <DialogDescription>
            A resolution code is required so we can report on why customers contact us and how issues end.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Resolution code</Label>
            <Select value={codeId} onValueChange={setCodeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a resolution" />
              </SelectTrigger>
              <SelectContent>
                {codes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="resolution-notes">Notes</Label>
            <Textarea
              id="resolution-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was the outcome for the customer?"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!codeId || updateCase.isPending}>
            {targetStatus === 'closed' ? 'Close case' : 'Resolve case'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
