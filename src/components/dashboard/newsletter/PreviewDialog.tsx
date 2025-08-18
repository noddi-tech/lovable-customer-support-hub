import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Monitor, Smartphone, Moon, Sun, Download, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NewsletterBlock } from '../NewsletterBuilder';
import { NewsletterBlockRenderer } from './NewsletterBlockRenderer';
import { cn } from '@/lib/utils';

interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blocks: NewsletterBlock[];
  globalStyles: any;
  device: 'desktop' | 'mobile';
  darkMode: boolean;
}

export const PreviewDialog: React.FC<PreviewDialogProps> = ({
  open,
  onOpenChange,
  blocks,
  globalStyles,
  device,
  darkMode
}) => {
  const { t } = useTranslation();
  const [previewDevice, setPreviewDevice] = React.useState(device);
  const [previewDarkMode, setPreviewDarkMode] = React.useState(darkMode);

  const canvasMaxWidth = previewDevice === 'mobile' ? '375px' : globalStyles.maxWidth || '600px';

  React.useEffect(() => {
    setPreviewDevice(device);
    setPreviewDarkMode(darkMode);
  }, [device, darkMode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{t('newsletterPreview')}</DialogTitle>
            <div className="flex items-center gap-2">
              <div className="flex rounded-md border overflow-hidden">
                <Button
                  variant={previewDevice === 'desktop' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewDevice('desktop')}
                  className="h-8 rounded-none"
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  variant={previewDevice === 'mobile' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewDevice('mobile')}
                  className="h-8 rounded-none"
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewDarkMode(!previewDarkMode)}
                className="h-8"
              >
                {previewDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <Button variant="outline" size="sm" className="h-8 gap-2">
                <Download className="h-4 w-4" />
                {t('exportHTML')}
              </Button>
              <Button variant="default" size="sm" className="h-8 gap-2">
                <Send className="h-4 w-4" />
                {t('sendTest')}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-muted/20 p-8">
          <div className="mx-auto" style={{ maxWidth: canvasMaxWidth }}>
            <div
              className={cn(
                "bg-background border rounded-lg shadow-sm min-h-96",
                previewDarkMode && "bg-gray-900 text-white"
              )}
              style={{
                backgroundColor: previewDarkMode ? '#1a1a1a' : globalStyles.backgroundColor,
                fontFamily: globalStyles.fontFamily,
                fontSize: globalStyles.fontSize
              }}
            >
              {blocks.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <p className="text-lg mb-2">{t('emptyNewsletter')}</p>
                  <p className="text-sm">{t('addBlocksToPreview')}</p>
                </div>
              ) : (
                <div className="p-4">
                  {blocks.map((block) => (
                    <div key={block.id} className="mb-2">
                      <NewsletterBlockRenderer block={block} isDarkMode={previewDarkMode} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};