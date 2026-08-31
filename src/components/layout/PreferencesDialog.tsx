import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from 'react-i18next';
import { LanguageSettings } from '@/components/settings/LanguageSettings';
import { TimezoneSettings } from '@/components/settings/TimezoneSettings';

interface PreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PreferencesDialog: React.FC<PreferencesDialogProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('header.settings', 'Settings')}</DialogTitle>
          <DialogDescription>
            {t('settings.generalDescription', 'Language and timezone preferences for your account.')}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-3">
          <div className="space-y-4">
            <LanguageSettings />
            <TimezoneSettings />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
