import { useState, useEffect, useCallback, useRef } from 'react';
import { aircallPhone, type AircallCall, type AircallPhoneEvent } from '@/lib/aircall-phone';
import { aircallEventBridge } from '@/lib/aircall-event-bridge';
import { useVoiceIntegrations } from './useVoiceIntegrations';
import { useToast } from '@/hooks/use-toast';

export interface UseAircallPhoneReturn {
  isInitialized: boolean;
  isConnected: boolean;
  currentCall: AircallCall | null;
  answerCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  hangUp: () => Promise<void>;
  dialNumber: (phoneNumber: string) => Promise<void>;
  error: string | null;
  isReconnecting: boolean;
  isSDKLoaded: boolean;
}

/**
 * React hook for Aircall Everywhere SDK
 * 
 * Manages SDK lifecycle, authentication, reconnection, and call controls
 */
export const useAircallPhone = (): UseAircallPhoneReturn => {
  const { toast } = useToast();
  const { getIntegrationByProvider } = useVoiceIntegrations();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentCall, setCurrentCall] = useState<AircallCall | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const initAttemptedRef = useRef(false);
  
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const BASE_RECONNECT_DELAY = 1000; // Start with 1 second

  // Get Aircall integration config
  const aircallConfig = getIntegrationByProvider('aircall');
  const everywhereConfig = aircallConfig?.configuration?.aircallEverywhere;

  // Exponential backoff reconnection logic
  const attemptReconnect = useCallback(async () => {
    if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[useAircallPhone] Max reconnection attempts reached');
      setError('Unable to reconnect to Aircall. Please refresh the page.');
      setIsReconnecting(false);
      toast({
        title: 'Connection Failed',
        description: 'Unable to reconnect to phone system',
        variant: 'destructive',
      });
      return;
    }

    const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts.current);
    reconnectAttempts.current++;
    
    console.log(`[useAircallPhone] Reconnection attempt ${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
    
    reconnectTimeout.current = setTimeout(async () => {
      try {
        if (!everywhereConfig?.apiId || !everywhereConfig?.apiToken) {
          throw new Error('Missing API credentials');
        }

        await aircallPhone.initialize({
          apiId: everywhereConfig.apiId,
          apiToken: everywhereConfig.apiToken,
          domainName: everywhereConfig.domainName || window.location.hostname,
          onLogin: () => {
            console.log('[useAircallPhone] ✅ Reconnected successfully');
            setIsConnected(true);
            setError(null);
            setIsReconnecting(false);
            reconnectAttempts.current = 0;
            
            toast({
              title: 'Reconnected',
              description: 'Phone system connection restored',
            });
          },
          onLogout: () => {
            console.warn('[useAircallPhone] Connection lost during reconnection');
            setIsConnected(false);
          }
        });

        setIsInitialized(true);
      } catch (err: any) {
        console.error('[useAircallPhone] Reconnection error:', err);
        attemptReconnect();
      }
    }, delay);
  }, [everywhereConfig, toast]);

  // Handle disconnection
  const handleDisconnection = useCallback(() => {
    console.warn('[useAircallPhone] Connection lost, attempting reconnection...');
    setIsConnected(false);
    setIsReconnecting(true);
    
    toast({
      title: 'Connection Lost',
      description: 'Attempting to reconnect...',
    });
    
    attemptReconnect();
  }, [attemptReconnect, toast]);

  /**
   * Check if SDK script is loaded
   */
  useEffect(() => {
    const checkSDK = setInterval(() => {
      if (window.AircallPhone) {
        console.log('[useAircallPhone] 📦 SDK script loaded');
        setIsSDKLoaded(true);
        clearInterval(checkSDK);
      }
    }, 100);
    
    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(checkSDK);
      if (!window.AircallPhone) {
        console.error('[useAircallPhone] ❌ SDK script failed to load');
        setError('Aircall SDK failed to load. Please check your internet connection.');
      }
    }, 10000);
    
    return () => {
      clearInterval(checkSDK);
      clearTimeout(timeout);
    };
  }, []);

  /**
   * Initialize SDK
   */
  useEffect(() => {
    if (initAttemptedRef.current || !everywhereConfig?.enabled || !isSDKLoaded) {
      return;
    }

    const apiId = everywhereConfig.apiId;
    const apiToken = everywhereConfig.apiToken;

    if (!apiId || !apiToken) {
      console.warn('[useAircallPhone] Missing API credentials');
      return;
    }

    console.log('[useAircallPhone] 🚀 Initializing Aircall Everywhere');
    initAttemptedRef.current = true;

    const initialize = async () => {
      try {
        await aircallPhone.initialize({
          apiId,
          apiToken,
          domainName: everywhereConfig.domainName || window.location.hostname,
          onLogin: () => {
            console.log('[useAircallPhone] ✅ Logged in');
            setIsConnected(true);
            setError(null);
            reconnectAttempts.current = 0;
            
            toast({
              title: 'Aircall Connected',
              description: 'Phone system is ready',
            });
          },
          onLogout: () => {
            console.log('[useAircallPhone] 🔌 Logged out');
            handleDisconnection();
          }
        });

        setIsInitialized(true);
        console.log('[useAircallPhone] ✅ Initialization complete');
      } catch (err) {
        console.error('[useAircallPhone] ❌ Initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize');
        toast({
          title: 'Aircall Connection Failed',
          description: 'Unable to connect to Aircall. Please check your settings.',
          variant: 'destructive'
        });
      }
    };

    initialize();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (aircallPhone.isReady()) {
        aircallPhone.disconnect();
        setIsInitialized(false);
        setIsConnected(false);
      }
    };
  }, [everywhereConfig, toast, handleDisconnection]);

  /**
   * Register SDK event handlers
   */
  useEffect(() => {
    if (!isInitialized) return;

    console.log('[useAircallPhone] 📡 Registering event handlers');

    const handleIncomingCall = (call: AircallCall) => {
      const shouldProcess = aircallEventBridge.processSDKEvent({
        type: 'incoming_call',
        call,
        timestamp: Date.now()
      });

      if (shouldProcess) {
        console.log('[useAircallPhone] 📞 Incoming call (SDK):', call);
        setCurrentCall(call);
      }
    };

    const handleCallEnded = (call: AircallCall) => {
      const shouldProcess = aircallEventBridge.processSDKEvent({
        type: 'call_ended',
        call,
        timestamp: Date.now()
      });

      if (shouldProcess) {
        console.log('[useAircallPhone] 🔚 Call ended (SDK):', call);
        setCurrentCall(null);
      }
    };

    const handleOutgoingCall = (call: AircallCall) => {
      const shouldProcess = aircallEventBridge.processSDKEvent({
        type: 'outgoing_call',
        call,
        timestamp: Date.now()
      });

      if (shouldProcess) {
        console.log('[useAircallPhone] 📤 Outgoing call (SDK):', call);
        setCurrentCall(call);
      }
    };

    // Register handlers
    const unsubIncoming = aircallPhone.on('incoming_call', handleIncomingCall);
    const unsubEnded = aircallPhone.on('call_ended', handleCallEnded);
    const unsubOutgoing = aircallPhone.on('outgoing_call', handleOutgoingCall);

    return () => {
      unsubIncoming();
      unsubEnded();
      unsubOutgoing();
    };
  }, [isInitialized]);

  /**
   * Answer call
   */
  const answerCall = useCallback(async () => {
    try {
      await aircallPhone.answerCall();
      console.log('[useAircallPhone] ✅ Call answered');
    } catch (err) {
      console.error('[useAircallPhone] ❌ Failed to answer:', err);
      toast({
        title: 'Failed to Answer Call',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive'
      });
      throw err;
    }
  }, [toast]);

  /**
   * Reject call
   */
  const rejectCall = useCallback(async () => {
    try {
      await aircallPhone.rejectCall();
      console.log('[useAircallPhone] ✅ Call rejected');
      setCurrentCall(null);
    } catch (err) {
      console.error('[useAircallPhone] ❌ Failed to reject:', err);
      toast({
        title: 'Failed to Reject Call',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive'
      });
      throw err;
    }
  }, [toast]);

  /**
   * Hang up call
   */
  const hangUp = useCallback(async () => {
    try {
      await aircallPhone.hangUp();
      console.log('[useAircallPhone] ✅ Call hung up');
      setCurrentCall(null);
    } catch (err) {
      console.error('[useAircallPhone] ❌ Failed to hang up:', err);
      toast({
        title: 'Failed to Hang Up',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive'
      });
      throw err;
    }
  }, [toast]);

  /**
   * Dial number
   */
  const dialNumber = useCallback(async (phoneNumber: string) => {
    try {
      await aircallPhone.dialNumber(phoneNumber);
      console.log('[useAircallPhone] ✅ Dialing:', phoneNumber);
    } catch (err) {
      console.error('[useAircallPhone] ❌ Failed to dial:', err);
      toast({
        title: 'Failed to Dial',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive'
      });
      throw err;
    }
  }, [toast]);

  return {
    isInitialized,
    isConnected,
    currentCall,
    answerCall,
    rejectCall,
    hangUp,
    dialNumber,
    error,
    isReconnecting,
    isSDKLoaded
  };
};
