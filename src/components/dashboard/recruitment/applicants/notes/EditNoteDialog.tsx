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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateApplicantNote } from '../hooks/useUpdateApplicantNote';

const NOTE_TYPES = [
  { value: 'internal', label: 'Internt notat' },
  { value: 'interview_feedback', label: 'Intervjufeedback' },
  { value: 'private', label: 'Privat' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: {
    id: string;
    applicant_id: string;
    application_id: string | null;
    content: string;
    note_type: string;
  } | null;
}

const EditNoteDialog: React.FC<Props> = ({ open, onOpenChange, note }) => {
  const updateMut = useUpdateApplicantNote();
  const [content, setContent] = useState('');
  const [type, setType] = useState('internal');

  useEffect(() => {
    if (open && note) {
      setContent(note.content);
      setType(note.note_type);
    }
  }, [open, note]);

  const submit = async () => {
    if (!note || !content.trim()) return;
    try {
      await updateMut.mutateAsync({
        noteId: note.id,
        applicantId: note.applicant_id,
        applicationId: note.application_id,
        content: content.trim(),
        note_type: type,
      });
      onOpenChange(false);
    } catch {
      // toast handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rediger notat</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            emojiAutocomplete={false}
          />
          <div className="space-y-2">
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTE_TYPES.map((n) => (
                  <SelectItem key={n.value} value={n.value}>
                    {n.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateMut.isPending}>
            Avbryt
          </Button>
          <Button onClick={submit} disabled={!content.trim() || updateMut.isPending}>
            {updateMut.isPending && <Loader2 className="animate-spin" />}
            Lagre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditNoteDialog;
