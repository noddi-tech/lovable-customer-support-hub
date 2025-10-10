import { createContext, useState, useEffect, useCallback, useRef, ReactNode, useMemo } from 'react';
import { aircallPhone, type AircallCall } from '@/lib/aircall-phone';
import { aircallEventBridge } from '@/lib/aircall-event-bridge';
import { useVoiceIntegrations } from '@/hooks/useVoiceIntegrations';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { detectBrowser } from '@/lib/browser-detection';
import { detectThirdPartyCookies } from '@/lib/cookie-detection';

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
  initializationPhase: 'idle' | 'diagnostics' | 'creating-workspace' | 'workspace-ready' | 'logging-in' | 'logged-in' | 'needs-login' | 'failed';
  handleManualLoginConfirm: () => void;
  retryConnection: () => void;
  openIncognito: () => void;
  skipPhoneIntegration: () => void;
  forceInitialization: () => Promise<void>;
  isWaitingForWorkspace?: boolean;
  workspaceVisible: boolean;
  showAircallWorkspace: (forLogin?: boolean) => void;
  hideAircallWorkspace: () => void;
  workspace: any; // Aircall workspace object
  isWorkspaceReady: boolean; // True when workspace exists and is ready
  checkLoginStatus: () => Promise<boolean>; // Check if user is logged into Aircall
  // PHASE 4: Debug info for recursion guards
  _debugRecursionGuards?: {
    isShowing: boolean;
    isHiding: boolean;
  };
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
  // CRITICAL FIX: Never trust localStorage on initial load - always require fresh login
  const [isConnected, setIsConnected] = useState(false);
  const [currentCall, setCurrentCall] = useState<AircallCall | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  // Workspace visibility state with localStorage persistence
  const [workspaceVisible, setWorkspaceVisible] = useState(() => {
    const saved = localStorage.getItem('aircall_workspace_visible');
    return saved ? saved === 'true' : true; // Default to visible after login
  });
  
  // Only show modal if user hasn't opted out
  const [showLoginModal, setShowLoginModal] = useState(() => {
    if (typeof window === 'undefined') return false;
    const optedOut = sessionStorage.getItem('aircall_opted_out') === 'true';
    // CRITICAL FIX: Always start with modal hidden, let initialization flow control it
    console.log('[AircallProvider] 📱 Initial modal state:', { optedOut, willShow: false });
    return false;
  });
  
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [diagnosticIssues, setDiagnosticIssues] = useState<string[]>([]);
  const [initializationPhase, setInitializationPhase] = useState<'idle' | 'diagnostics' | 'creating-workspace' | 'workspace-ready' | 'logging-in' | 'logged-in' | 'needs-login' | 'failed'>('idle');
  
  // PHASE 2: Workspace readiness state
  const [isWorkspaceReady, setIsWorkspaceReady] = useState(false);
  
  const initAttemptedRef = useRef(false);
  const loginGracePeriodRef = useRef<NodeJS.Timeout | null>(null);
  const loginPollingRef = useRef<NodeJS.Timeout | null>(null);
  const loginTimeoutWarningRef = useRef<NodeJS.Timeout | null>(null);
  const blockingErrorListenerRef = useRef<((e: ErrorEvent) => void) | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // PHASE 3: Reconnection mutex and exponential backoff
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const reconnectionInProgressRef = useRef(false); // Mutex to prevent simultaneous reconnections
  const reconnectionTimeoutRef = useRef<NodeJS.Timeout>();
  const MAX_RECONNECT_ATTEMPTS = 5;
  const BASE_RECONNECT_DELAY = 2000;
  const GRACE_PERIOD_MS = 30000;
  const [isPostOAuthSync, setIsPostOAuthSync] = useState(false);
  
  // PHASE 1 CRITICAL: Recursion guards to prevent infinite loops
  const isShowingWorkspaceRef = useRef(false);
  const isHidingWorkspaceRef = useRef(false);

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

  // Exponential backoff reconnection logic with mutex
  const attemptReconnect = useCallback(async () => {
    // MUTEX: Prevent multiple simultaneous reconnection attempts
    if (reconnectionInProgressRef.current) {
      console.log('[AircallProvider] Already reconnecting, skipping attempt');
      return;
    }
    
    // PHASE 3: Check if Realtime manager or another system recently reconnected (debounce - increased to 5 seconds)
    const lastReconnectAttempt = localStorage.getItem('last_reconnect_attempt');
    if (lastReconnectAttempt) {
      const timeSince = Date.now() - parseInt(lastReconnectAttempt);
      if (timeSince < 5000) { // 5 second debounce (increased from 3)
        console.log('[AircallProvider] 🔒 Recent reconnection attempt detected, waiting...');
        return;
      }
    }
    
    localStorage.setItem('last_reconnect_attempt', Date.now().toString());
    
    if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[AircallProvider] Max reconnection attempts reached');
      setError('Unable to reconnect to Aircall. Please refresh the page.');
      setIsReconnecting(false);
      reconnectionInProgressRef.current = false;
      toast({
        title: 'Connection Failed',
        description: 'Unable to reconnect to phone system',
        variant: 'destructive',
      });
      return;
    }
    
    reconnectionInProgressRef.current = true;

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
            reconnectionInProgressRef.current = false; // Release mutex
            
            toast({
              title: 'Reconnected',
              description: 'Phone system connection restored',
            });
          },
          onLogout: () => {
            console.warn('[AircallProvider] Connection lost during reconnection');
            setIsConnected(false);
            reconnectionInProgressRef.current = false; // Release mutex
          }
        });

        setIsInitialized(true);
      } catch (err: any) {
        console.error('[AircallProvider] Reconnection error:', err);
        reconnectionInProgressRef.current = false; // Release mutex before retry
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

  // ============================================================================
  // PHASE 4: localStorage Wrapper Helpers
  // ============================================================================
  const WORKSPACE_VISIBILITY_KEY = 'aircall_workspace_visible';

  const getWorkspaceVisiblePreference = useCallback((): boolean => {
    const saved = localStorage.getItem(WORKSPACE_VISIBILITY_KEY);
    return saved ? saved === 'true' : true;
  }, []);

  const setWorkspaceVisiblePreference = useCallback((visible: boolean): void => {
    localStorage.setItem(WORKSPACE_VISIBILITY_KEY, visible.toString());
  }, []);

  // ============================================================================
  // PHASE 1-3-5: BULLETPROOF Workspace Visibility Management
  // Single Source of Truth with Idempotence, Race Condition Handling & JSDoc
  // ============================================================================
  
  /**
   * Shows the Aircall workspace with full idempotence and race condition handling.
   * 
   * @remarks
   * - **No auto-hide**: Once shown, workspace remains visible until user explicitly hides it
   * - **Idempotent**: Safe to call multiple times - skips if already visible
   * - **Race condition safe**: Retries up to 3 times if container not yet in DOM
   * - **Persistent**: Saves user preference to localStorage
   * - **Single source of truth**: This is the ONLY function that should show the workspace
   * 
   * @example
   * ```ts
   * // From any component using useAircallPhone()
   * const { showWorkspace } = useAircallPhone();
   * showWorkspace(); // Safe to call repeatedly
   * ```
   */
  const showAircallWorkspace = useCallback((forLogin = false) => {
    // PHASE 1 CRITICAL: RECURSION GUARD - Prevent infinite loop
    if (isShowingWorkspaceRef.current) {
      console.log('[AircallProvider] 🔒 Already showing workspace, skipping recursive call');
      return;
    }
    
    isShowingWorkspaceRef.current = true;
    
    try {
      // CRITICAL FIX: Removed blocking isWorkspaceCreated() check
      // Let the SDK throw its own errors if it's not ready
      console.log('[AircallProvider] 🚀 Calling SDK showWorkspace() directly');
      aircallPhone.showWorkspace();
    
    // PHASE 1 FIX: Completely bypass all checks for login flow
    if (forLogin) {
      console.log('[AircallProvider] 🔓 FORCING workspace visible for login (bypassing all checks)');
      // Just show the container - no readiness checks needed
    } else {
      // Phase 2: Convert blocking check to warning - let SDK handle its own errors
      if (!isInitialized) {
        console.warn('[AircallProvider] ⚠️ Workspace may not be fully initialized; trying to show anyway');
        // DO NOT return - proceed with the call
      }
      
      // PHASE 3: Allow showing workspace if initialized, even if not connected (for login)
      if (initializationPhase === 'needs-login') {
        console.log('[AircallProvider] ✅ Showing workspace for login (initialized but not connected)');
        // Continue to show workspace
      } else if (!isConnected) {
        console.warn('[AircallProvider] ⚠️ Workspace not ready for calls yet');
        // Don't return - still show workspace
      }
    }

    // PHASE 2 FIX: Always attempt to apply styles, even if marked visible
    console.log('[AircallProvider] 🔧 Forcing workspace visibility and pointer-events', { forLogin, isInitialized, isConnected });

    // PHASE 5: Race Condition Retry Logic
    let attempts = 0;
    const MAX_ATTEMPTS = 3;
    const RETRY_DELAY_MS = 100;

    const tryShow = () => {
      const container = document.querySelector('#aircall-workspace-container') as HTMLElement;
      
      if (!container) {
        attempts++;
        if (attempts < MAX_ATTEMPTS) {
          console.warn(`[AircallProvider] Container not found, retry ${attempts}/${MAX_ATTEMPTS} in ${RETRY_DELAY_MS}ms`);
          setTimeout(tryShow, RETRY_DELAY_MS);
          return;
        } else {
          console.error('[AircallProvider] Cannot show workspace - container not found after 3 attempts');
          return;
        }
      }

      // CRITICAL FIX: Force remove hidden class and add visible class
      container.classList.remove('aircall-hidden');
      container.classList.add('aircall-visible');
      
      // DEFENSIVE: Force pointer-events as inline style to override any CSS issues
      container.style.pointerEvents = 'auto';
      
      // Log for debugging
      const computedStyle = window.getComputedStyle(container);
      console.log('[AircallProvider] ✅ Workspace shown:', {
        classList: container.className,
        computedPointerEvents: computedStyle.pointerEvents,
        inlinePointerEvents: container.style.pointerEvents,
        zIndex: computedStyle.zIndex
      });
      
      setWorkspaceVisible(true);
      setWorkspaceVisiblePreference(true);
    };

    tryShow();
    } finally {
      // Release the lock after a tick to allow the DOM to update
      setTimeout(() => {
        isShowingWorkspaceRef.current = false;
      }, 100);
    }
  }, [workspaceVisible, setWorkspaceVisiblePreference, isInitialized, isConnected, initializationPhase, toast, aircallPhone]);

  /**
   * Hides the Aircall workspace with full idempotence.
   * 
   * @remarks
   * - **Idempotent**: Safe to call multiple times - skips if already hidden
   * - **Persistent**: Saves user preference to localStorage
   * - **Single source of truth**: This is the ONLY function that should hide the workspace
   */
  const hideAircallWorkspace = useCallback(() => {
    // PHASE 1 CRITICAL: RECURSION GUARD
    if (isHidingWorkspaceRef.current) {
      console.log('[AircallProvider] 🔒 Already hiding workspace, skipping recursive call');
      return;
    }
    
    // Idempotence Guard - Skip if already hidden
    if (!workspaceVisible) {
      console.log('[AircallProvider] 🙈 Workspace already hidden - skipping');
      return;
    }
    
    isHidingWorkspaceRef.current = true;
    
    try {
      // Call the actual Aircall SDK to hide workspace
      if (aircallPhone.isWorkspaceCreated()) {
        console.log('[AircallProvider] 🙈 Calling SDK hideWorkspace()');
        aircallPhone.hideWorkspace();
      }

      const container = document.querySelector('#aircall-workspace-container') as HTMLElement;
      if (!container) {
        console.warn('[AircallProvider] Cannot hide workspace - container not found');
        return;
      }
      
      container.classList.remove('aircall-visible');
      container.classList.add('aircall-hidden');
      setWorkspaceVisible(false);
      setWorkspaceVisiblePreference(false);
      console.log('[AircallProvider] 🙈 Workspace hidden (user preference saved)');
    } finally {
      setTimeout(() => {
        isHidingWorkspaceRef.current = false;
      }, 100);
    }
  }, [workspaceVisible, setWorkspaceVisiblePreference]);

  /**
   * Handles successful login - centralized logic to avoid duplication
   */
  const handleSuccessfulLogin = useCallback(() => {
    console.log('[AircallProvider] ✅ Handling successful login');
    
    // PHASE 3: Verify SDK actually reports logged in
    const sdkLoginStatus = aircallPhone.getLoginStatus();
    console.log('[AircallProvider] SDK login status:', sdkLoginStatus);
    
    if (!sdkLoginStatus) {
      console.warn('[AircallProvider] ⚠️ handleSuccessfulLogin called but SDK reports not logged in - proceeding anyway');
    }
    
    // Clear polling
    if (loginPollingRef.current) {
      clearInterval(loginPollingRef.current);
      loginPollingRef.current = null;
    }
    
    // Clear other timers
    if (loginTimeoutWarningRef.current) {
      clearTimeout(loginTimeoutWarningRef.current);
      loginTimeoutWarningRef.current = null;
    }
    
    if (blockingErrorListenerRef.current) {
      window.removeEventListener('error', blockingErrorListenerRef.current, true);
      blockingErrorListenerRef.current = null;
    }
    
    // Update state
    aircallPhone.setLoginStatus(true);
    saveConnectionMetadata();
    setIsConnected(true);
    setIsWorkspaceReady(true);
    setShowLoginModal(false);
    setError(null);
    setInitializationPhase('logged-in');
    reconnectAttempts.current = 0;
    
    // Show workspace
    showAircallWorkspace();
    
    // Start grace period
    if (loginGracePeriodRef.current) {
      clearTimeout(loginGracePeriodRef.current);
    }
    loginGracePeriodRef.current = setTimeout(() => {
      console.log('[AircallProvider] Grace period ended');
      loginGracePeriodRef.current = null;
    }, GRACE_PERIOD_MS);
    
    // Show success toast
    toast({
      title: '✅ Logged In Successfully',
      description: 'You are now connected to Aircall',
    });
  }, [aircallPhone, saveConnectionMetadata, showAircallWorkspace, toast, GRACE_PERIOD_MS]);

  /**
   * Initialize Aircall Workspace (ONCE per app lifecycle)
   */
  useEffect(() => {
    // PHASE 1: Check opt-out FIRST before ANY Aircall code runs
    const isOptedOut = sessionStorage.getItem('aircall_opted_out') === 'true';
    if (isOptedOut) {
      console.log('[AircallProvider] ⏭️ User opted out of phone integration');
      console.log('💡 To re-enable: Use the "Re-enable Phone Integration" button or run: sessionStorage.removeItem("aircall_opted_out"); location.reload();');
      setInitializationPhase('failed');
      setError('Phone integration disabled for this session');
      setShowLoginModal(false); // Ensure modal is hidden when opted out
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
        // Phase 0a: Check third-party cookies FIRST (before any SDK calls)
        console.log('[AircallProvider] 🍪 Checking third-party cookie support...');
        const cookieCheck = await detectThirdPartyCookies();
        console.log('[AircallProvider] Cookie detection result:', cookieCheck);
        
        if (!cookieCheck.supported) {
          console.error('[AircallProvider] ❌ THIRD-PARTY COOKIES BLOCKED - STOPPING INITIALIZATION');
          console.error('[AircallProvider] Method:', cookieCheck.method);
          console.error('[AircallProvider] Details:', cookieCheck.details);
          setDiagnosticIssues(['cookies_blocked', cookieCheck.browserType]);
          setShowBlockedModal(true);
          setInitializationPhase('failed');
          
          toast({
            title: 'Third-Party Cookies Blocked',
            description: 'Aircall requires third-party cookies. Please enable them in your browser settings.',
            variant: 'destructive',
            duration: 15000,
          });
          
          return; // DO NOT PROCEED
        }
        
        console.log('[AircallProvider] ✅ Third-party cookies supported');
        
        // Phase 0b: Check browser compatibility
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
        
        // Phase 2: Setup error listener BEFORE initialization (including 401 detection)
        blockingErrorListenerRef.current = (e: ErrorEvent) => {
          const errorMsg = e.message || '';
          
          // Check for network blocking
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
          
          // Check for authentication failures (401)
          if (errorMsg.includes('401') || errorMsg.includes('Unauthorized') || errorMsg.includes('authentication')) {
            console.error('[AircallProvider] ❌ Authentication failed (401)');
            setDiagnosticIssues(['authentication_failed']);
            setShowLoginModal(true); // Show login modal instead of blocked modal
            setInitializationPhase('failed');
            
            // Short-circuit initialization
            abortControllerRef.current?.abort();
            
            toast({
              title: 'Session Expired',
              description: 'Please log in to Aircall again.',
              variant: 'destructive',
              duration: 10000,
            });
          }
        };
        
        // Attach error listener with capture phase
        window.addEventListener('error', blockingErrorListenerRef.current, true);
        
        // Phase 1: BULLETPROOF - Make diagnostics non-blocking warnings
        console.log('[AircallProvider] 🚀 Phase 1: Running diagnostics...');
        setInitializationPhase('diagnostics');
        
        const diagnostic = await aircallPhone.diagnoseEnvironment();
        console.log('[AircallProvider] Diagnostic result:', diagnostic);
        setDiagnosticIssues(diagnostic.issues);
        
        // Phase 1: Make diagnostics non-blocking - show warnings but continue
        if (diagnostic.hasIssues) {
          console.warn('[AircallProvider] ⚠️ Potential issues detected:', diagnostic.issues);
          console.warn('[AircallProvider] Continuing initialization - will handle actual failures');
          
          // Show a non-blocking toast
          toast({
            title: 'Browser Extension Detected',
            description: 'Aircall may be affected by browser extensions. If login fails, try disabling them.',
            variant: 'default', // Not destructive
            duration: 8000,
          });
          
          // DO NOT RETURN - let initialization continue
        }
        
        console.log('[AircallProvider] ✅ Proceeding with SDK initialization...');
        
        // Container is guaranteed to exist in HTML - direct check
        let container = document.querySelector('#aircall-workspace-container') as HTMLElement;
        
        if (!container) {
          // Fallback: Create container imperatively if somehow missing
          console.warn('[AircallProvider] Container missing - creating imperatively');
          container = document.createElement('div');
          container.id = 'aircall-workspace-container';
          document.body.appendChild(container);
        }
        
        console.log('[AircallProvider] ✅ Container ready in DOM');
        
        console.log('[AircallProvider] 🚀 Starting SDK initialization...');
        setInitializationPhase('creating-workspace');
        
        // Phase 1: Smart domain detection for dev vs production
        const getSmartDomain = () => {
          // 1. Always prefer explicit database configuration
          if (everywhereConfig.domainName && everywhereConfig.domainName !== '') {
            return everywhereConfig.domainName;
          }
          
          // 2. Detect if we're in preview/dev environment
          const currentHostname = window.location.hostname;
          const isPreview = currentHostname.includes('lovableproject.com');
          
          // 3. In preview, use published domain; otherwise use current domain
          if (isPreview) {
            return 'lovable-customer-support-hub.lovable.app';
          }
          
          return currentHostname;
        };
        
        const runtimeDomain = getSmartDomain();
        console.group('[AircallProvider] 🌐 DOMAIN DEBUG');
        console.log('📦 Raw DB Config:', {
          fullConfig: everywhereConfig,
          domainField: everywhereConfig.domainName,
          fieldType: typeof everywhereConfig.domainName,
          isEmpty: !everywhereConfig.domainName || everywhereConfig.domainName === '',
        });
        console.log('🌍 Runtime Environment:', {
          hostname: window.location.hostname,
          href: window.location.href,
          protocol: window.location.protocol,
        });
        console.log('🎯 SDK Initialization:', {
          domainToUse: runtimeDomain,
          isAutoDetect: !everywhereConfig.domainName,
          isDomainMatch: !everywhereConfig.domainName || everywhereConfig.domainName === window.location.hostname,
          apiId,
          hasToken: !!apiToken,
        });
        console.groupEnd();
        
        await aircallPhone.initialize({
          apiId,
          apiToken,
          domainName: runtimeDomain,
          onLogin: () => {
            // PHASE 3: Enhanced logging for state synchronization debugging
            console.group('[AircallProvider] ✅ LOGIN CALLBACK FIRED - User logged in!');
            console.log('Timestamp:', new Date().toISOString());
            console.log('Current initializationPhase:', initializationPhase);
            console.log('Current isConnected:', isConnected);
            console.groupEnd();
            
            // Prevent duplicate firing
            if (isConnected) {
              console.warn('[AircallProvider] Already connected, ignoring duplicate onLogin');
              return;
            }
            
            // The onLogin callback fires when user successfully logs in via iframe
            handleSuccessfulLogin();
            
            // Clear error listener since login successful
            if (blockingErrorListenerRef.current) {
              window.removeEventListener('error', blockingErrorListenerRef.current, true);
              blockingErrorListenerRef.current = null;
            }
          },
          onLogout: () => {
            console.group('[AircallProvider] 🚪 LOGOUT CALLBACK');
            console.log('Timestamp:', new Date().toISOString());
            console.groupEnd();
            
            // If in grace period, likely network issue
            if (loginGracePeriodRef.current) {
              console.log('[AircallProvider] Ignoring logout during grace period');
              return;
            }
            
            // Phase 3: Mark workspace as not ready on logout
            setIsWorkspaceReady(false);
            console.log('[AircallProvider] ❌ Workspace marked as not ready after logout');
            
            const wasLoggedIn = aircallPhone.getLoginStatus();
            
            if (wasLoggedIn) {
              console.log('[AircallProvider] Handling disconnection, keeping login state');
              handleDisconnection();
            } else {
              console.log('[AircallProvider] Confirmed logout, showing container for re-login');
              aircallPhone.clearLoginStatus();
              setShowLoginModal(true);
              
              // PHASE 3: Use centralized visibility function with forLogin flag
              showAircallWorkspace(true);
              
              handleDisconnection();
            }
          }
        }, abortControllerRef.current.signal); // Phase 1: Pass AbortSignal

        // Check if workspace was created (not if user is logged in yet)
        const workspaceCreated = aircallPhone.isWorkspaceCreated();
        console.group('[AircallProvider] 📋 POST-INIT CHECK');
        console.log('Workspace created:', workspaceCreated);
        console.log('Iframe exists:', !!document.querySelector('#aircall-workspace-container iframe'));
        console.log('Container classes:', document.querySelector('#aircall-workspace-container')?.className);
        console.groupEnd();
        
        if (workspaceCreated) {
          setIsInitialized(true);
          setIsWorkspaceReady(true); // PHASE 2: Mark workspace as ready
          setInitializationPhase('workspace-ready');
          console.log('[AircallProvider] ✅ Aircall workspace initialized and ready');
          
          // Show success toast
          toast({
            title: 'Aircall Ready',
            description: 'Please log in through the workspace to start receiving calls',
          });
          
          // Auto-show workspace for iframe-first login
          console.log('[AircallProvider] 🔐 Workspace ready - showing for login');
          setShowLoginModal(true);
          setInitializationPhase('needs-login');
          
          // Show workspace automatically so users can log in directly
          setTimeout(() => {
            showAircallWorkspace(true);
            toast({
              title: 'Please Log In',
              description: 'Log in through the Aircall workspace below to start receiving calls',
            });
          }, 500);
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
        
        // PHASE 4: Check if cached login is recent (within 24 hours)
        const loginTimestamp = localStorage.getItem('aircall_connection_timestamp');
        const isLoginRecent = loginTimestamp && 
          (Date.now() - parseInt(loginTimestamp)) < 24 * 60 * 60 * 1000;
        
        if (!isLoginRecent) {
          console.log('[AircallProvider] 🔐 Requiring fresh login (cached login expired or missing)');
          aircallPhone.clearLoginStatus();
          localStorage.removeItem('aircall_connection_timestamp');
          localStorage.removeItem('aircall_connection_attempts');
          setIsConnected(false);
          setShowLoginModal(true);
        } else {
          console.log('[AircallProvider] ✅ Recent login found, attempting to restore session');
          // Let the onLogin callback handle success, or show modal if it doesn't fire within 5s
          setTimeout(() => {
            if (!aircallPhone.getLoginStatus()) {
              console.log('[AircallProvider] Session restore failed, showing login modal');
              setShowLoginModal(true);
            }
          }, 5000);
        }
      } catch (initError: any) {
        console.group('[AircallProvider] ❌ INITIALIZATION ERROR');
        console.error('Error:', initError);
        console.error('Diagnostic issues detected earlier:', diagnosticIssues);
        console.groupEnd();
        
        // Phase 5: Cleanup error listener
        if (blockingErrorListenerRef.current) {
          window.removeEventListener('error', blockingErrorListenerRef.current, true);
          blockingErrorListenerRef.current = null;
        }
        
        const errorMessage = initError.message || initError.toString();
        
        // Phase 3: Determine if this is a blocking issue vs authentication issue
        const isNetworkBlocked = errorMessage.includes('ERR_BLOCKED_BY_CLIENT') 
          || errorMessage.includes('blocked by client')
          || errorMessage.includes('net::')
          || errorMessage.includes('timeout')
          || diagnosticIssues.includes('iframe_blocked');
        
        const isAuthFailure = errorMessage.includes('401') 
          || errorMessage.includes('Unauthorized')
          || errorMessage.includes('authentication');
        
        if (isNetworkBlocked) {
          // TRUE BLOCKING - show blocked modal
          setDiagnosticIssues(['network_blocked', 'iframe_blocked']);
          setShowBlockedModal(true);
          setInitializationPhase('failed');
          
          toast({
            title: 'Aircall Blocked',
            description: 'Network requests are blocked. Please disable ad blockers or try incognito mode.',
            variant: 'destructive',
            duration: 15000,
          });
        } else if (isAuthFailure) {
          // AUTHENTICATION ISSUE - show login modal instead
          setDiagnosticIssues(['authentication_failed']);
          setShowLoginModal(true); // Not blocked modal!
          setInitializationPhase('needs-login');
          
          toast({
            title: 'Aircall Login Required',
            description: 'Please log in to Aircall to continue.',
            variant: 'default',
            duration: 10000,
          });
        } else {
          // UNKNOWN ERROR - show login modal to let user try anyway
          setInitializationPhase('failed');
          setShowLoginModal(true); // Show login modal to allow login attempt
          setError(`Initialization failed: ${errorMessage}`);
          
          toast({
            title: 'Phone Integration Failed',
            description: 'Unable to initialize Aircall. You can try logging in or retry the connection.',
            variant: 'destructive',
            duration: 10000,
          });
        }
        
        setIsInitialized(false);
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
  }, [everywhereConfig, toast, handleDisconnection, saveConnectionMetadata, getConnectionMetadata, attemptReconnect, showAircallWorkspace, handleSuccessfulLogin]);

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
    console.log('[AircallProvider] 🔓 Opening login modal and showing workspace');
    setShowLoginModal(true);
    showAircallWorkspace(true); // Show workspace for login
  }, [showAircallWorkspace]);

  // Phase 5: Enhanced manual login confirmation handler with workspace reload
  const handleManualLoginConfirm = useCallback(async () => {
    console.log('[AircallProvider] 🎯 Login confirmation received from modal');
    
    // CRITICAL FIX: Modal already verified login, just trigger success flow
    // Don't check login status again as it returns false positives
    console.log('[AircallProvider] ✅ Triggering success flow (modal already verified login)');
    
    handleSuccessfulLogin();
  }, [handleSuccessfulLogin]);

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
    console.log('[AircallProvider] 🚫 Opt-out flag set - integration disabled until manually re-enabled');
    setShowLoginModal(false);
    setShowBlockedModal(false);
    
    toast({
      title: 'Phone Integration Disabled',
      description: 'You can re-enable it in Admin → Voice settings',
    });
  }, [toast]);

  // Phase 6: Add force retry escape hatch
  const forceInitialization = useCallback(async () => {
    console.log('[AircallProvider] 🚀 Force initialization requested by user');
    
    // Clear all diagnostic flags
    setDiagnosticIssues([]);
    setShowBlockedModal(false);
    setShowLoginModal(false);
    
    // Reset initialization state
    setInitializationPhase('idle');
    setIsInitialized(false);
    setError(null);
    
    // Clear opt-out if set
    sessionStorage.removeItem('aircall_opted_out');
    
    // Give browser a moment to clear state
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Reload page to start fresh
    window.location.reload();
  }, []);

  // REMOVED: Event listeners that created the recursion loop
  // The SDK now calls show()/hide() directly instead of dispatching events

  // ============================================================================
  // PHASE 2: Force Workspace Interactive During Login
  // ============================================================================
  useEffect(() => {
    if (showLoginModal) {
      console.log('[AircallProvider] 🔓 Login modal open - hiding workspace to avoid z-index conflicts');
      
      const hideWorkspaceForModal = () => {
        const container = document.querySelector('#aircall-workspace-container') as HTMLElement;
        
        if (container) {
          // Hide workspace completely during login to avoid z-index conflicts
          container.style.zIndex = '1'; // Lower than modal (10000+)
          container.style.opacity = '0';
          container.style.pointerEvents = 'none';
          console.log('[AircallProvider] ✅ Workspace hidden for modal');
        }
      };
      
      // Hide immediately
      hideWorkspaceForModal();
      
      return () => {
        // Restore workspace z-index when modal closes
        const container = document.querySelector('#aircall-workspace-container') as HTMLElement;
        if (container) {
          container.style.zIndex = '9999';
          console.log('[AircallProvider] ✅ Workspace z-index restored');
        }
      };
    }
  }, [showLoginModal]);

  // ============================================================================
  // PHASE 3: Workspace Ready Listener
  // ============================================================================
  useEffect(() => {
    const checkWorkspace = () => {
      const container = document.querySelector('#aircall-workspace-container');
      const iframe = container?.querySelector('iframe');
      
      if (iframe) {
        console.log('[AircallProvider] ✅ Workspace iframe detected and ready');
      }
    };

    const observer = new MutationObserver(checkWorkspace);
    const container = document.querySelector('#aircall-workspace-container');
    
    if (container) {
      observer.observe(container, { childList: true, subtree: true });
      checkWorkspace(); // Check immediately
    }

    return () => observer.disconnect();
  }, []);

  // ============================================================================
  // Check Login Status (for popup login polling)
  // ============================================================================
  const checkLoginStatus = useCallback(async (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!aircallPhone.isWorkspaceCreated()) {
        resolve(false);
        return;
      }
      
      aircallPhone.checkLoginStatus((isLoggedIn) => {
        resolve(isLoggedIn);
      });
    });
  }, []);

  // ============================================================================
  // PHASE 0: Memoize Context Value for Performance
  // ============================================================================
  const value: AircallContextValue = useMemo(() => ({
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
    forceInitialization,
    workspaceVisible,
    showAircallWorkspace,
    hideAircallWorkspace,
    workspace: null, // Workspace is private in SDK
    isWorkspaceReady, // PHASE 2: Expose workspace readiness from state
    checkLoginStatus,
    // PHASE 4: Expose recursion guard states for debug panel
    _debugRecursionGuards: {
      isShowing: isShowingWorkspaceRef.current,
      isHiding: isHidingWorkspaceRef.current,
    },
  }), [
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
    isPostOAuthSync,
    showBlockedModal,
    diagnosticIssues,
    openLoginModal,
    initializationPhase,
    handleManualLoginConfirm,
    retryConnection,
    openIncognito,
    skipPhoneIntegration,
    forceInitialization,
    workspaceVisible,
    showAircallWorkspace,
    hideAircallWorkspace,
    isWorkspaceReady,
    checkLoginStatus,
  ]);

  return (
    <AircallContext.Provider value={value}>
      {children}
    </AircallContext.Provider>
  );
};

export { AircallContext };
