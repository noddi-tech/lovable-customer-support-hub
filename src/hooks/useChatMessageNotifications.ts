import { useState, useCallback, useEffect, useRef } from 'react';

interface ChatNotificationConfig {
  soundEnabled?: boolean;
  soundVolume?: number;
}

export function useChatMessageNotifications(config: ChatNotificationConfig = {}) {
  const { soundEnabled = true, soundVolume = 0.5 } = config;
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize AudioContext lazily (requires user interaction)
  const initializeAudio = useCallback(() => {
    if (audioContextRef.current || !soundEnabled) return;
    
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass();
        setIsInitialized(true);
      }
    } catch (error) {
      console.warn('[useChatMessageNotifications] Failed to create AudioContext:', error);
    }
  }, [soundEnabled]);

  // Initialize on first interaction
  useEffect(() => {
    if (!soundEnabled) return;

    const handleInteraction = () => {
      initializeAudio();
      // Remove listeners after first interaction
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, [initializeAudio, soundEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Play a friendly "ding" sound for new messages
  const playMessageSound = useCallback(() => {
    if (!soundEnabled) return;
    
    // Ensure we have an audio context
    if (!audioContextRef.current) {
      initializeAudio();
    }
    
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    // Resume if suspended (browser autoplay policy)
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }

    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Higher pitched, shorter "ding" sound - distinct from call notifications
      oscillator.frequency.value = 880; // A5 note
      oscillator.type = 'sine';

      const now = audioContext.currentTime;
      
      // Quick attack, smooth decay
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(soundVolume, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      oscillator.start(now);
      oscillator.stop(now + 0.15);
    } catch (error) {
      console.warn('[useChatMessageNotifications] Failed to play sound:', error);
    }
  }, [soundEnabled, soundVolume, initializeAudio]);

  return { 
    playMessageSound,
    isInitialized 
  };
}
