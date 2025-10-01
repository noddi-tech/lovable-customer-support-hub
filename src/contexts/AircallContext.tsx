import { createContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { aircallPhone, type AircallCall } from '@/lib/aircall-phone';
import { aircallEventBridge } from '@/lib/aircall-event-bridge';
import { useVoiceIntegrations } from '@/hooks/useVoiceIntegrations';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AircallContextValue {
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
  showWorkspace: () => void;
  hideWorkspace: () => void;
}

const AircallContext = createContext<AircallContextValue | null>(null);

interface AircallProviderProps {
  children: ReactNode;
}

/**
 * Aircall Context Provider
 * 
 * Manages a single instance of Aircall SDK across the entire application.
 * This prevents re-initialization and state loss when components mount/unmount.
 */
export const AircallProvider = ({ children }: AircallProviderProps) => {
  const { toast } = useToast();
  const { profile } = useAuth();
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
  const BASE_RECONNECT_DELAY = 1000;
  const GRACE_PERIOD_MS = 30000;

  // Get Aircall integration config
  const aircallConfig = getIntegrationByProvider('aircall');
  const everywhereConfig = aircallConfig?.configuration?.aircallEverywhere;

  // Store connection metadata for state preservation
  const saveConnectionMetadata = useCallback(() => {
    localStorage.setItem('aircall_connection_timestamp', Date.now().toString());
    localStorage.setItem('aircall_connection_attempts', reconnectAttempts.current.toString());
    console.log('[AircallProvider] 💾 Saved connection metadata');
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
      console.error('[AircallProvider] Max reconnection attempts reached');
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
    
    console.log(`[AircallProvider] Reconnection attempt ${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
    
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
            console.log('[AircallProvider] ✅ Reconnected successfully');
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
            console.warn('[AircallProvider] Connection lost during reconnection');
            setIsConnected(false);
          }
        });

        setIsInitialized(true);
      } catch (err: any) {
        console.error('[AircallProvider] Reconnection error:', err);
        attemptReconnect();
      }
    }, delay);
  }, [everywhereConfig, toast]);

  // Handle disconnection
  const handleDisconnection = useCallback(() => {
    console.warn('[AircallProvider] Connection lost, attempting reconnection...');
    setIsConnected(false);
    setIsReconnecting(true);
    
    toast({
      title: 'Connection Lost',
      description: 'Attempting to reconnect...',
    });
    
    attemptReconnect();
  }, [attemptReconnect, toast]);

  /**
   * Initialize Aircall Workspace (ONCE per app lifecycle)
   */
  useEffect(() => {
    if (initAttemptedRef.current || !everywhereConfig?.enabled) {
      return;
    }

    const apiId = everywhereConfig.apiId;
    const apiToken = everywhereConfig.apiToken;

    if (!apiId || !apiToken) {
      console.warn('[AircallProvider] Missing API credentials');
      return;
    }

    console.log('[AircallProvider] 🚀 Initializing Aircall Everywhere (single instance)');
    initAttemptedRef.current = true;

    const initialize = async () => {
      try {
        await aircallPhone.initialize({
          apiId,
          apiToken,
          domainName: everywhereConfig.domainName || window.location.hostname,
          onLogin: () => {
            console.log('[AircallProvider] ✅ Logged in via callback');
            aircallPhone.setLoginStatus(true);
            saveConnectionMetadata();
            setIsConnected(true);
            setShowLoginModal(false);
            setError(null);
            reconnectAttempts.current = 0;
            
            // SDK with size: 'small' automatically minimizes after login
            console.log('[AircallProvider] Login successful, SDK will auto-minimize');
            
            // Start grace period
            if (loginGracePeriodRef.current) {
              clearTimeout(loginGracePeriodRef.current);
            }
            loginGracePeriodRef.current = setTimeout(() => {
              console.log('[AircallProvider] Grace period ended');
              loginGracePeriodRef.current = null;
            }, GRACE_PERIOD_MS);
            
            toast({
              title: 'Aircall Connected',
              description: 'Phone system is ready',
            });
          },
          onLogout: () => {
            console.log('[AircallProvider] 🔌 Logout event received');
            
            // If in grace period, likely network issue
            if (loginGracePeriodRef.current) {
              console.log('[AircallProvider] Ignoring logout during grace period');
              return;
            }
            
            const wasLoggedIn = aircallPhone.getLoginStatus();
            
            if (wasLoggedIn) {
              console.log('[AircallProvider] Handling disconnection, keeping login state');
              handleDisconnection();
            } else {
              console.log('[AircallProvider] Confirmed logout, showing modal');
              aircallPhone.clearLoginStatus();
              setShowLoginModal(true);
              handleDisconnection();
            }
          }
        });

        setIsInitialized(true);
        console.log('[AircallProvider] ✅ Initialization complete');
        
        const metadata = getConnectionMetadata();
        const now = Date.now();
        const recentConnection = metadata.timestamp && (now - metadata.timestamp) < 300000;
        
        const wasLoggedIn = aircallPhone.getLoginStatus();
        console.log('[AircallProvider] Restored login status:', wasLoggedIn);
        
        if (wasLoggedIn) {
          if (recentConnection) {
            console.log('[AircallProvider] 🔄 Recent connection detected, restoring state...');
            reconnectAttempts.current = metadata.attempts;
          }
          
          aircallPhone.checkLoginStatus((isLoggedIn) => {
            console.log('[AircallProvider] SDK login status verification:', isLoggedIn);
            if (isLoggedIn) {
              saveConnectionMetadata();
              setIsConnected(true);
              setShowLoginModal(false);
              toast({
                title: 'Aircall Connected',
                description: 'Phone system is ready',
              });
            } else if (recentConnection && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
              console.log('[AircallProvider] 🔄 Attempting silent reconnection...');
              attemptReconnect();
            } else {
              console.log('[AircallProvider] ❌ Verification failed - clearing stale state');
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
        console.error('[AircallProvider] ❌ Initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize');
        toast({
          title: 'Aircall Connection Failed',
          description: 'Unable to connect to Aircall. Please check your settings.',
          variant: 'destructive'
        });
      }
    };

    initialize();

    // ONLY cleanup on actual app unmount (browser close)
    return () => {
      console.log('[AircallProvider] 🛑 App unmounting, cleaning up Aircall');
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (loginGracePeriodRef.current) {
        clearTimeout(loginGracePeriodRef.current);
      }
      // Only disconnect when app actually unmounts
      if (aircallPhone.isReady()) {
        aircallPhone.disconnect();
      }
    };
  }, [everywhereConfig, toast, handleDisconnection, saveConnectionMetadata, getConnectionMetadata, attemptReconnect]);

  /**
   * Register SDK event handlers
   */
  useEffect(() => {
    if (!isInitialized) return;

    console.log('[AircallProvider] 📡 Registering event handlers');
    console.log('[AircallProvider] SDK ready state:', aircallPhone.isReady());
    console.log('[AircallProvider] Has profile:', !!profile, 'Has org_id:', !!profile?.organization_id);

    const handleIncomingCall = async (call: AircallCall) => {
      const shouldProcess = aircallEventBridge.processSDKEvent({
        type: 'incoming_call',
        call,
        timestamp: Date.now()
      });

      if (shouldProcess) {
        console.log('[AircallProvider] 📞 Incoming call (SDK):', call);
        console.log('[AircallProvider] Profile state:', { 
          hasProfile: !!profile, 
          hasOrgId: !!profile?.organization_id,
          orgId: profile?.organization_id 
        });
        setCurrentCall(call);
        
        // Sync to database to trigger IncomingCallModal
        if (!profile?.organization_id) {
          console.error('[AircallProvider] ❌ Cannot sync call - missing profile or organization_id');
          toast({
            title: 'Call Sync Failed',
            description: 'Unable to save call data. Please refresh the page.',
            variant: 'destructive'
          });
          return;
        }
        
        try {
          const { data: existingCall } = await supabase
              .from('calls')
              .select('id')
              .eq('external_id', String(call.call_id))
              .maybeSingle();
            
            if (!existingCall) {
              const { error } = await supabase
                .from('calls')
                .insert([{
                  external_id: String(call.call_id),
                  organization_id: profile.organization_id,
                  direction: 'inbound' as const,
                  status: 'ringing' as const,
                  customer_phone: call.from || call.phone_number || '',
                  agent_phone: call.to || '',
                  started_at: new Date().toISOString(),
                  metadata: call as any
                }]);
              
              if (error) {
                console.error('[AircallProvider] Failed to sync incoming call to DB:', error);
              } else {
                console.log('[AircallProvider] ✅ Incoming call synced to database');
              }
          }
        } catch (err) {
          console.error('[AircallProvider] Error syncing incoming call:', err);
        }
      }
    };

    const handleCallEnded = async (call: AircallCall) => {
      const shouldProcess = aircallEventBridge.processSDKEvent({
        type: 'call_ended',
        call,
        timestamp: Date.now()
      });

      if (shouldProcess) {
        console.log('[AircallProvider] 🔚 Call ended (SDK):', call);
        setCurrentCall(null);
        
        // Update database record
        if (profile?.organization_id) {
          try {
            const { error } = await supabase
              .from('calls')
              .update({
                status: 'completed',
                ended_at: new Date().toISOString(),
                duration_seconds: call.duration
              })
              .eq('external_id', String(call.call_id));
            
            if (error) {
              console.error('[AircallProvider] Failed to update call end in DB:', error);
            } else {
              console.log('[AircallProvider] ✅ Call end synced to database');
            }
          } catch (err) {
            console.error('[AircallProvider] Error updating call end:', err);
          }
        }
      }
    };

    const handleOutgoingCall = async (call: AircallCall) => {
      const shouldProcess = aircallEventBridge.processSDKEvent({
        type: 'outgoing_call',
        call,
        timestamp: Date.now()
      });

      if (shouldProcess) {
        console.log('[AircallProvider] 📤 Outgoing call (SDK):', call);
        setCurrentCall(call);
        
        // Sync to database
        if (profile?.organization_id) {
          try {
            const { data: existingCall } = await supabase
              .from('calls')
              .select('id')
              .eq('external_id', String(call.call_id))
              .maybeSingle();
            
            if (!existingCall) {
              const { error } = await supabase
                .from('calls')
                .insert([{
                  external_id: String(call.call_id),
                  organization_id: profile.organization_id,
                  direction: 'outbound' as const,
                  status: 'ringing' as const,
                  customer_phone: call.to || call.phone_number || '',
                  agent_phone: call.from || '',
                  started_at: new Date().toISOString(),
                  metadata: call as any
                }]);
              
              if (error) {
                console.error('[AircallProvider] Failed to sync outgoing call to DB:', error);
              } else {
                console.log('[AircallProvider] ✅ Outgoing call synced to database');
              }
            }
          } catch (err) {
            console.error('[AircallProvider] Error syncing outgoing call:', err);
          }
        }
      }
    };

    const unsubIncoming = aircallPhone.on('incoming_call', handleIncomingCall);
    const unsubEnded = aircallPhone.on('call_ended', handleCallEnded);
    const unsubOutgoing = aircallPhone.on('outgoing_call', handleOutgoingCall);
    
    console.log('[AircallProvider] ✅ Event handlers registered successfully');

    return () => {
      console.log('[AircallProvider] 🧹 Unregistering event handlers');
      unsubIncoming();
      unsubEnded();
      unsubOutgoing();
    };
  }, [isInitialized, profile]);

  // Manage modal visibility with grace period
  useEffect(() => {
    if (!isInitialized) return;
    
    const graceTimer = setTimeout(() => {
      if (!isConnected && !currentCall) {
        const metadata = getConnectionMetadata();
        const timeSinceLastConnection = metadata.timestamp 
          ? Date.now() - metadata.timestamp 
          : Infinity;
        
        const recentlyLoggedIn = timeSinceLastConnection < 5 * 60 * 1000;
        
        if (timeSinceLastConnection > 30000 && !recentlyLoggedIn) {
          console.log('[AircallProvider] No connection after grace period, showing login modal');
          setShowLoginModal(true);
        } else if (recentlyLoggedIn) {
          console.log('[AircallProvider] User recently logged in, suppressing modal');
        }
      }
    }, 30000);

    return () => clearTimeout(graceTimer);
  }, [isInitialized, isConnected, currentCall, getConnectionMetadata]);

  /**
   * Call control functions
   */
  const answerCall = useCallback(async () => {
    try {
      await aircallPhone.answerCall();
      console.log('[AircallProvider] ℹ️  User must answer via Aircall Workspace UI');
    } catch (err) {
      toast({
        title: 'Use Aircall Workspace to Answer',
        description: 'Click "Show Aircall" button to interact with the call',
      });
    }
  }, [toast]);

  const rejectCall = useCallback(async () => {
    try {
      await aircallPhone.rejectCall();
      console.log('[AircallProvider] ℹ️  User must reject via Aircall Workspace UI');
    } catch (err) {
      toast({
        title: 'Use Aircall Workspace to Reject',
        description: 'Click "Show Aircall" button to interact with the call',
      });
    }
  }, [toast]);

  const hangUp = useCallback(async () => {
    try {
      await aircallPhone.hangUp();
      console.log('[AircallProvider] ℹ️  User must hang up via Aircall Workspace UI');
    } catch (err) {
      toast({
        title: 'Use Aircall Workspace to End Call',
        description: 'Click "Show Aircall" button to interact with the call',
      });
    }
  }, [toast]);

  const dialNumber = useCallback(async (phoneNumber: string) => {
    try {
      await aircallPhone.dialNumber(phoneNumber);
      console.log('[AircallProvider] ✅ Dialing:', phoneNumber);
    } catch (err) {
      console.error('[AircallProvider] ❌ Failed to dial:', err);
      toast({
        title: 'Failed to Dial',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive'
      });
      throw err;
    }
  }, [toast]);

  const value: AircallContextValue = {
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
    showWorkspace: () => aircallPhone.showWorkspace(),
    hideWorkspace: () => aircallPhone.hideWorkspace(),
  };

  return (
    <AircallContext.Provider value={value}>
      {children}
    </AircallContext.Provider>
  );
};

export { AircallContext };
