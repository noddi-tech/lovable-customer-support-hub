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
import { useDeleteApplicantFile } from '../hooks/useDeleteApplicantFile';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicantId: string;
  applicationId: string | null;
  file: {
    id: string;
    file_name: string;
    file_type: string;
    storage_path: string;
  } | null;
}

const DeleteFileConfirmDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  applicantId,
  applicationId,
  file,
}) => {
  const deleteMut = useDeleteApplicantFile();

  const confirm = async () => {
    if (!file) return;
    try {
      await deleteMut.mutateAsync({
        fileId: file.id,
        applicantId,
        applicationId,
        storagePath: file.storage_path,
        fileName: file.file_name,
        fileType: file.file_type,
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
          <AlertDialogTitle>Slett fil?</AlertDialogTitle>
          <AlertDialogDescription>
            «{file?.file_name}» slettes permanent fra både lagring og databasen.
            Hendelsen logges i revisjonsloggen.
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

export default DeleteFileConfirmDialog;
