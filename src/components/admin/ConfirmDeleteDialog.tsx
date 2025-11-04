import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  itemName?: string;
  isLoading?: boolean;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = 'DELETE',
  itemName,
  isLoading = false,
}: ConfirmDeleteDialogProps) {
  const [confirmInput, setConfirmInput] = useState('');

  const handleConfirm = () => {
    if (itemName) {
      if (confirmInput === itemName) {
        onConfirm();
        setConfirmInput('');
      }
    } else if (confirmInput === confirmText) {
      onConfirm();
      setConfirmInput('');
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setConfirmInput('');
    }
    onOpenChange(open);
  };

  const isConfirmValid = itemName ? confirmInput === itemName : confirmInput === confirmText;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-xl">{title}</DialogTitle>
              <DialogDescription className="mt-1">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-sm text-destructive font-medium mb-2">⚠️ This action cannot be undone</p>
            <p className="text-sm text-muted-foreground">
              This will permanently delete this item and all associated data.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-input">
              Type <span className="font-mono font-bold">{itemName || confirmText}</span> to confirm
            </Label>
            <Input
              id="confirm-input"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={itemName || confirmText}
              className="font-mono"
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmValid || isLoading}
          >
            {isLoading ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
