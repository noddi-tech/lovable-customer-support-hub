import React from 'react';
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
import { useDeleteApplicantNote } from '../hooks/useDeleteApplicantNote';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: {
    id: string;
    applicant_id: string;
    application_id: string | null;
    content: string;
  } | null;
}

const DeleteNoteConfirmDialog: React.FC<Props> = ({ open, onOpenChange, note }) => {
  const deleteMut = useDeleteApplicantNote();

  const confirm = async () => {
    if (!note) return;
    try {
      await deleteMut.mutateAsync({
        noteId: note.id,
        applicantId: note.applicant_id,
        applicationId: note.application_id,
        preview: note.content,
      });
      onOpenChange(false);
    } catch {
      // hook toasts
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Slett notat?</AlertDialogTitle>
          <AlertDialogDescription>
            Notatet slettes permanent. Hendelsen logges i revisjonsloggen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMut.isPending}>Avbryt</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteMut.isPending}
            onClick={(e) => {
              e.preventDefault();
              void confirm();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Slett
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteNoteConfirmDialog;
