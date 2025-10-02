import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Shield, ExternalLink, Copy, Chrome, Cookie, Wifi, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { aircallPhone } from '@/lib/aircall-phone';
import { detectBrowser, getBrowserInstructions, getChromeDownloadUrl, type BrowserInfo } from '@/lib/browser-detection';
import { getCookieEnableInstructions } from '@/lib/cookie-detection';

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
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
  
  // Categorize issues
  const hasCookiesBlocked = issues.includes('cookies_blocked');
  const hasAuthenticationFailed = issues.includes('authentication_failed');
  const hasNetworkBlock = issues.includes('network_blocked') || issues.includes('resources_blocked');
  const hasIframeBlock = issues.includes('no_iframe') || issues.includes('iframe_blocked');
  const hasTimeout = issues.includes('timeout');
  const hasUnsupportedBrowser = issues.some(i => i.includes('unsupported_browser'));

  // Detect browser on mount
  useEffect(() => {
    detectBrowser().then(setBrowserInfo);
  }, []);

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

        {/* Issue Explanation - Priority Order: Cookies > Auth > Network > Iframe > Timeout */}
        
        {/* Cookies Blocked */}
        {hasCookiesBlocked && (
          <Alert className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
            <Cookie className="h-4 w-4 text-orange-600" />
            <AlertDescription className="ml-2">
              <strong>Third-Party Cookies Blocked</strong>
              <br />
              Aircall requires third-party cookies to function. Your browser is currently blocking them.
              {browserInfo && (
                <div className="mt-3 space-y-1 text-sm">
                  <div className="font-semibold">How to enable cookies in {browserInfo.name}:</div>
                  {getCookieEnableInstructions(browserInfo.type).map((instruction, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-orange-600 font-bold min-w-[20px]">{idx + 1}.</span>
                      <span>{instruction}</span>
                    </div>
                  ))}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Authentication Failed */}
        {hasAuthenticationFailed && !hasCookiesBlocked && (
          <Alert className="border-red-500/50 bg-red-50 dark:bg-red-950/20">
            <Key className="h-4 w-4 text-red-600" />
            <AlertDescription className="ml-2">
              <strong>Authentication Failed (401)</strong>
              <br />
              Unable to authenticate with Aircall. This could be due to:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Invalid API credentials - verify in Admin Settings</li>
                <li>Third-party cookies blocked - check browser settings</li>
                <li>Aircall session expired - try logging in again</li>
                <li>Network/firewall blocking authentication</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Network Block */}
        {hasNetworkBlock && !hasCookiesBlocked && !hasAuthenticationFailed && (
          <Alert className="border-destructive/50 bg-destructive/5">
            <Wifi className="h-4 w-4 text-destructive" />
            <AlertDescription className="ml-2">
              <strong>{t('aircall.blocked.networkTitle')}</strong>
              <br />
              {t('aircall.blocked.networkMessage')}
              <div className="mt-2 text-sm">
                Check that <code className="bg-muted px-1 rounded">phone.aircall.io</code> and{' '}
                <code className="bg-muted px-1 rounded">api.aircall.io</code> are not blocked by your firewall or proxy.
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Iframe Block */}
        {hasIframeBlock && !hasNetworkBlock && !hasCookiesBlocked && !hasAuthenticationFailed && (
          <Alert className="border-destructive/50 bg-destructive/5">
            <Shield className="h-4 w-4 text-destructive" />
            <AlertDescription className="ml-2">
              <strong>{t('aircall.blocked.iframeTitle')}</strong>
              <br />
              {t('aircall.blocked.iframeMessage')}
            </AlertDescription>
          </Alert>
        )}

        {/* Timeout */}
        {hasTimeout && !hasNetworkBlock && !hasIframeBlock && !hasCookiesBlocked && !hasAuthenticationFailed && (
          <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="ml-2">
              <strong>{t('aircall.blocked.timeoutTitle')}</strong>
              <br />
              {t('aircall.blocked.timeoutMessage')}
            </AlertDescription>
          </Alert>
        )}

        {/* Browser-Specific Warning */}
        {browserInfo && !browserInfo.isSupported && (
          <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <Chrome className="h-4 w-4 text-amber-600" />
            <AlertDescription className="ml-2">
              <strong>{t('aircall.blocked.browser.unsupported', { browser: browserInfo.name })}</strong>
              <br />
              {t('aircall.blocked.browser.useChrome')}
            </AlertDescription>
          </Alert>
        )}

        {/* Brave-Specific Instructions */}
        {browserInfo?.type === 'brave' && (
          <Alert className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
            <Shield className="h-4 w-4 text-orange-600" />
            <AlertDescription className="ml-2">
              <strong>{t('aircall.blocked.browser.braveDetected')}</strong>
              <div className="mt-2 space-y-1 text-sm">
                {getBrowserInstructions('brave').map((instruction, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold">{idx + 1}.</span>
                    <span>{instruction}</span>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Solution Steps */}
        <div className="space-y-4">
          {/* Step 1: Use Chrome (if unsupported browser) */}
          {browserInfo && !browserInfo.isSupported && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold">1</span>
                {t('aircall.blocked.browser.step1Title')}
              </h4>
              <p className="text-sm text-muted-foreground mb-3 ml-8">
                {t('aircall.blocked.browser.step1Desc')}
              </p>
              <div className="ml-8">
                <Button
                  onClick={() => window.open(getChromeDownloadUrl(), '_blank')}
                  variant="default"
                >
                  <Chrome className="h-4 w-4 mr-2" />
                  {t('aircall.blocked.browser.downloadChrome')}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Try Incognito/Private Mode */}
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold">
                {browserInfo && !browserInfo.isSupported ? '2' : '1'}
              </span>
              {t('aircall.blocked.step1Title')}
            </h4>
            <p className="text-sm text-muted-foreground mb-3 ml-8">
              {t('aircall.blocked.step1Desc')}
              {browserInfo?.type === 'brave' && (
                <span className="block mt-1 text-orange-600 font-medium">
                  {t('aircall.blocked.browser.braveNote')}
                </span>
              )}
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

          {/* Step 3: Disable Ad Blockers */}
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold">
                {browserInfo && !browserInfo.isSupported ? '3' : '2'}
              </span>
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

          {/* Step 4: Retry */}
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold">
                {browserInfo && !browserInfo.isSupported ? '4' : '3'}
              </span>
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
