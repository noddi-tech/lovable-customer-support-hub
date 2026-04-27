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
import { SOURCE_OPTIONS } from './schema';

const labelFor = (v: string) => SOURCE_OPTIONS.find((o) => o.value === v)?.label ?? v;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromValue: string;
  toValue: string;
  onConfirm: () => void;
  isPending?: boolean;
}

const SourceChangeWarningDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  fromValue,
  toValue,
  onConfirm,
  isPending,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Endre kilde for søker?</AlertDialogTitle>
          <AlertDialogDescription>
            Endring av kilde påvirker analytikk i Revisjon → Analyse (Kilde-ROI).
            Endringen logges i revisjonsloggen. Endre fra «{labelFor(fromValue)}» til
            «{labelFor(toValue)}»?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Avbryt</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            Endre kilde
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SourceChangeWarningDialog;
