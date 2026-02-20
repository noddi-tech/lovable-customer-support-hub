import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, CheckCircle, XCircle, ExternalLink, Chrome, Shield, Cookie, HelpCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';
import { detectBrowser, getChromeDownloadUrl, type BrowserInfo } from '@/lib/browser-detection';
import { getCookieEnableInstructions } from '@/lib/cookie-detection';
import { toast } from '@/hooks/use-toast';
import { useAircallPhone } from '@/hooks/useAircallPhone';

interface AircallLoginModalProps {
  isOpen: boolean;
  isConnected: boolean;
  onLoginConfirm: () => void;
  onSkip: () => void;
  initializationPhase?: string;
  diagnosticIssues?: string[];
}

const AircallLoginModalComponent: React.FC<AircallLoginModalProps> = ({
  isOpen,
  isConnected,
  onLoginConfirm,
  onSkip,
  initializationPhase = 'idle',
  diagnosticIssues = []
}) => {
  const { t } = useTranslation();
  const { checkLoginStatus } = useAircallPhone();
  const [isChecking, setIsChecking] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);

  // Detect browser on mount
  useEffect(() => {
    detectBrowser().then(setBrowserInfo);
  }, []);

  // Debug: Log when modal state changes
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[AircallLoginModal] State changed:', {
        isOpen,
        isConnected,
        shouldShow: isOpen && !isConnected,
        verificationStatus
      });
    }
  }, [isOpen, isConnected, verificationStatus]);

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

  // PHASE 2: Simplified - just make workspace visible without moving DOM elements
  useEffect(() => {
    if (isOpen) {
      console.log('[AircallLoginModal] Modal opened - making workspace visible');
      const container = document.querySelector('#aircall-workspace-container') as HTMLElement;
      if (container) {
        container.classList.remove('aircall-hidden');
        container.classList.add('aircall-visible');
        console.log('[AircallLoginModal] ✅ Workspace visibility toggled');
      } else {
        console.warn('[AircallLoginModal] ⚠️ Workspace container not found');
      }
    }
  }, [isOpen]);

  const handleManualConfirm = async () => {
    console.log('[AircallLoginModal] Verifying login status');
    setIsChecking(true);
    setVerificationStatus('checking');
    
    try {
      const isLoggedIn = await checkLoginStatus();
      
      if (isLoggedIn) {
        setVerificationStatus('success');
        setIsChecking(false);
        toast({
          title: "✅ Login Verified!",
          description: "You're now connected to Aircall",
        });
        await onLoginConfirm();
      } else {
        setVerificationStatus('error');
        setIsChecking(false);
        toast({
          title: "Not Logged In",
          description: "Please log in through the Aircall workspace below",
          variant: "destructive",
          duration: 8000,
        });
      }
    } catch (err) {
      console.error('[AircallLoginModal] ❌ Verification error:', err);
      setVerificationStatus('error');
      setIsChecking(false);
      toast({
        title: "Verification Failed",
        description: "An error occurred during verification. Please try again.",
        variant: "destructive",
      });
    }
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

  const shouldShowModal = isOpen && !isConnected;
  
  if (import.meta.env.DEV) {
    console.log('[AircallLoginModal] Render:', {
      isOpen,
      isConnected,
      shouldShowModal,
      verificationStatus
    });
  }

  return (
    <Dialog open={shouldShowModal}>
      <DialogContent 
        className="sm:max-w-md"
        style={{ zIndex: 10001 }}
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

          {/* Phase 5: Show diagnostic warnings if they exist */}
          {diagnosticIssues && diagnosticIssues.length > 0 && (
            <Alert className="border-amber-500/50 mb-4">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription>
                <strong>Potential Issues Detected:</strong>
                <ul className="list-disc ml-4 mt-2 text-sm">
                  {diagnosticIssues.includes('resources_blocked_warning') && (
                    <li>Some Aircall resources may be cached or blocked by extensions</li>
                  )}
                  {diagnosticIssues.includes('iframe_blocked') && (
                    <li>Browser extension may be interfering with the Aircall iframe</li>
                  )}
                </ul>
                <p className="mt-2 text-sm">
                  If login doesn't work, try <strong>disabling browser extensions</strong> or use <strong>incognito mode</strong>.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Iframe Login Instructions */}
          {!showTroubleshooting && (
            <div className="space-y-3">
              <Alert>
                <AlertDescription>
                  <div className="space-y-2">
                    <p><strong>Please log in through the Aircall workspace below</strong></p>
                    <p className="text-sm text-muted-foreground">Once logged in, click "Verify Login" to confirm your connection.</p>
                  </div>
                </AlertDescription>
              </Alert>
              
              {/* Container for the moved Aircall workspace */}
              <div 
                id="modal-aircall-container" 
                className="w-full h-[400px] rounded-lg border bg-background overflow-hidden"
              />
              
              <Button
                onClick={handleManualConfirm}
                variant="default"
                size="lg"
                className="w-full"
                disabled={verificationStatus === 'checking'}
              >
                {verificationStatus === 'checking' ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Verifying...
                  </>
                ) : verificationStatus === 'success' ? (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Login successful!
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Verify Login
                  </>
                )}
              </Button>
            </div>
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
                    <span>Open Aircall in a new tab if the workspace iframe is not responding.</span>
                  </div>
                </div>
                <Button
                  onClick={() => window.open('https://phone.aircall.io', '_blank')}
                  variant="default"
                  size="sm"
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Aircall in New Tab
                </Button>
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
