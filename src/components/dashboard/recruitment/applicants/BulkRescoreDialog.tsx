import { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useBulkScore } from '@/hooks/recruitment/useBulkScore';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  applicantIds: string[];
  onClose: () => void;
}

/** Bulk re-score dialog.
 *
 *  Mirrors the send_email pattern: callers pass applicant_ids and we resolve
 *  to application_ids client-side, then feed useBulkScore. Sequential enqueue
 *  keeps load predictable for the OpenAI rate budget.
 */
const BulkRescoreDialog: React.FC<Props> = ({ open, applicantIds, onClose }) => {
  const bulk = useBulkScore();
  const [resolving, setResolving] = useState(false);
  const N = applicantIds.length;

  useEffect(() => {
    if (!open) bulk.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const confirm = async () => {
    setResolving(true);
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('id, applicant_id')
        .in('applicant_id', applicantIds);
      if (error) throw error;
      const ids = (data ?? []).map((r: any) => r.id as string);
      if (ids.length === 0) {
        toast.error('Ingen tilknyttede stillinger funnet for de valgte søkerne');
        return;
      }
      setResolving(false);
      const result = await bulk.mutateAsync({
        application_ids: ids,
        trigger_reason: 're_run',
      });
      if (result.failed > 0) {
        toast.error(
          `${result.queued} satt i kø, ${result.skipped} hoppet over, ${result.failed} feilet.`,
        );
      } else {
        toast.success(
          `${result.queued} satt i kø${result.skipped ? `, ${result.skipped} allerede ventende` : ''}.`,
        );
      }
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? 'Kunne ikke starte re-scoring');
    } finally {
      setResolving(false);
    }
  };

  const loading = resolving || bulk.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Re-score {N} søkere?
          </DialogTitle>
          <DialogDescription>
            AI vurderer hver søker på nytt mot stillingens kriterier. Søkere uten tilknyttet
            stilling hoppes over.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Avbryt
          </Button>
          <Button onClick={confirm} disabled={loading}>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Start re-scoring
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkRescoreDialog;
