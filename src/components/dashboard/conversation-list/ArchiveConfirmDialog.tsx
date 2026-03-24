import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Archive, CheckCircle } from "lucide-react";

interface ArchiveConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nonClosedCount: number;
  totalCount: number;
  onArchiveOnly: () => void;
  onArchiveAndClose: () => void;
}

export const ArchiveConfirmDialog = ({
  open,
  onOpenChange,
  nonClosedCount,
  totalCount,
  onArchiveOnly,
  onArchiveAndClose,
}: ArchiveConfirmDialogProps) => {
  const isSingle = totalCount === 1;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Archive {isSingle ? "conversation" : `${totalCount} conversations`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isSingle
              ? "This conversation is not closed yet. Would you like to close it as well?"
              : `${nonClosedCount} of ${totalCount} selected conversations are not closed. Would you like to close them as well?`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="outline"
            onClick={() => {
              onArchiveOnly();
              onOpenChange(false);
            }}
          >
            <Archive className="h-4 w-4 mr-2" />
            Archive Only
          </Button>
          <Button
            onClick={() => {
              onArchiveAndClose();
              onOpenChange(false);
            }}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Archive & Close
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
