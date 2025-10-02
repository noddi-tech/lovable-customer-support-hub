import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, CheckCircle, XCircle, ExternalLink, Chrome, Shield, Cookie, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';
import { detectBrowser, getChromeDownloadUrl, type BrowserInfo } from '@/lib/browser-detection';
import { getCookieEnableInstructions } from '@/lib/cookie-detection';

interface AircallLoginModalProps {
  isOpen: boolean;
  isConnected: boolean;
  onLoginConfirm: () => void;
  onSkip: () => void;
  initializationPhase?: string;
}

const AircallLoginModalComponent: React.FC<AircallLoginModalProps> = ({
  isOpen,
  isConnected,
  onLoginConfirm,
  onSkip,
  initializationPhase = 'idle'
}) => {
  const { t } = useTranslation();
  const [isChecking, setIsChecking] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);

  // Detect browser on mount
  useEffect(() => {
    detectBrowser().then(setBrowserInfo);
  }, []);

  // Track elapsed time for progressive messages
  useEffect(() => {
    if (!isOpen || isConnected) {
      setElapsedTime(0);
      return;
    }

    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isConnected]);

  // Show troubleshooting after 15 seconds
  useEffect(() => {
    if (elapsedTime >= 15) {
      setShowTroubleshooting(true);
    }
  }, [elapsedTime]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setVerificationStatus('idle');
      setIsChecking(false);
      setShowTroubleshooting(false);
    }
  }, [isOpen]);

  // Auto-hide after successful connection
  useEffect(() => {
    if (isConnected && isOpen) {
      setTimeout(() => {
        setVerificationStatus('success');
      }, 500);
    }
  }, [isConnected, isOpen]);

  const handleManualConfirm = async () => {
    setIsChecking(true);
    setVerificationStatus('checking');
    
    try {
      await onLoginConfirm();
      setVerificationStatus('success');
    } catch (err) {
      setVerificationStatus('error');
      setTimeout(() => {
        setVerificationStatus('idle');
        setIsChecking(false);
      }, 3000);
    }
  };

  const handleOpenNewTab = () => {
    window.open('https://phone.aircall.io', '_blank');
  };

  const getStatusMessage = () => {
    if (initializationPhase === 'checking' || elapsedTime < 5) {
      return t('aircall.login.statusCreatingWorkspace');
    }
    if (initializationPhase === 'creating' || elapsedTime < 10) {
      return t('aircall.login.statusLoadingSystem');
    }
    if (initializationPhase === 'loading' || elapsedTime < 15) {
      return t('aircall.login.statusAlmostReady');
    }
    return t('aircall.login.statusTakingLonger');
  };

  return (
    <Dialog open={isOpen && !isConnected}>
      <DialogContent 
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t('aircall.login.title')}</DialogTitle>
          <DialogDescription>
            {t('aircall.login.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Unsupported Browser Warning (immediate) */}
          {browserInfo && !browserInfo.isSupported && (
            <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <Chrome className="h-4 w-4 text-amber-600" />
              <AlertDescription className="ml-2 space-y-2">
                <div>
                  <strong>{t('aircall.login.browser.unsupported', { browser: browserInfo.name })}</strong>
                  <br />
                  <span className="text-sm">{t('aircall.login.browser.useChrome')}</span>
                </div>
                <Button
                  onClick={() => window.open(getChromeDownloadUrl(), '_blank')}
                  size="sm"
                  variant="default"
                  className="w-full mt-2"
                >
                  <Chrome className="h-4 w-4 mr-2" />
                  {t('aircall.login.browser.downloadChrome')}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Brave Warning (after 5 seconds) */}
          {browserInfo?.type === 'brave' && elapsedTime >= 5 && (
            <Alert className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
              <Shield className="h-4 w-4 text-orange-600" />
              <AlertDescription className="ml-2">
                <strong>{t('aircall.login.browser.braveDetected')}</strong>
                <br />
                <span className="text-sm">{t('aircall.login.browser.braveInstructions')}</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Status Message */}
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
            {verificationStatus === 'checking' ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : verificationStatus === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : verificationStatus === 'error' ? (
              <XCircle className="h-5 w-5 text-destructive" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">
                {verificationStatus === 'checking' && t('aircall.login.verifying')}
                {verificationStatus === 'success' && t('aircall.login.success')}
                {verificationStatus === 'error' && t('aircall.login.notLoggedIn')}
                {verificationStatus === 'idle' && getStatusMessage()}
              </p>
              {elapsedTime > 0 && verificationStatus === 'idle' && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t('aircall.login.elapsed', { seconds: elapsedTime })}
                </p>
              )}
            </div>
          </div>

          {/* Instructions */}
          {!showTroubleshooting && (
            <Alert>
              <AlertDescription>
                {t('aircall.login.instructions')}
              </AlertDescription>
            </Alert>
          )}

          {/* Enhanced Troubleshooting Section (after 15s) */}
          {showTroubleshooting && (
            <div className="space-y-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-amber-600" />
                <h4 className="font-semibold text-sm text-amber-900 dark:text-amber-100">
                  {t('aircall.login.havingTrouble')}
                </h4>
              </div>

              {/* Check 1: Cookies */}
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
                  <Cookie className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
                  <div>
                    <strong className="block mb-1">Check: Third-Party Cookies</strong>
                    <span>Aircall requires third-party cookies enabled.</span>
                    {browserInfo && (
                      <details className="mt-2">
                        <summary className="cursor-pointer hover:underline font-medium">
                          How to enable in {browserInfo.name}
                        </summary>
                        <div className="mt-2 space-y-1 pl-4">
                          {getCookieEnableInstructions(browserInfo.type).map((instruction, idx) => (
                            <div key={idx} className="flex gap-2">
                              <span className="font-bold">{idx + 1}.</span>
                              <span>{instruction}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </div>

              {/* Check 2: Credentials */}
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
                  <Shield className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
                  <div>
                    <strong className="block mb-1">Check: API Credentials</strong>
                    <span>Verify your Aircall Everywhere credentials in Admin Settings → Aircall.</span>
                    <div className="mt-1">
                      Use the <strong>"Test Credentials"</strong> button to validate.
                    </div>
                  </div>
                </div>
              </div>

              {/* Check 3: Login in New Tab */}
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
                  <ExternalLink className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
                  <div>
                    <strong className="block mb-1">Try: Login in New Tab</strong>
                    <span>Sometimes logging in to Aircall in a separate tab helps establish the session.</span>
                  </div>
                </div>
                <Button
                  onClick={handleOpenNewTab}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Aircall in New Tab
                </Button>
                <p className="text-xs text-amber-700 dark:text-amber-300 text-center">
                  After logging in, return here and click "I'm Logged In"
                </p>
              </div>
            </div>
          )}

          {/* Manual Verification Button */}
          <Button 
            onClick={handleManualConfirm}
            disabled={isChecking}
            className="w-full"
            variant={showTroubleshooting ? "default" : "outline"}
          >
            {isChecking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('aircall.login.verifying')}
              </>
            ) : (
              t('aircall.login.verifyButton')
            )}
          </Button>

          {/* Skip Button */}
          <Button
            onClick={onSkip}
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
          >
            {t('aircall.login.skipButton')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const AircallLoginModal = AircallLoginModalComponent;
