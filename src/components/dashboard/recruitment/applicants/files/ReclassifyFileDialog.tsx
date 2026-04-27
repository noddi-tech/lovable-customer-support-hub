import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useReclassifyApplicantFile } from '../hooks/useReclassifyApplicantFile';

const FILE_TYPES = [
  { value: 'resume', label: 'CV' },
  { value: 'cover_letter', label: 'Søknadsbrev' },
  { value: 'drivers_license', label: 'Førerkort' },
  { value: 'certification', label: 'Sertifikat' },
  { value: 'id_document', label: 'ID-dokument' },
  { value: 'other', label: 'Annet' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicantId: string;
  file: {
    id: string;
    file_name: string;
    file_type: string;
  } | null;
}

const ReclassifyFileDialog: React.FC<Props> = ({ open, onOpenChange, applicantId, file }) => {
  const reclassifyMut = useReclassifyApplicantFile();
  const [type, setType] = useState('resume');

  useEffect(() => {
    if (open && file) setType(file.file_type);
  }, [open, file]);

  const submit = async () => {
    if (!file || type === file.file_type) {
      onOpenChange(false);
      return;
    }
    try {
      await reclassifyMut.mutateAsync({
        fileId: file.id,
        applicantId,
        file_type: type,
      });
      onOpenChange(false);
    } catch {
      // hook toasts
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Endre filtype</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-xs">{file?.file_name}</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={reclassifyMut.isPending}>
            Avbryt
          </Button>
          <Button onClick={submit} disabled={reclassifyMut.isPending}>
            {reclassifyMut.isPending && <Loader2 className="animate-spin" />}
            Lagre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReclassifyFileDialog;
