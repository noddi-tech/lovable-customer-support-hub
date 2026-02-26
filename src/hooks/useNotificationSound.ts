import { useState, useCallback, useEffect, useRef } from 'react';

const SOUND_ENABLED_KEY = 'notification-sound-enabled';

export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem(SOUND_ENABLED_KEY);
    return stored !== 'false'; // default to true
  });

  const initializeAudio = useCallback(() => {
    if (audioContextRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass();
        setIsInitialized(true);
      }
    } catch (error) {
      console.warn('[useNotificationSound] Failed to create AudioContext:', error);
    }
  }, []);

  // Initialize on first user interaction
  useEffect(() => {
    if (!soundEnabled) return;

    const handleInteraction = () => {
      initializeAudio();
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

  const ensureContext = useCallback(() => {
    if (!audioContextRef.current) initializeAudio();
    const ctx = audioContextRef.current;
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }, [initializeAudio]);

  // Distinctive double-tone "ding-ding" for mentions
  const playMentionSound = useCallback(() => {
    if (!soundEnabled) return;
    const ctx = ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const volume = 0.4;

      // First ding (880Hz - A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.value = 880;
      osc1.type = 'sine';
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(volume, now + 0.01);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Second ding (1100Hz - C#6) after 150ms
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 1100;
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0, now + 0.15);
      gain2.gain.linearRampToValueAtTime(volume, now + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.35);
    } catch (error) {
      console.warn('[useNotificationSound] Failed to play mention sound:', error);
    }
  }, [soundEnabled, ensureContext]);

  // Single short tone for general notifications
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    const ctx = ensureContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 660;
      osc.type = 'sine';
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch (error) {
      console.warn('[useNotificationSound] Failed to play notification sound:', error);
    }
  }, [soundEnabled, ensureContext]);

  const toggleSound = useCallback((enabled: boolean) => {
    setSoundEnabled(enabled);
    localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
  }, []);

  return {
    playMentionSound,
    playNotificationSound,
    soundEnabled,
    toggleSound,
    isInitialized,
  };
}
