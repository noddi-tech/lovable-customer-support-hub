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
    console.log('[AircallLoginModal] State changed:', {
      isOpen,
      isConnected,
      shouldShow: isOpen && !isConnected,
      verificationStatus
    });
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

  // PHASE 5: Enhanced real-time workspace monitoring
  useEffect(() => {
    if (isOpen) {
      console.group('[AircallLoginModal] 🔍 Modal Opened - Real-Time Diagnostic');
      console.log('Initialization Phase:', initializationPhase);
      console.log('Is Connected:', isConnected);
      
      const container = document.querySelector('#aircall-workspace-container');
      const iframe = container?.querySelector('iframe');
      const dialogOverlay = document.querySelector('[data-radix-dialog-overlay]');
      const dialogContent = document.querySelector('[data-radix-dialog-content]');
      
      console.log('Container:', {
        exists: !!container,
        classes: container?.className,
        pointerEvents: container ? window.getComputedStyle(container).pointerEvents : 'N/A',
        display: container ? window.getComputedStyle(container).display : 'N/A',
        visibility: container ? window.getComputedStyle(container).visibility : 'N/A',
        iframeExists: !!iframe
      });
      
      if (iframe) {
        console.log('Iframe:', {
          src: iframe.src,
          pointerEvents: window.getComputedStyle(iframe).pointerEvents,
          display: window.getComputedStyle(iframe).display
        });
      }
      
      console.log('Dialog Elements:', {
        overlayExists: !!dialogOverlay,
        overlayPointerEvents: dialogOverlay ? window.getComputedStyle(dialogOverlay).pointerEvents : 'N/A',
        contentExists: !!dialogContent,
        contentPointerEvents: dialogContent ? window.getComputedStyle(dialogContent).pointerEvents : 'N/A'
      });
      
      console.groupEnd();
      
      // Real-time monitoring every 500ms while modal is open
      const monitorInterval = setInterval(() => {
        const currentContainer = document.querySelector('#aircall-workspace-container') as HTMLElement;
        const currentIframe = currentContainer?.querySelector('iframe');
        
        if (currentIframe && !iframe) {
          console.log('[AircallLoginModal] ✅ Iframe appeared!');
        }
        
        if (currentContainer) {
          const styles = window.getComputedStyle(currentContainer);
          if (styles.pointerEvents !== 'auto') {
            console.warn('[AircallLoginModal] ⚠️ Container pointer-events not auto:', styles.pointerEvents);
          }
        }
      }, 500);
      
      return () => clearInterval(monitorInterval);
    }
  }, [isOpen, initializationPhase, isConnected]);

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
    console.log('[AircallLoginModal] Opening login popup');
    
    // Open Aircall in a centered popup window
    const width = 800;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    const popup = window.open(
      'https://phone.aircall.io',
      'aircall-login',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      console.error('[AircallLoginModal] Popup blocked by browser');
      toast({
        title: "Popup Blocked",
        description: "Please allow popups and try again.",
        variant: "destructive",
      });
      return;
    }

    console.log('[AircallLoginModal] Popup opened, starting to poll for login');
    // Update status to show we're waiting for login
    setVerificationStatus('checking');

    // Poll for login status
    const pollInterval = setInterval(async () => {
      try {
        // Check if popup is closed
        if (popup.closed) {
          console.log('[AircallLoginModal] Popup closed by user');
          clearInterval(pollInterval);
          setVerificationStatus('idle');
          return;
        }

        // Check login status via the context's checkLoginStatus
        const isLoggedIn = await checkLoginStatus();
        console.log('[AircallLoginModal] Login status check:', isLoggedIn);
        
        if (isLoggedIn) {
          console.log('[AircallLoginModal] ✅ Login detected! Closing popup');
          clearInterval(pollInterval);
          popup.close();
          setVerificationStatus('success');
          
          toast({
            title: "Login Successful",
            description: "You're now connected to Aircall",
          });
          
          // Trigger the login confirmation
          await onLoginConfirm();
        }
      } catch (error) {
        console.error('[AircallLoginModal] Login check error:', error);
      }
    }, 2000); // Check every 2 seconds

    // Cleanup after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (!popup.closed) {
        console.warn('[AircallLoginModal] Login timeout - closing popup');
        popup.close();
        setVerificationStatus('idle');
        toast({
          title: "Login Timeout",
          description: "Please try logging in again.",
          variant: "destructive",
        });
      }
    }, 300000); // 5 minutes
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
  
  console.log('[AircallLoginModal] Render:', {
    isOpen,
    isConnected,
    shouldShowModal,
    verificationStatus
  });

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

          {/* Primary Login Button */}
          {!showTroubleshooting && (
            <div className="space-y-3">
              <Alert>
                <AlertDescription>
                  <div className="space-y-2">
                    <p><strong>Click below to log in to Aircall via popup window</strong></p>
                    <p className="text-sm text-muted-foreground">The popup will close automatically once you're logged in.</p>
                  </div>
                </AlertDescription>
              </Alert>
              
              <Button
                onClick={handleOpenNewTab}
                variant="default"
                size="lg"
                className="w-full"
                disabled={verificationStatus === 'checking'}
              >
                {verificationStatus === 'checking' ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Waiting for login...
                  </>
                ) : verificationStatus === 'success' ? (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Login successful!
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-5 w-5" />
                    Login with Popup
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

              {/* Check 3: Login via Popup */}
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
                  <ExternalLink className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
                  <div>
                    <strong className="block mb-1">Try: Login via Popup</strong>
                    <span>Log into Aircall in a popup window to bypass iframe restrictions.</span>
                  </div>
                </div>
                <Button
                  onClick={handleOpenNewTab}
                  variant="default"
                  size="sm"
                  className="w-full"
                  disabled={verificationStatus === 'checking'}
                >
                  {verificationStatus === 'checking' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Waiting for login...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Login with Popup
                    </>
                  )}
                </Button>
                {verificationStatus === 'checking' && (
                  <p className="text-xs text-amber-700 dark:text-amber-300 text-center">
                    Complete login in the popup window. It will close automatically.
                  </p>
                )}
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
