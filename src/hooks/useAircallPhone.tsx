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
   * Initialize Aircall Workspace
   */
  useEffect(() => {
    if (initAttemptedRef.current || !everywhereConfig?.enabled) {
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
            console.log('[useAircallPhone] ✅ Logged in via callback');
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
        
        // Check if user is already logged in (e.g., from previous session)
        aircallPhone.checkLoginStatus((isLoggedIn) => {
          console.log('[useAircallPhone] Initial login status:', isLoggedIn);
          if (isLoggedIn) {
            setIsConnected(true);
            toast({
              title: 'Aircall Connected',
              description: 'Phone system is ready',
            });
          }
        });
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
   * Periodically check login status after initialization
   * This handles cases where user logs in via the workspace UI
   */
  useEffect(() => {
    if (!isInitialized || isConnected) return;

    console.log('[useAircallPhone] 🔄 Starting login status polling');
    
    const checkInterval = setInterval(() => {
      aircallPhone.checkLoginStatus((isLoggedIn) => {
        if (isLoggedIn && !isConnected) {
          console.log('[useAircallPhone] ✅ Login detected via polling');
          setIsConnected(true);
          setError(null);
          
          toast({
            title: 'Aircall Connected',
            description: 'Phone system is ready',
          });
        }
      });
    }, 2000); // Check every 2 seconds

    return () => {
      console.log('[useAircallPhone] 🛑 Stopping login status polling');
      clearInterval(checkInterval);
    };
  }, [isInitialized, isConnected, toast]);

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
      console.log('[useAircallPhone] ℹ️  User must answer via Aircall Workspace UI');
    } catch (err) {
      // Expected - v2 doesn't support programmatic answer
      toast({
        title: 'Use Aircall Workspace to Answer',
        description: 'Click "Show Aircall" button to interact with the call',
      });
    }
  }, [toast]);

  /**
   * Reject call
   */
  const rejectCall = useCallback(async () => {
    try {
      await aircallPhone.rejectCall();
      console.log('[useAircallPhone] ℹ️  User must reject via Aircall Workspace UI');
    } catch (err) {
      // Expected - v2 doesn't support programmatic reject
      toast({
        title: 'Use Aircall Workspace to Reject',
        description: 'Click "Show Aircall" button to interact with the call',
      });
    }
  }, [toast]);

  /**
   * Hang up call
   */
  const hangUp = useCallback(async () => {
    try {
      await aircallPhone.hangUp();
      console.log('[useAircallPhone] ℹ️  User must hang up via Aircall Workspace UI');
    } catch (err) {
      // Expected - v2 doesn't support programmatic hangup
      toast({
        title: 'Use Aircall Workspace to End Call',
        description: 'Click "Show Aircall" button to interact with the call',
      });
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
    isReconnecting
  };
};
