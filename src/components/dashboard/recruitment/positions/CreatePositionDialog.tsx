import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import PositionForm from './PositionForm';
import type { JobPositionDetail } from './usePositions';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position?: JobPositionDetail | null;
  /** When true and creating a new position, status is set to 'open' instead of 'draft'. */
  publishImmediately?: boolean;
  /** Called with the created/updated position id after success. */
  onCreated?: (id: string) => void;
}

const CreatePositionDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  position,
  publishImmediately,
  onCreated,
}) => {
  const isEdit = !!position;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Rediger stilling' : 'Opprett stilling'}</DialogTitle>
        </DialogHeader>
        <PositionForm
          mode={isEdit ? 'edit' : 'create'}
          position={position ?? null}
          publishImmediately={publishImmediately}
          onCancel={() => onOpenChange(false)}
          onSubmitted={(id) => {
            onOpenChange(false);
            onCreated?.(id);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default CreatePositionDialog;
