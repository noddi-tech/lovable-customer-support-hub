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
  initializationPhase: 'idle' | 'creating-workspace' | 'workspace-ready' | 'logging-in' | 'logged-in' | 'failed';
  handleManualLoginConfirm: () => void;
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
  const [initializationPhase, setInitializationPhase] = useState<'idle' | 'creating-workspace' | 'workspace-ready' | 'logging-in' | 'logged-in' | 'failed'>('idle');
  const initAttemptedRef = useRef(false);
  const loginGracePeriodRef = useRef<NodeJS.Timeout | null>(null);
  const loginPollingRef = useRef<NodeJS.Timeout | null>(null);
  const loginTimeoutWarningRef = useRef<NodeJS.Timeout | null>(null);
  
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const BASE_RECONNECT_DELAY = 1000;
  const GRACE_PERIOD_MS = 30000;
  const [isPostOAuthSync, setIsPostOAuthSync] = useState(false);

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
        // Container is guaranteed to exist in HTML - direct check
        let container = document.querySelector('#aircall-workspace-container') as HTMLElement;
        
        if (!container) {
          // Fallback: Create container imperatively if somehow missing
          console.warn('[AircallProvider] Container missing - creating imperatively');
          container = document.createElement('div');
          container.id = 'aircall-workspace-container';
          container.className = 'aircall-hidden';
          document.body.appendChild(container);
        }
        
        console.log('[AircallProvider] ✅ Container ready in DOM');
        
        console.log('[AircallProvider] Initializing SDK...');
        
        console.log('[AircallProvider] 🚀 Starting SDK initialization...');
        setInitializationPhase('creating-workspace');
        
        await aircallPhone.initialize({
          apiId,
          apiToken,
          domainName: everywhereConfig.domainName || window.location.hostname,
          onLogin: () => {
            console.log('[AircallProvider] 🎯 Layer 1: onLogin callback received');
            
            // Clear all polling/timeout timers
            if (loginPollingRef.current) {
              clearInterval(loginPollingRef.current);
              loginPollingRef.current = null;
              console.log('[AircallProvider] 🧹 Cleared login polling');
            }
            if (loginTimeoutWarningRef.current) {
              clearTimeout(loginTimeoutWarningRef.current);
              loginTimeoutWarningRef.current = null;
            }
            
            aircallPhone.setLoginStatus(true);
            saveConnectionMetadata();
            setIsConnected(true);
            setShowLoginModal(false);
            setError(null);
            setInitializationPhase('logged-in');
            reconnectAttempts.current = 0;
            
            // Keep container visible for 5 seconds, then auto-hide
            const container = document.querySelector('#aircall-workspace-container') as HTMLElement;
            if (container) {
              container.classList.add('aircall-visible');
              container.classList.remove('aircall-hidden');
              
              setTimeout(() => {
                container.classList.add('aircall-hidden');
                container.classList.remove('aircall-visible');
                console.log('[AircallProvider] Container auto-hidden after login');
              }, 5000);
            }
            
            // Start grace period
            if (loginGracePeriodRef.current) {
              clearTimeout(loginGracePeriodRef.current);
            }
            loginGracePeriodRef.current = setTimeout(() => {
              console.log('[AircallProvider] Grace period ended');
              loginGracePeriodRef.current = null;
            }, GRACE_PERIOD_MS);
            
            toast({
              title: '✅ Logged In Successfully',
              description: 'You are now connected to Aircall',
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
              console.log('[AircallProvider] Confirmed logout, showing container for re-login');
              aircallPhone.clearLoginStatus();
              setShowLoginModal(true);
              
              // Show container again for re-login
              const container = document.querySelector('#aircall-workspace-container') as HTMLElement;
              if (container) {
                container.classList.add('aircall-visible');
                container.classList.remove('aircall-hidden');
              }
              
              handleDisconnection();
            }
          }
        });

        // Check if workspace was created (not if user is logged in yet)
        const workspaceCreated = aircallPhone.isWorkspaceCreated();
        console.log('[AircallProvider] Workspace created:', workspaceCreated);
        
        if (workspaceCreated) {
          setIsInitialized(true);
          setInitializationPhase('workspace-ready');
          console.log('[AircallProvider] ✅ Aircall workspace initialized');
          
          // Show success toast
          toast({
            title: 'Aircall Ready',
            description: 'Please log in through the workspace to start receiving calls',
          });
          
          // Phase 5: Extended polling configuration
          console.log('[AircallProvider] 🎯 Layer 2: Starting login detection polling');
          let pollAttempts = 0;
          const MAX_POLL_ATTEMPTS = 40; // 120 seconds total (40 * 3s)
          let lastPolledStatus = false; // Track status to reduce noise
          
          loginPollingRef.current = setInterval(() => {
            pollAttempts++;
            console.log(`[AircallProvider] 🔍 Layer 2: Polling login status (attempt ${pollAttempts}/${MAX_POLL_ATTEMPTS}) at ${new Date().toISOString()}`);
            
            aircallPhone.checkLoginStatus((isLoggedIn) => {
              // Only log if status changed
              if (isLoggedIn !== lastPolledStatus) {
                console.log(`[AircallProvider] 🔍 Layer 2: Poll result - logged in: ${isLoggedIn} (changed from ${lastPolledStatus})`);
                lastPolledStatus = isLoggedIn;
              }
              
              if (isLoggedIn) {
                console.log('[AircallProvider] 🎯 Layer 2: Login detected via polling!');
                
                // Clear polling
                if (loginPollingRef.current) {
                  clearInterval(loginPollingRef.current);
                  loginPollingRef.current = null;
                }
                if (loginTimeoutWarningRef.current) {
                  clearTimeout(loginTimeoutWarningRef.current);
                  loginTimeoutWarningRef.current = null;
                }
                
                // Clear post-OAuth sync state
                setIsPostOAuthSync(false);
                
                // Manually trigger login flow
                aircallPhone.setLoginStatus(true);
                saveConnectionMetadata();
                setIsConnected(true);
                setShowLoginModal(false);
                setError(null);
                setInitializationPhase('logged-in');
                reconnectAttempts.current = 0;
                
                // Auto-hide container
                const container = document.querySelector('#aircall-workspace-container') as HTMLElement;
                if (container) {
                  container.classList.add('aircall-visible');
                  container.classList.remove('aircall-hidden');
                  
                  setTimeout(() => {
                    container.classList.add('aircall-hidden');
                    container.classList.remove('aircall-visible');
                  }, 5000);
                }
                
                toast({
                  title: '✅ Login Detected',
                  description: 'You are now connected to Aircall',
                });
              }
            });
            
            // Stop polling after max attempts
            if (pollAttempts >= MAX_POLL_ATTEMPTS) {
              console.log('[AircallProvider] ⏱️ Layer 2: Polling timeout reached after 120 seconds');
              if (loginPollingRef.current) {
                clearInterval(loginPollingRef.current);
                loginPollingRef.current = null;
              }
              setIsPostOAuthSync(false);
            }
          }, 3000); // Phase 5: Check every 3 seconds (increased frequency)
          
          // Layer 5: Timeout warning after 30 seconds
          loginTimeoutWarningRef.current = setTimeout(() => {
            if (!aircallPhone.getLoginStatus()) {
              console.log('[AircallProvider] ⏰ Layer 5: Login timeout warning');
              toast({
                title: 'Still Waiting for Login',
                description: 'Please log in through the Aircall window.',
                duration: 8000,
              });
            }
          }, 30000); // Show warning after 30 seconds
        } else {
          console.error('[AircallProvider] ❌ Workspace creation failed');
          setIsInitialized(false);
          setInitializationPhase('failed');
          setError('Workspace creation failed');
          
          toast({
            title: 'Initialization Failed',
            description: 'Unable to create Aircall workspace. Check your API credentials.',
            variant: 'destructive'
          });
          return;
        }
        
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
          
          // Optional: Warn user if they don't log in within 30 seconds
          setTimeout(() => {
            if (!aircallPhone.getLoginStatus()) {
              toast({
                title: 'Login Reminder',
                description: 'Please log in to Aircall to receive calls',
              });
            }
          }, 30000);
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
      if (loginPollingRef.current) {
        clearInterval(loginPollingRef.current);
      }
      if (loginTimeoutWarningRef.current) {
        clearTimeout(loginTimeoutWarningRef.current);
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
        
        // Keep currentCall visible for 5 seconds so users can see the phone bar
        setTimeout(() => {
          console.log('[AircallProvider] 🧹 Clearing currentCall after delay');
          setCurrentCall(null);
        }, 5000);
        
        // Update database record immediately
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

  // Phase 1: OAuth redirect detection
  useEffect(() => {
    const checkOAuthReturn = () => {
      const url = new URL(window.location.href);
      const params = url.searchParams;
      
      // Check for various OAuth success indicators
      const isOAuthSuccess = 
        params.get('flow') === 'cti' ||
        window.location.pathname.includes('/login/success') ||
        document.referrer.includes('auth.aircall.io');
      
      if (isOAuthSuccess && !isConnected) {
        console.log('[AircallProvider] 🎯 Phase 1: OAuth redirect detected!', {
          flow: params.get('flow'),
          pathname: window.location.pathname,
          referrer: document.referrer
        });
        
        setIsPostOAuthSync(true);
        
        // Phase 2: Force SDK refresh
        console.log('[AircallProvider] 🔄 Phase 2: Triggering SDK refresh after OAuth');
        aircallPhone.refreshWorkspace();
        
        toast({
          title: 'Syncing Authentication...',
          description: 'Detecting your Aircall login',
          duration: 5000
        });
        
        // Trigger aggressive polling
        if (loginPollingRef.current) {
          clearInterval(loginPollingRef.current);
        }
        
        let aggressivePollAttempts = 0;
        const AGGRESSIVE_MAX_ATTEMPTS = 30; // 30 seconds at 1s interval
        
        loginPollingRef.current = setInterval(() => {
          aggressivePollAttempts++;
          console.log(`[AircallProvider] 🚀 Phase 1: Aggressive OAuth polling (${aggressivePollAttempts}/${AGGRESSIVE_MAX_ATTEMPTS})`);
          
          aircallPhone.checkLoginStatus((isLoggedIn) => {
            console.log(`[AircallProvider] 🚀 Phase 1: OAuth poll result: ${isLoggedIn}`);
            
            if (isLoggedIn) {
              console.log('[AircallProvider] 🎉 Phase 1: OAuth login confirmed!');
              
              if (loginPollingRef.current) {
                clearInterval(loginPollingRef.current);
                loginPollingRef.current = null;
              }
              
              setIsPostOAuthSync(false);
              aircallPhone.setLoginStatus(true);
              saveConnectionMetadata();
              setIsConnected(true);
              setShowLoginModal(false);
              setError(null);
              setInitializationPhase('logged-in');
              
              toast({
                title: '✅ Login Successful',
                description: 'Connected to Aircall',
              });
            }
          });
          
          if (aggressivePollAttempts >= AGGRESSIVE_MAX_ATTEMPTS) {
            console.log('[AircallProvider] ⏱️ Phase 1: Aggressive polling timeout');
            if (loginPollingRef.current) {
              clearInterval(loginPollingRef.current);
              loginPollingRef.current = null;
            }
            setIsPostOAuthSync(false);
          }
        }, 1000); // Aggressive: every 1 second
      }
    };
    
    checkOAuthReturn();
    
    // Phase 3: PostMessage listener for cross-origin auth messages
    const handleAuthMessage = (event: MessageEvent) => {
      // Only accept messages from Aircall domains
      if (!event.origin.includes('aircall.io')) {
        return;
      }
      
      console.log('[AircallProvider] 🎯 Phase 3: Received postMessage from Aircall', {
        origin: event.origin,
        data: event.data
      });
      
      // Check for authentication success signals
      if (
        event.data?.type === 'auth_success' ||
        event.data?.authenticated === true ||
        event.data?.status === 'logged_in'
      ) {
        console.log('[AircallProvider] 🎉 Phase 3: Auth success detected via postMessage');
        
        setIsPostOAuthSync(true);
        aircallPhone.refreshWorkspace();
        
        // Trigger immediate check
        setTimeout(() => {
          aircallPhone.checkLoginStatus((isLoggedIn) => {
            if (isLoggedIn) {
              aircallPhone.setLoginStatus(true);
              saveConnectionMetadata();
              setIsConnected(true);
              setShowLoginModal(false);
              setError(null);
              setInitializationPhase('logged-in');
              setIsPostOAuthSync(false);
              
              toast({
                title: '✅ Login Detected',
                description: 'Connected to Aircall',
              });
            }
          });
        }, 500);
      }
    };
    
    window.addEventListener('message', handleAuthMessage);
    
    return () => {
      window.removeEventListener('message', handleAuthMessage);
    };
  }, [isConnected, saveConnectionMetadata, toast]);

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

  const openLoginModal = useCallback(() => {
    setShowLoginModal(true);
  }, []);

  // Phase 4: Enhanced manual login confirmation handler with retry
  const handleManualLoginConfirm = useCallback(() => {
    console.log('[AircallProvider] 🎯 Phase 4: Manual login confirmation clicked');
    
    setIsPostOAuthSync(true);
    
    // First, refresh workspace
    aircallPhone.refreshWorkspace();
    
    // Immediate check
    aircallPhone.checkLoginStatus((isLoggedIn) => {
      console.log(`[AircallProvider] 🎯 Phase 4: Initial check - logged in: ${isLoggedIn}`);
      
      if (isLoggedIn) {
        // Clear all timers
        if (loginPollingRef.current) {
          clearInterval(loginPollingRef.current);
          loginPollingRef.current = null;
        }
        if (loginTimeoutWarningRef.current) {
          clearTimeout(loginTimeoutWarningRef.current);
          loginTimeoutWarningRef.current = null;
        }
        
        // Complete login flow
        setIsPostOAuthSync(false);
        aircallPhone.setLoginStatus(true);
        saveConnectionMetadata();
        setIsConnected(true);
        setShowLoginModal(false);
        setError(null);
        setInitializationPhase('logged-in');
        
        // Auto-hide container
        const container = document.querySelector('#aircall-workspace-container') as HTMLElement;
        if (container) {
          container.classList.add('aircall-visible');
          container.classList.remove('aircall-hidden');
          
          setTimeout(() => {
            container.classList.add('aircall-hidden');
            container.classList.remove('aircall-visible');
          }, 5000);
        }
        
        toast({
          title: '✅ Login Confirmed',
          description: 'You are now connected to Aircall',
        });
      } else {
        // Phase 4: Auto-retry with delay
        console.log('[AircallProvider] 🔄 Phase 4: First check failed, retrying in 2 seconds...');
        
        toast({
          title: 'Checking Login Status...',
          description: 'Please wait while we verify your connection',
        });
        
        setTimeout(() => {
          aircallPhone.checkLoginStatus((retryIsLoggedIn) => {
            console.log(`[AircallProvider] 🎯 Phase 4: Retry check - logged in: ${retryIsLoggedIn}`);
            
            setIsPostOAuthSync(false);
            
            if (retryIsLoggedIn) {
              // Clear all timers
              if (loginPollingRef.current) {
                clearInterval(loginPollingRef.current);
                loginPollingRef.current = null;
              }
              if (loginTimeoutWarningRef.current) {
                clearTimeout(loginTimeoutWarningRef.current);
                loginTimeoutWarningRef.current = null;
              }
              
              aircallPhone.setLoginStatus(true);
              saveConnectionMetadata();
              setIsConnected(true);
              setShowLoginModal(false);
              setError(null);
              setInitializationPhase('logged-in');
              
              const container = document.querySelector('#aircall-workspace-container') as HTMLElement;
              if (container) {
                container.classList.add('aircall-visible');
                container.classList.remove('aircall-hidden');
                
                setTimeout(() => {
                  container.classList.add('aircall-hidden');
                  container.classList.remove('aircall-visible');
                }, 5000);
              }
              
              toast({
                title: '✅ Login Confirmed',
                description: 'You are now connected to Aircall',
              });
            } else {
              toast({
                title: 'Not Logged In Yet',
                description: 'Please complete the login in the Aircall window, then try again',
                variant: 'destructive',
              });
            }
          });
        }, 2000);
      }
    });
  }, [saveConnectionMetadata, toast]);

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
    showLoginModal: showLoginModal && !isPostOAuthSync, // Hide modal during OAuth sync
    openLoginModal,
    showWorkspace: () => aircallPhone.showWorkspace(),
    hideWorkspace: () => aircallPhone.hideWorkspace(),
    initializationPhase,
    handleManualLoginConfirm,
  };

  return (
    <AircallContext.Provider value={value}>
      {children}
    </AircallContext.Provider>
  );
};

export { AircallContext };
