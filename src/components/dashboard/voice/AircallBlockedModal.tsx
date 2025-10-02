import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Shield, ExternalLink, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { aircallPhone } from '@/lib/aircall-phone';

interface AircallBlockedModalProps {
  isOpen: boolean;
  issues: string[];
  onRetry: () => void;
  onOpenIncognito: () => void;
  onSkip: () => void;
}

const AircallBlockedModalComponent: React.FC<AircallBlockedModalProps> = ({
  isOpen,
  issues,
  onRetry,
  onOpenIncognito,
  onSkip,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const hasNetworkBlock = issues.includes('network_blocked') || issues.includes('resources_blocked');
  const hasIframeBlock = issues.includes('no_iframe') || issues.includes('iframe_blocked');
  const hasTimeout = issues.includes('timeout');

  const handleQuickTest = () => {
    const testWindow = window.open('https://phone.aircall.io', '_blank');
    if (!testWindow) {
      toast({
        title: t('aircall.blocked.popupBlocked'),
        description: t('aircall.blocked.popupBlockedDesc'),
        variant: 'destructive'
      });
    }
  };

  const handleCopyDebugReport = async () => {
    try {
      const report = aircallPhone.getInitializationReport();
      await navigator.clipboard.writeText(report);
      toast({
        title: t('aircall.blocked.reportCopied'),
        description: t('aircall.blocked.reportCopiedDesc')
      });
    } catch (err) {
      console.error('Failed to copy report:', err);
      toast({
        title: t('common.error'),
        description: t('aircall.blocked.copyFailed'),
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent 
        className="sm:max-w-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">{t('aircall.blocked.title')}</DialogTitle>
              <DialogDescription className="mt-1">
                {t('aircall.blocked.subtitle')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Issue Explanation */}
        <Alert className="border-destructive/50 bg-destructive/5">
          <Shield className="h-4 w-4 text-destructive" />
          <AlertDescription className="ml-2">
            {hasNetworkBlock && (
              <>
                <strong>{t('aircall.blocked.networkTitle')}</strong>
                <br />
                {t('aircall.blocked.networkMessage')}
              </>
            )}
            {hasIframeBlock && !hasNetworkBlock && (
              <>
                <strong>{t('aircall.blocked.iframeTitle')}</strong>
                <br />
                {t('aircall.blocked.iframeMessage')}
              </>
            )}
            {hasTimeout && !hasNetworkBlock && !hasIframeBlock && (
              <>
                <strong>{t('aircall.blocked.timeoutTitle')}</strong>
                <br />
                {t('aircall.blocked.timeoutMessage')}
              </>
            )}
          </AlertDescription>
        </Alert>

        {/* Solution Steps */}
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold">1</span>
              {t('aircall.blocked.step1Title')}
            </h4>
            <p className="text-sm text-muted-foreground mb-3 ml-8">
              {t('aircall.blocked.step1Desc')}
            </p>
            <div className="flex gap-2 ml-8">
              <Button
                onClick={onOpenIncognito}
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {t('aircall.blocked.openIncognito')}
              </Button>
              <Button
                onClick={handleQuickTest}
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {t('aircall.blocked.quickTest')}
              </Button>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold">2</span>
              {t('aircall.blocked.step2Title')}
            </h4>
            <div className="text-sm text-muted-foreground space-y-1 ml-8">
              <p>{t('aircall.blocked.step2Desc')}</p>
              <ul className="list-disc list-inside pl-2">
                <li>uBlock Origin</li>
                <li>AdBlock Plus</li>
                <li>Privacy Badger</li>
                <li>Ghostery</li>
                <li>{t('aircall.blocked.vpnExtensions')}</li>
              </ul>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold">3</span>
              {t('aircall.blocked.step3Title')}
            </h4>
            <p className="text-sm text-muted-foreground mb-3 ml-8">
              {t('aircall.blocked.step3Desc')}
            </p>
            <div className="flex gap-2 ml-8">
              <Button onClick={onRetry}>
                {t('aircall.blocked.retryButton')}
              </Button>
              <Button onClick={handleCopyDebugReport} variant="outline">
                <Copy className="h-4 w-4 mr-2" />
                {t('aircall.blocked.copyReport')}
              </Button>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            {t('aircall.blocked.technicalDetails')}
          </summary>
          <div className="mt-2 p-3 rounded-lg bg-muted text-xs font-mono">
            <div>{t('aircall.blocked.detectedIssues')}: {issues.join(', ')}</div>
            <div className="mt-1">{t('aircall.blocked.requiredDomains')}: phone.aircall.io, api.aircall.io</div>
            <div className="mt-1">{t('aircall.blocked.requiredPermissions')}: microphone, camera (optional)</div>
          </div>
        </details>

        {/* Phase 6: Emergency Escape Hatch */}
        <div className="mt-4 pt-4 border-t border-border">
          <Button
            onClick={onSkip}
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground hover:text-foreground"
          >
            {t('aircall.blocked.skipButton')}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            {t('aircall.blocked.skipNote')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const AircallBlockedModal = AircallBlockedModalComponent;
