import React from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useUpdateApplicationStage } from './useApplicantProfile';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  applicantName: string;
  applicantId: string;
  applicationId: string | null;
  fromStageId: string;
  toStageId: string;
  toStageName: string;
}

type Notify = 'email' | 'sms' | 'both' | 'skip';

const MoveStageDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  applicantName,
  applicantId,
  applicationId,
  fromStageId,
  toStageId,
  toStageName,
}) => {
  const mut = useUpdateApplicationStage();

  const handle = async (notify: Notify) => {
    if (!applicationId) {
      toast.error('Ingen aktiv søknad å flytte');
      return;
    }
    try {
      await mut.mutateAsync({
        applicationId,
        applicantId,
        fromStageId,
        toStageId,
        notify,
      });
      toast.success(`Søker flyttet til ${toStageName}`);
      onOpenChange(false);
    } catch {
      // toast in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Flytt {applicantName} til {toStageName}?
          </DialogTitle>
          <DialogDescription>Vil du varsle søkeren?</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-wrap gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => handle('email')} disabled={mut.isPending}>
            E-post
          </Button>
          <Button variant="outline" onClick={() => handle('sms')} disabled={mut.isPending}>
            SMS
          </Button>
          <Button variant="outline" onClick={() => handle('both')} disabled={mut.isPending}>
            Begge
          </Button>
          <Button onClick={() => handle('skip')} disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="animate-spin" />}
            Hopp over
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MoveStageDialog;
