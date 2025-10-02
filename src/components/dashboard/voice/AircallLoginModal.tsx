import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';

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

          {/* Troubleshooting Section (after 15s) */}
          {showTroubleshooting && (
            <div className="space-y-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <h4 className="font-semibold text-sm text-amber-900 dark:text-amber-100">
                {t('aircall.login.havingTrouble')}
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-200">
                {t('aircall.login.troubleDesc')}
              </p>
              <Button
                onClick={handleOpenNewTab}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {t('aircall.login.openInNewTab')}
              </Button>
              <p className="text-xs text-amber-700 dark:text-amber-300 text-center">
                {t('aircall.login.afterLogin')}
              </p>
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
