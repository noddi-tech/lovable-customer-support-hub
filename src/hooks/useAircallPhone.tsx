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
  showLoginModal: boolean;
  openLoginModal: () => void;
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
  const [isConnected, setIsConnected] = useState(() => aircallPhone.getLoginStatus());
  const [currentCall, setCurrentCall] = useState<AircallCall | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(() => !aircallPhone.getLoginStatus());
  const initAttemptedRef = useRef(false);
  const loginGracePeriodRef = useRef<NodeJS.Timeout | null>(null);
  
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const BASE_RECONNECT_DELAY = 1000; // Start with 1 second
  const GRACE_PERIOD_MS = 30000; // 30 seconds grace period after login (increased)

  // Get Aircall integration config
  const aircallConfig = getIntegrationByProvider('aircall');
  const everywhereConfig = aircallConfig?.configuration?.aircallEverywhere;

  // Store connection metadata for state preservation
  const saveConnectionMetadata = useCallback(() => {
    localStorage.setItem('aircall_connection_timestamp', Date.now().toString());
    localStorage.setItem('aircall_connection_attempts', reconnectAttempts.current.toString());
    console.log('[useAircallPhone] 💾 Saved connection metadata');
  }, []);
  
  const getConnectionMetadata = useCallback(() => {
    const timestamp = localStorage.getItem('aircall_connection_timestamp');
    const attempts = localStorage.getItem('aircall_connection_attempts');
    return {
      timestamp: timestamp ? parseInt(timestamp) : null,
      attempts: attempts ? parseInt(attempts) : 0
    };
  }, []);

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
            aircallPhone.setLoginStatus(true);
            saveConnectionMetadata();
            setIsConnected(true);
            setShowLoginModal(false);
            setError(null);
            reconnectAttempts.current = 0;
            
            // Start grace period - during this time, don't treat disconnects as full logouts
            if (loginGracePeriodRef.current) {
              clearTimeout(loginGracePeriodRef.current);
            }
            loginGracePeriodRef.current = setTimeout(() => {
              console.log('[useAircallPhone] Grace period ended');
              loginGracePeriodRef.current = null;
            }, GRACE_PERIOD_MS);
            
            toast({
              title: 'Aircall Connected',
              description: 'Phone system is ready',
            });
          },
          onLogout: () => {
            console.log('[useAircallPhone] 🔌 Logout event received');
            
            // If we're in grace period, this is likely a network issue during auth flow
            if (loginGracePeriodRef.current) {
              console.log('[useAircallPhone] Ignoring logout during grace period - likely network issue');
              return;
            }
            
            // Check localStorage to see if user was actually logged in
            const wasLoggedIn = aircallPhone.getLoginStatus();
            
            if (wasLoggedIn) {
              // User was logged in, but got disconnected - try to reconnect without showing modal
              console.log('[useAircallPhone] Handling disconnection, keeping login state');
              handleDisconnection();
            } else {
              // Confirmed logout - clear login status and show modal
              console.log('[useAircallPhone] Confirmed logout, showing modal');
              aircallPhone.clearLoginStatus();
              setShowLoginModal(true);
              handleDisconnection();
            }
          }
        });

        setIsInitialized(true);
        console.log('[useAircallPhone] ✅ Initialization complete');
        
        // Check for recent valid connection
        const metadata = getConnectionMetadata();
        const now = Date.now();
        const recentConnection = metadata.timestamp && (now - metadata.timestamp) < 300000; // 5 minutes
        
        // Check localStorage for persisted login status
        const wasLoggedIn = aircallPhone.getLoginStatus();
        console.log('[useAircallPhone] Restored login status from localStorage:', wasLoggedIn);
        console.log('[useAircallPhone] Recent connection metadata:', metadata);
        
        if (wasLoggedIn) {
          // If we had a recent connection, restore attempt count
          if (recentConnection) {
            console.log('[useAircallPhone] 🔄 Recent connection detected, restoring state...');
            reconnectAttempts.current = metadata.attempts;
          }
          
          // Verify with SDK
          aircallPhone.checkLoginStatus((isLoggedIn) => {
            console.log('[useAircallPhone] SDK login status verification:', isLoggedIn);
            if (isLoggedIn) {
              saveConnectionMetadata();
              setIsConnected(true);
              setShowLoginModal(false);
              toast({
                title: 'Aircall Connected',
                description: 'Phone system is ready',
              });
            } else if (recentConnection && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
              // Recent connection but not logged in - try silent reconnection
              console.log('[useAircallPhone] 🔄 Attempting silent reconnection...');
              attemptReconnect();
            } else {
              // localStorage was stale, clear it and show modal
              console.log('[useAircallPhone] ❌ Verification failed - clearing stale state');
              aircallPhone.clearLoginStatus();
              localStorage.removeItem('aircall_connection_timestamp');
              localStorage.removeItem('aircall_connection_attempts');
              setIsConnected(false);
              setShowLoginModal(true);
            }
          });
        } else {
          setShowLoginModal(true);
        }
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
      if (loginGracePeriodRef.current) {
        clearTimeout(loginGracePeriodRef.current);
      }
      if (aircallPhone.isReady()) {
        aircallPhone.disconnect();
        setIsInitialized(false);
        setIsConnected(false);
      }
    };
  }, [everywhereConfig, toast, handleDisconnection, saveConnectionMetadata, getConnectionMetadata, attemptReconnect]);


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

  // Manage modal visibility with grace period
  useEffect(() => {
    if (!isInitialized) return;
    
    // Give the SDK more time to establish connection before showing modal
    const graceTimer = setTimeout(() => {
      // Only show modal if we're not connected and not in a call
      if (!isConnected && !currentCall) {
        // Check if we recently had a valid connection
        const metadata = getConnectionMetadata();
        const timeSinceLastConnection = metadata.timestamp 
          ? Date.now() - metadata.timestamp 
          : Infinity;
        
        // Check if user recently logged in (within 5 minutes)
        const recentlyLoggedIn = timeSinceLastConnection < 5 * 60 * 1000;
        
        // If we had a connection in the last 30 seconds, don't show modal yet
        // This prevents modal flashing during brief disconnections
        if (timeSinceLastConnection > 30000 && !recentlyLoggedIn) {
          console.log('No connection after grace period, showing login modal');
          setShowLoginModal(true);
        } else if (recentlyLoggedIn) {
          console.log('User recently logged in, suppressing modal');
        }
      }
    }, 30000); // 30 second grace period (increased from 10)

    return () => clearTimeout(graceTimer);
  }, [isInitialized, isConnected, currentCall, getConnectionMetadata]);

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
    isReconnecting,
    showLoginModal,
    openLoginModal: () => setShowLoginModal(true),
  };
};
