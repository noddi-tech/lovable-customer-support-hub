import { useEffect, useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import { ActionableToast } from '@/components/dashboard/voice/ActionableToast';

interface CallNotificationConfig {
  soundEnabled?: boolean;
  soundVolume?: number;
  browserNotificationsEnabled?: boolean;
}

export const useCallNotifications = (config: CallNotificationConfig = {}) => {
  const { toast } = useToast();
  const { showNotification, permission } = useBrowserNotifications();
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  const {
    soundEnabled = true,
    soundVolume = 0.5,
    browserNotificationsEnabled = true,
  } = config;

  // Initialize audio context
  useEffect(() => {
    if (soundEnabled && !audioContext) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
    }
  }, [soundEnabled, audioContext]);

  // Play notification sound
  const playSound = useCallback(
    (frequency: number = 800, duration: number = 200) => {
      if (!soundEnabled || !audioContext) return;

      try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(soundVolume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.001,
          audioContext.currentTime + duration / 1000
        );

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration / 1000);
      } catch (error) {
        console.error('Error playing sound:', error);
      }
    },
    [soundEnabled, soundVolume, audioContext]
  );

  const notifyIncomingCall = useCallback(
    (phone: string, customerName?: string, onAnswer?: () => void) => {
      // Play double beep for incoming call
      if (soundEnabled) {
        playSound(800, 150);
        setTimeout(() => playSound(1000, 150), 200);
      }

      // Show toast notification
      toast({
        duration: 10000,
        description: (
          <ActionableToast
            type="incoming_call"
            phone={phone}
            customerName={customerName}
            timestamp={new Date()}
            onAnswer={() => {
              onAnswer?.();
              toast({ title: 'Answering call...' });
            }}
          />
        ),
      });

      // Show browser notification
      if (browserNotificationsEnabled && permission === 'granted') {
        showNotification({
          title: 'Incoming Call',
          body: `Call from ${customerName || phone}`,
          tag: `incoming-call-${phone}`,
          requireInteraction: true,
          data: { phone, customerName, type: 'incoming_call' },
        });
      }
    },
    [soundEnabled, browserNotificationsEnabled, permission, toast, showNotification, playSound]
  );

  const notifyMissedCall = useCallback(
    (phone: string, customerName?: string, onCallBack?: () => void, onSchedule?: () => void) => {
      // Play single beep for missed call
      if (soundEnabled) {
        playSound(600, 300);
      }

      // Show toast notification
      toast({
        duration: 8000,
        description: (
          <ActionableToast
            type="missed_call"
            phone={phone}
            customerName={customerName}
            timestamp={new Date()}
            onCallBack={onCallBack}
            onSchedule={onSchedule}
          />
        ),
      });

      // Show browser notification
      if (browserNotificationsEnabled && permission === 'granted') {
        showNotification({
          title: 'Missed Call',
          body: `You missed a call from ${customerName || phone}`,
          tag: `missed-call-${phone}`,
          data: { phone, customerName, type: 'missed_call' },
        });
      }
    },
    [soundEnabled, browserNotificationsEnabled, permission, toast, showNotification, playSound]
  );

  const notifyVoicemail = useCallback(
    (phone: string, customerName?: string, onListenNow?: () => void) => {
      // Play notification sound
      if (soundEnabled) {
        playSound(700, 200);
      }

      // Show toast notification
      toast({
        duration: 8000,
        description: (
          <ActionableToast
            type="voicemail"
            phone={phone}
            customerName={customerName}
            timestamp={new Date()}
            onListenNow={onListenNow}
          />
        ),
      });

      // Show browser notification
      if (browserNotificationsEnabled && permission === 'granted') {
        showNotification({
          title: 'New Voicemail',
          body: `New voicemail from ${customerName || phone}`,
          tag: `voicemail-${phone}`,
          data: { phone, customerName, type: 'voicemail' },
        });
      }
    },
    [soundEnabled, browserNotificationsEnabled, permission, toast, showNotification, playSound]
  );

  const notifyCallbackRequest = useCallback(
    (phone: string, customerName?: string, onSchedule?: () => void) => {
      // Play notification sound
      if (soundEnabled) {
        playSound(750, 200);
      }

      // Show toast notification
      toast({
        duration: 8000,
        description: (
          <ActionableToast
            type="callback_request"
            phone={phone}
            customerName={customerName}
            timestamp={new Date()}
            onSchedule={onSchedule}
          />
        ),
      });

      // Show browser notification
      if (browserNotificationsEnabled && permission === 'granted') {
        showNotification({
          title: 'Callback Request',
          body: `${customerName || phone} requested a callback`,
          tag: `callback-${phone}`,
          data: { phone, customerName, type: 'callback_request' },
        });
      }
    },
    [soundEnabled, browserNotificationsEnabled, permission, toast, showNotification, playSound]
  );

  return {
    notifyIncomingCall,
    notifyMissedCall,
    notifyVoicemail,
    notifyCallbackRequest,
  };
};
