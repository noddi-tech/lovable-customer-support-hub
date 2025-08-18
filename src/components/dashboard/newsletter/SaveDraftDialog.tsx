import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { useNewsletterStore } from './useNewsletterStore';

interface SaveDraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SaveDraftDialog: React.FC<SaveDraftDialogProps> = ({
  open,
  onOpenChange
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { blocks, globalStyles } = useNewsletterStore();
  
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: t('error'),
        description: t('titleRequired'),
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    
    try {
      // TODO: Save to Supabase
      const newsletterData = {
        title: title.trim(),
        subject: subject.trim(),
        description: description.trim(),
        content: { blocks },
        global_styles: globalStyles,
        status: 'draft'
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: t('draftSaved'),
        description: t('draftSavedSuccessfully'),
      });

      onOpenChange(false);
      setTitle('');
      setSubject('');
      setDescription('');
    } catch (error) {
      toast({
        title: t('error'),
        description: t('failedToSaveDraft'),
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('saveDraft')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">{t('title')} *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('enterNewsletterTitle')}
            />
          </div>

          <div>
            <Label htmlFor="subject">{t('emailSubject')}</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('enterEmailSubject')}
            />
          </div>

          <div>
            <Label htmlFor="description">{t('description')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('enterDescription')}
              rows={3}
            />
          </div>

          <div className="text-sm text-muted-foreground">
            <p>{t('blocksCount')}: {blocks.length}</p>
            <p>{t('status')}: {t('draft')}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? t('saving') : t('saveDraft')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};