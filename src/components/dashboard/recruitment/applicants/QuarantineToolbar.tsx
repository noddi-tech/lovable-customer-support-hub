import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuarantineApprove } from '@/hooks/recruitment/useQuarantineApprove';
import { useApplicantPipeline } from './useApplicants';

interface Props {
  selectedIds: string[];
  onClear: () => void;
}

export function QuarantineToolbar({ selectedIds, onClear }: Props) {
  const approve = useQuarantineApprove();
  const { data: pipeline } = useApplicantPipeline();
  const { toast } = useToast();
  const [stageId, setStageId] = useState<string>('');

  const handleApprove = async () => {
    try {
      const res = await approve.mutateAsync({
        applicant_ids: selectedIds,
        target_stage_id: stageId || null,
      });
      toast({ title: `Godkjente ${res.approved} søkere` });
      onClear();
    } catch (e: any) {
      toast({ title: 'Godkjenning feilet', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <div className="sticky bottom-4 z-30 mx-auto w-full max-w-3xl rounded-lg border bg-background shadow-lg p-3 flex items-center gap-3">
      <span className="text-sm font-medium">{selectedIds.length} valgt</span>
      <div className="flex-1" />
      <Select value={stageId} onValueChange={setStageId}>
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Flytt til steg (valgfritt)" />
        </SelectTrigger>
        <SelectContent>
          {(pipeline?.stages ?? []).map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" variant="ghost" onClick={onClear}>
        <X className="h-4 w-4 mr-1" />
        Avbryt
      </Button>
      <Button size="sm" onClick={handleApprove} disabled={approve.isPending}>
        <Check className="h-4 w-4 mr-1" />
        Godkjenn valgte ({selectedIds.length})
      </Button>
    </div>
  );
}
