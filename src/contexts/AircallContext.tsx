import { createContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { aircallPhone, type AircallCall } from '@/lib/aircall-phone';
import { aircallEventBridge } from '@/lib/aircall-event-bridge';
import { useVoiceIntegrations } from '@/hooks/useVoiceIntegrations';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { detectBrowser } from '@/lib/browser-detection';

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
  showBlockedModal: boolean;
  diagnosticIssues: string[];
  openLoginModal: () => void;
  showWorkspace: () => void;
  hideWorkspace: () => void;
  initializationPhase: 'idle' | 'diagnostics' | 'creating-workspace' | 'workspace-ready' | 'logging-in' | 'logged-in' | 'failed';
  handleManualLoginConfirm: () => void;
  retryConnection: () => void;
  openIncognito: () => void;
  skipPhoneIntegration: () => void;
  isWaitingForWorkspace?: boolean;
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
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [diagnosticIssues, setDiagnosticIssues] = useState<string[]>([]);
  const [initializationPhase, setInitializationPhase] = useState<'idle' | 'diagnostics' | 'creating-workspace' | 'workspace-ready' | 'logging-in' | 'logged-in' | 'failed'>('idle');
  const initAttemptedRef = useRef(false);
  const loginGracePeriodRef = useRef<NodeJS.Timeout | null>(null);
  const loginPollingRef = useRef<NodeJS.Timeout | null>(null);
  const loginTimeoutWarningRef = useRef<NodeJS.Timeout | null>(null);
  const blockingErrorListenerRef = useRef<((e: ErrorEvent) => void) | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
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
    // PHASE 1: Check opt-out FIRST before ANY Aircall code runs
    const isOptedOut = sessionStorage.getItem('aircall_opted_out') === 'true';
    if (isOptedOut) {
      console.log('[AircallProvider] ⏭️  User opted out of phone integration');
      setInitializationPhase('failed');
      setError('Phone integration disabled for this session');
      return;
    }

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
      // PHASE 5: Wrap entire initialization in try-catch
      try {
        // Phase 0: Check browser compatibility FIRST
        console.log('[AircallProvider] 🔍 Checking browser compatibility...');
        const browserInfo = await detectBrowser();
        console.log('[AircallProvider] Browser detected:', browserInfo.name, '| Supported:', browserInfo.isSupported, '| Requires config:', browserInfo.requiresConfiguration);
        
        if (!browserInfo.isSupported) {
          console.error('[AircallProvider] ❌ UNSUPPORTED BROWSER - STOPPING INITIALIZATION');
          console.error('[AircallProvider] Browser:', browserInfo.name);
          console.error('[AircallProvider] Recommendation:', browserInfo.recommendation);
          setDiagnosticIssues([`unsupported_browser_${browserInfo.type}`]);
          setShowBlockedModal(true);
          setInitializationPhase('failed');
          
          toast({
            title: 'Browser Not Supported',
            description: `Aircall requires Google Chrome. You're using ${browserInfo.name}.`,
            variant: 'destructive',
            duration: 15000,
          });
          
          return; // DO NOT PROCEED
        }
        
        if (browserInfo.requiresConfiguration) {
          console.warn('[AircallProvider] ⚠️ Browser requires configuration:', browserInfo.name);
          console.warn('[AircallProvider] Recommendation:', browserInfo.recommendation);
        }
        
        // Phase 1: Create AbortController for short-circuit capability
        abortControllerRef.current = new AbortController();
        
        // Phase 2: Setup error listener BEFORE initialization
        blockingErrorListenerRef.current = (e: ErrorEvent) => {
          const errorMsg = e.message || '';
          if (errorMsg.includes('ERR_BLOCKED_BY_CLIENT') || errorMsg.includes('blocked by client')) {
            console.error('[AircallProvider] ❌ Network blocking detected via error event');
            setDiagnosticIssues(['network_blocked']);
            setShowBlockedModal(true);
            setInitializationPhase('failed');
            
            // Short-circuit initialization
            abortControllerRef.current?.abort();
            
            toast({
              title: 'Aircall Blocked',
              description: 'Network requests are being blocked. Please disable ad blockers.',
              variant: 'destructive',
              duration: 10000,
            });
          }
        };
        
        // Attach error listener with capture phase
        window.addEventListener('error', blockingErrorListenerRef.current, true);
        
        // Phase 1: STOP EVERYTHING if blocking detected
        console.log('[AircallProvider] 🚀 Phase 1: Running BULLETPROOF diagnostics...');
        setInitializationPhase('diagnostics');
        
        const diagnostic = await aircallPhone.diagnoseEnvironment();
        
        if (diagnostic.hasIssues) {
          console.error('[AircallProvider] ❌ BLOCKING DETECTED - STOPPING INITIALIZATION');
          console.error('[AircallProvider] Issues:', diagnostic.issues);
          setDiagnosticIssues(diagnostic.issues);
          setShowBlockedModal(true);
          setInitializationPhase('failed');
          
          // Show toast immediately
          toast({
            title: 'Aircall Blocked',
            description: 'Browser extensions are blocking Aircall. Please follow the instructions.',
            variant: 'destructive',
            duration: 10000,
          });
          
          return; // DO NOT PROCEED
        }
        
        console.log('[AircallProvider] ✅ Diagnostics passed, continuing initialization');
        
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
        
        console.log('[AircallProvider] 🚀 Starting SDK initialization...');
        setInitializationPhase('creating-workspace');
        
        // Phase 1: Pass onProgress callback to monitor initialization
        await aircallPhone.initialize({
          apiId,
          apiToken,
          domainName: everywhereConfig.domainName || window.location.hostname,
          onLogin: () => {
            console.log('[AircallProvider] 🎯 Layer 1: onLogin callback received');
            
            // Phase 5: Cleanup error listener on successful login
            if (blockingErrorListenerRef.current) {
              window.removeEventListener('error', blockingErrorListenerRef.current, true);
              blockingErrorListenerRef.current = null;
            }
            
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
        }, abortControllerRef.current.signal); // Phase 1: Pass AbortSignal

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
          
          // Phase 4: SIMPLIFIED - just 5-second polling for 2 minutes, NO OAUTH LOGIC
          console.log('[AircallProvider] 🎯 Phase 4: Starting SIMPLE login polling (5s intervals, 2min total)');
          let pollAttempts = 0;
          const MAX_POLL_ATTEMPTS = 24; // 2 minutes (24 * 5s)
          let lastPolledStatus = false;
          
          loginPollingRef.current = setInterval(() => {
            pollAttempts++;
            
            aircallPhone.checkLoginStatus((isLoggedIn) => {
              if (isLoggedIn !== lastPolledStatus) {
                console.log(`[AircallProvider] 🔍 Login status: ${isLoggedIn}`);
                lastPolledStatus = isLoggedIn;
              }
              
              if (isLoggedIn) {
                console.log('[AircallProvider] ✅ Login detected via polling!');
                
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
                reconnectAttempts.current = 0;
                
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
            
            if (pollAttempts >= MAX_POLL_ATTEMPTS) {
              console.log('[AircallProvider] ⏱️ Polling timeout reached after 2 minutes');
              if (loginPollingRef.current) {
                clearInterval(loginPollingRef.current);
                loginPollingRef.current = null;
              }
              toast({
                title: 'Manual Login Available',
                description: 'Click the verification button in the login modal',
                duration: 10000,
              });
            }
          }, 5000);
          
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
      } catch (initError: any) {
        // PHASE 5: Permanent error state - don't let React retry
        console.error('[AircallProvider] ❌ FATAL: Initialization failed permanently:', initError);
        
        // Phase 5: Cleanup error listener
        if (blockingErrorListenerRef.current) {
          window.removeEventListener('error', blockingErrorListenerRef.current, true);
          blockingErrorListenerRef.current = null;
        }
        
        setInitializationPhase('failed');
        setError(`Initialization failed: ${initError.message}`);
        setIsInitialized(false);
        
        toast({
          title: 'Phone Integration Failed',
          description: 'Unable to initialize Aircall. You can skip this integration.',
          variant: 'destructive',
          duration: 10000,
        });
        
        return; // Exit permanently
      }
    };

    initialize();

    // ONLY cleanup on actual app unmount (browser close)
    return () => {
      console.log('[AircallProvider] 🛑 App unmounting, cleaning up Aircall');
      
      // Phase 5: Cleanup error listener
      if (blockingErrorListenerRef.current) {
        window.removeEventListener('error', blockingErrorListenerRef.current, true);
        blockingErrorListenerRef.current = null;
      }
      
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

  // Phase 4: REMOVED - no OAuth detection or complex reload logic

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

  // Phase 5: Enhanced manual login confirmation handler with workspace reload
  const handleManualLoginConfirm = useCallback(async () => {
    console.log('[AircallProvider] 🎯 Phase 5: Manual login confirmation clicked');
    
    setIsPostOAuthSync(true);
    
    toast({
      title: 'Verifying Login...',
      description: 'Reloading workspace to sync authentication',
      duration: 3000
    });
    
    // Phase 5: Force reload workspace iframe
    await aircallPhone.reloadWorkspace();
    
    // Wait for reload, then check
    setTimeout(() => {
      aircallPhone.checkLoginStatus((isLoggedIn) => {
        console.log(`[AircallProvider] 🎯 Phase 5: Initial check after reload - logged in: ${isLoggedIn}`);
        
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
          // Phase 5: Auto-retry with delay
          console.log('[AircallProvider] 🔄 Phase 5: First check failed, retrying in 2 seconds...');
          
          toast({
            title: 'Still Checking...',
            description: 'Verifying your connection',
          });
          
          setTimeout(() => {
            aircallPhone.checkLoginStatus((retryIsLoggedIn) => {
              console.log(`[AircallProvider] 🎯 Phase 5: Retry check - logged in: ${retryIsLoggedIn}`);
              
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
  }, 2000); // Wait 2 seconds for reload before checking
}, [saveConnectionMetadata, toast]);

  const retryConnection = useCallback(() => {
    console.log('[AircallProvider] 🔄 Retrying connection after fixing blocks');
    setShowBlockedModal(false);
    setDiagnosticIssues([]);
    initAttemptedRef.current = false;
    window.location.reload();
  }, []);

  const openIncognito = useCallback(() => {
    console.log('[AircallProvider] 🔓 Opening in incognito mode');
    window.open(window.location.href, '_blank');
  }, []);

  const skipPhoneIntegration = useCallback(() => {
    console.log('[AircallProvider] 🚪 User opted to skip phone integration');
    
    // Phase 5: Cleanup error listener when opting out
    if (blockingErrorListenerRef.current) {
      window.removeEventListener('error', blockingErrorListenerRef.current, true);
      blockingErrorListenerRef.current = null;
    }
    
    sessionStorage.setItem('aircall_opted_out', 'true');
    setShowLoginModal(false);
    setShowBlockedModal(false);
    
    toast({
      title: 'Phone Integration Disabled',
      description: 'Aircall integration disabled for this session',
    });
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
    showLoginModal: showLoginModal && !isPostOAuthSync,
    showBlockedModal,
    diagnosticIssues,
    openLoginModal,
    showWorkspace: () => aircallPhone.showWorkspace(),
    hideWorkspace: () => aircallPhone.hideWorkspace(),
    initializationPhase,
    handleManualLoginConfirm,
    retryConnection,
    openIncognito,
    skipPhoneIntegration,
  };

  return (
    <AircallContext.Provider value={value}>
      {children}
    </AircallContext.Provider>
  );
};

export { AircallContext };
