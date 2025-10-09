/**
 * Aircall Phone Manager
 * Manages the Aircall Everywhere v2 SDK integration (AircallWorkspace)
 * Handles initialization, authentication, and event management for Aircall Everywhere
 */

import AircallWorkspace from 'aircall-everywhere';

export type AircallPhoneEvent =
  | 'incoming_call'
  | 'call_end_ringtone'
  | 'outgoing_call'
  | 'outgoing_answered'
  | 'call_ended'
  | 'comment_saved'
  | 'external_dial'
  | 'powerdialer_updated'
  | 'redirect_event';

export interface AircallCall {
  from: string;
  to: string;
  call_id: number;
  direction?: 'inbound' | 'outbound';
  phone_number?: string;
  status?: 'ringing' | 'answered' | 'ongoing' | 'ended';
  answer_status?: 'answered' | 'disconnected' | 'refused';
  duration?: number;
  started_at?: number;
  answered_at?: number;
  ended_at?: number;
  contact?: {
    id: number;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface AircallPhoneSettings {
  apiId: string;
  apiToken: string;
  domainName?: string;
  onLogin?: () => void;
  onLogout?: () => void;
}

class AircallPhoneManager {
  private workspace: AircallWorkspace | null = null;
  private isInitialized = false;
  private eventHandlers: Map<AircallPhoneEvent, Set<(data: any) => void>> = new Map();
  private currentCall: AircallCall | null = null;
  private static STORAGE_KEY = 'aircall_login_status';
  
  // Phase 1: Configurable timeouts with environment variable support
  private static readonly IFRAME_CREATION_TIMEOUT = 
    parseInt(import.meta.env.VITE_AIRCALL_IFRAME_TIMEOUT || '8000', 10);
  private static readonly TOTAL_INITIALIZATION_TIMEOUT = 
    parseInt(import.meta.env.VITE_AIRCALL_TOTAL_TIMEOUT || '15000', 10);
  private static readonly IFRAME_CHECK_INTERVAL = 
    parseInt(import.meta.env.VITE_AIRCALL_CHECK_INTERVAL || '1000', 10);
  
  // Phase 1: Initialization logging
  private initializationLog: Array<{timestamp: number, event: string, details?: any}> = [];
  private initializationStartTime: number = 0;

  /**
   * Phase 1: Reset initialization state for new attempts
   */
  private resetInitializationState(): void {
    this.initializationLog = [];
    this.initializationStartTime = Date.now();
    this.logInit('initialization_started', { 
      iframeTimeout: AircallPhoneManager.IFRAME_CREATION_TIMEOUT,
      totalTimeout: AircallPhoneManager.TOTAL_INITIALIZATION_TIMEOUT
    });
  }
  
  /**
   * Phase 1: Log initialization events with timestamps
   */
  private logInit(event: string, details?: any): void {
    const timestamp = Date.now() - this.initializationStartTime;
    this.initializationLog.push({ timestamp, event, details });
    console.log(`[AircallWorkspace] [${timestamp}ms] ${event}`, details || '');
  }
  
  /**
   * Phase 1: Get initialization report for debugging
   */
  getInitializationReport(): string {
    const timeline = this.initializationLog
      .map(({ timestamp, event, details }) => 
        `[${timestamp}ms] ${event}${details ? ': ' + JSON.stringify(details) : ''}`
      )
      .join('\n');
    
    const summary = {
      totalTime: Date.now() - this.initializationStartTime,
      workspaceCreated: this.workspace !== null,
      isInitialized: this.isInitialized,
      eventCount: this.initializationLog.length
    };
    
    const recommendation = this.workspace 
      ? 'Workspace created successfully. If login fails, check browser extensions.'
      : 'Workspace creation failed. Check console for iframe errors or try incognito mode.';
    
    return `=== Aircall Initialization Report ===\n\nTimeline:\n${timeline}\n\nSummary:\n${JSON.stringify(summary, null, 2)}\n\nRecommendation:\n${recommendation}`;
  }
  
  /**
   * Phase 1: Monitor iframe health with real-time progress callback
   */
  private async monitorIframeHealth(
    timeout: number = AircallPhoneManager.TOTAL_INITIALIZATION_TIMEOUT,
    onProgress?: (phase: string) => void
  ): Promise<{status: 'no_iframe' | 'blocked_requests' | 'timeout' | 'ready', details: string}> {
    this.logInit('monitoring_started', { timeout });
    
    const startTime = Date.now();
    let lastStatus = '';
    
    return new Promise((resolve) => {
      const checkHealth = () => {
        const elapsed = Date.now() - startTime;
        const iframe = this.getAircallIframe();
        
        // Update progress callback
        if (elapsed < 5000) {
          if (lastStatus !== 'checking') {
            onProgress?.('checking');
            lastStatus = 'checking';
          }
        } else if (elapsed < 10000) {
          if (lastStatus !== 'creating') {
            onProgress?.('creating');
            lastStatus = 'creating';
          }
        } else {
          if (lastStatus !== 'loading') {
            onProgress?.('loading');
            lastStatus = 'loading';
          }
        }
        
        // Check for iframe existence
        if (!iframe) {
          if (elapsed > AircallPhoneManager.IFRAME_CREATION_TIMEOUT) {
            this.logInit('iframe_not_found', { elapsed });
            resolve({ 
              status: 'no_iframe', 
              details: `Iframe not created after ${elapsed}ms. Likely blocked by extension.` 
            });
            return;
          }
        } else {
          // Iframe exists, check if ready
          this.logInit('iframe_found', { elapsed });
          onProgress?.('ready');
          resolve({ 
            status: 'ready', 
            details: `Iframe created successfully after ${elapsed}ms` 
          });
          return;
        }
        
        // Total timeout
        if (elapsed > timeout) {
          this.logInit('total_timeout', { elapsed });
          resolve({ 
            status: 'timeout', 
            details: `Initialization timed out after ${elapsed}ms` 
          });
          return;
        }
        
        // Check again after interval
        setTimeout(checkHealth, AircallPhoneManager.IFRAME_CHECK_INTERVAL);
      };
      
      checkHealth();
    });
  }
  
  /**
   * Phase 1: Get Aircall iframe element
   */
  private getAircallIframe(): HTMLIFrameElement | null {
    const container = document.querySelector('#aircall-workspace-container');
    return container?.querySelector('iframe') as HTMLIFrameElement | null;
  }
  
  /**
   * PHASE 3: IMPROVED diagnostic check - test actual iframe creation
   */
  async diagnoseEnvironment(): Promise<{ hasIssues: boolean; issues: string[] }> {
    const issues: string[] = [];
    console.log('[AircallWorkspace] 🔍 PHASE 3: Running BULLETPROOF environment diagnostics...');

    // Check 1: CRITICAL - Test if iframe will be blocked
    try {
      const testIframe = document.createElement('iframe');
      testIframe.src = 'https://phone.aircall.io/';
      testIframe.style.position = 'absolute';
      testIframe.style.width = '1px';
      testIframe.style.height = '1px';
      testIframe.style.opacity = '0';
      testIframe.style.pointerEvents = 'none';
      document.body.appendChild(testIframe);
      
      const loadResult = await Promise.race([
        new Promise<'success'>((resolve) => {
          testIframe.onload = () => resolve('success');
        }),
        new Promise<'error'>((resolve) => {
          testIframe.onerror = () => resolve('error');
        }),
        new Promise<'timeout'>((resolve) => {
          setTimeout(() => resolve('timeout'), 3000);
        })
      ]);
      
      document.body.removeChild(testIframe);
      
      if (loadResult === 'error' || loadResult === 'timeout') {
        console.error('[AircallWorkspace] ❌ iframe test failed:', loadResult);
        issues.push('iframe_blocked');
      } else {
        console.log('[AircallWorkspace] ✅ iframe test passed');
      }
    } catch (error: any) {
      console.error('[AircallWorkspace] ❌ iframe test exception:', error);
      issues.push('iframe_blocked');
    }

    // Phase 2: Improve diagnostic accuracy - distinguish between blocked and cached resources
    try {
      const perfEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const blockedAircall = perfEntries.some(entry => {
        // Only flag if:
        // 1. It's an Aircall resource
        // 2. Has zero transfer AND zero duration
        // 3. AND was NOT served from cache (important!)
        const isAircall = entry.name.includes('aircall');
        const isZeroBytes = entry.transferSize === 0 && entry.duration === 0;
        const isFromCache = entry.transferSize === 0 && entry.duration > 0; // Cached resources have duration but no transfer
        
        return isAircall && isZeroBytes && !isFromCache;
      });
      
      if (blockedAircall) {
        console.warn('[AircallWorkspace] ⚠️ Detected potentially blocked Aircall resources');
        issues.push('resources_blocked_warning'); // Changed to warning
      }
    } catch (error) {
      console.warn('[AircallWorkspace] Could not check performance entries:', error);
    }

    // Check 3: Console error detection
    const originalConsoleError = console.error;
    let hasBlockedError = false;
    console.error = (...args: any[]) => {
      const message = args.join(' ');
      if (message.includes('ERR_BLOCKED_BY_CLIENT') || message.includes('blocked by client')) {
        hasBlockedError = true;
        issues.push('console_blocked_errors');
      }
      originalConsoleError.apply(console, args);
    };
    
    // Restore after 1 second
    setTimeout(() => {
      console.error = originalConsoleError;
    }, 1000);

    // Check 4: iframe loading test
    try {
      const testIframe = document.createElement('iframe');
      testIframe.src = 'https://phone.aircall.io/';
      testIframe.style.display = 'none';
      document.body.appendChild(testIframe);
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          document.body.removeChild(testIframe);
          reject(new Error('iframe load timeout'));
        }, 3000);
        
        testIframe.onload = () => {
          clearTimeout(timeout);
          document.body.removeChild(testIframe);
          resolve(true);
        };
        
        testIframe.onerror = () => {
          clearTimeout(timeout);
          document.body.removeChild(testIframe);
          reject(new Error('iframe load error'));
        };
      });
      
      console.log('[AircallWorkspace] ✅ iframe loading test passed');
    } catch (error) {
      console.error('[AircallWorkspace] ❌ iframe loading test failed:', error);
      issues.push('iframe_blocked');
    }

    if (issues.length > 0) {
      console.error('[AircallWorkspace] ❌ BLOCKING DETECTED:', issues);
    } else {
      console.log('[AircallWorkspace] ✅ All diagnostics passed');
    }

    return {
      hasIssues: issues.length > 0,
      issues: Array.from(new Set(issues)) // Remove duplicates
    };
  }

  /**
   * Save login status to localStorage
   */
  setLoginStatus(isLoggedIn: boolean): void {
    try {
      const data = {
        isLoggedIn,
        timestamp: Date.now()
      };
      localStorage.setItem(AircallPhoneManager.STORAGE_KEY, JSON.stringify(data));
      console.log('[AircallWorkspace] 💾 Login status saved to localStorage:', isLoggedIn);
    } catch (error) {
      console.error('[AircallWorkspace] Failed to save login status:', error);
    }
  }

  /**
   * Get login status from localStorage
   */
  getLoginStatus(): boolean {
    try {
      const stored = localStorage.getItem(AircallPhoneManager.STORAGE_KEY);
      if (!stored) return false;
      
      const data = JSON.parse(stored);
      // Consider sessions older than 24 hours as expired
      const isExpired = Date.now() - data.timestamp > 24 * 60 * 60 * 1000;
      
      if (isExpired) {
        this.clearLoginStatus();
        return false;
      }
      
      return data.isLoggedIn;
    } catch (error) {
      console.error('[AircallWorkspace] Failed to read login status:', error);
      return false;
    }
  }

  /**
   * Clear login status from localStorage
   */
  clearLoginStatus(): void {
    try {
      localStorage.removeItem(AircallPhoneManager.STORAGE_KEY);
      console.log('[AircallWorkspace] 🗑️  Login status cleared from localStorage');
    } catch (error) {
      console.error('[AircallWorkspace] Failed to clear login status:', error);
    }
  }

  /**
   * Wait for the DOM container to be available
   */
  private waitForContainer(selector: string, timeout: number = 5000): Promise<HTMLElement> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkElement = () => {
        const element = document.querySelector(selector);
        if (element) {
          console.log('[AircallWorkspace] ✅ Container found:', selector);
          resolve(element as HTMLElement);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for container: ${selector}`));
          return;
        }
        
        // Check again in 100ms
        setTimeout(checkElement, 100);
      };
      
      checkElement();
    });
  }

  /**
   * Initialize the Aircall Everywhere v2 SDK (AircallWorkspace)
   */
   async initialize(settings: AircallPhoneSettings, signal?: AbortSignal): Promise<void> {
    if (this.isInitialized) {
      console.log('[AircallWorkspace] Already initialized');
      return;
    }
    
    // Phase 1: Reset initialization state
    this.resetInitializationState();

    console.log('[AircallWorkspace] 🚀 Initializing workspace...', {
      domSelector: '#aircall-workspace-container',
    });

    // Phase 4: Add initialization timeout fallback
    const initializationTimeout = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('SDK initialization timeout - iframe may be blocked'));
      }, 15000); // 15 seconds
    });

    try {
      await Promise.race([
        (async () => {
          // Check if aborted early
          if (signal?.aborted) {
            throw new Error('Initialization aborted: blocking detected');
          }
          
          // Wait for container to be available in the DOM
          this.logInit('waiting_for_container');
          await this.waitForContainer('#aircall-workspace-container', 10000);
      
      console.log('[AircallWorkspace] Container found, creating workspace instance...');
      this.logInit('container_found');
      
      // Check if aborted before creating workspace
      if (signal?.aborted) {
        throw new Error('Initialization aborted: blocking detected');
      }
      
      
      // Create AircallWorkspace instance
      this.logInit('creating_workspace');
      this.workspace = new AircallWorkspace({
        domToLoadWorkspace: '#aircall-workspace-container',
        onLogin: (workspaceSettings) => {
          console.log('[AircallWorkspace] ✅ User logged in:', workspaceSettings.user);
          console.log('[AircallWorkspace] 🎯 Layer 1: onLogin callback fired');
          // Let the hook manage login status for proper grace period handling
          settings.onLogin?.();
        },
        onLogout: () => {
          console.log('[AircallWorkspace] 🚪 User logged out');
          this.isInitialized = false;
          // Let the hook manage login status for proper grace period handling
          settings.onLogout?.();
        },
        size: 'small',
        debug: true,
      });

      // Register event listeners
      this.workspace.on('incoming_call', this.handleIncomingCall.bind(this));
      this.workspace.on('call_end_ringtone', this.handleCallEndRingtone.bind(this));
      this.workspace.on('outgoing_call', this.handleOutgoingCall.bind(this));
      this.workspace.on('outgoing_answered', this.handleOutgoingAnswered.bind(this));
      this.workspace.on('call_ended', this.handleCallEnded.bind(this));
      this.workspace.on('comment_saved', this.handleCommentSaved.bind(this));

      console.log('[AircallWorkspace] ✅ Event listeners registered');
      console.log('[AircallWorkspace] ✅ Workspace created successfully');
      this.logInit('workspace_created');
      
      // Phase 4: Log available SDK methods for debugging
      console.log('[AircallWorkspace] 🔍 Inspecting available workspace methods:');
      try {
        const workspaceMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(this.workspace))
          .filter(name => typeof (this.workspace as any)[name] === 'function');
        console.log('[AircallWorkspace] Available methods:', workspaceMethods);
        
        // Check specifically for show/hide methods
        if (typeof (this.workspace as any).show === 'function') {
          console.log('[AircallWorkspace] ✅ workspace.show() method exists');
        } else {
          console.warn('[AircallWorkspace] ⚠️ workspace.show() method NOT found');
        }
        
        if (typeof (this.workspace as any).hide === 'function') {
          console.log('[AircallWorkspace] ✅ workspace.hide() method exists');
        } else {
          console.warn('[AircallWorkspace] ⚠️ workspace.hide() method NOT found');
        }
        
        // Check for alternative method names
        if (typeof (this.workspace as any).open === 'function') {
          console.log('[AircallWorkspace] ✅ workspace.open() method exists');
        }
        if (typeof (this.workspace as any).close === 'function') {
          console.log('[AircallWorkspace] ✅ workspace.close() method exists');
        }
      } catch (error) {
        console.error('[AircallWorkspace] ❌ Error inspecting workspace methods:', error);
      }
      
      
          // Phase 4: SIMPLIFIED - Just mark as initialized, let SDK handle readiness
          this.isInitialized = true;
          this.logInit('initialization_complete');
          console.log('[AircallWorkspace] ✅ Workspace initialized - waiting for user login');
          console.log('[AircallWorkspace] ℹ️  Please log in through the workspace UI');
        })(), // Close the async arrow function
        initializationTimeout
      ]);
    } catch (error: any) {
      // If timeout, throw with clear message
      if (error.message && error.message.includes('timeout')) {
        throw new Error('Aircall workspace failed to initialize. This usually indicates browser extensions are blocking the iframe.');
      }
      this.logInit('initialization_failed', { error: String(error) });
      console.error('[AircallWorkspace] ❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check if workspace is created (SDK initialized)
   * This is separate from user login status
   */
  isWorkspaceCreated(): boolean {
    return this.workspace !== null;
  }

  /**
   * Check if workspace is ready and logged in
   */
  isReady(): boolean {
    return this.isInitialized && this.workspace !== null;
  }

  /**
   * Check login status
   */
  checkLoginStatus(callback: (isLoggedIn: boolean) => void): void {
    if (!this.workspace) {
      callback(false);
      return;
    }
    this.workspace.isLoggedIn(callback);
  }

  /**
   * Register event listener
   */
  on(event: AircallPhoneEvent, handler: (data: any) => void): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    
    this.eventHandlers.get(event)!.add(handler);
    console.log(`[AircallWorkspace] Registered handler for ${event}`);

    // Return cleanup function
    return () => {
      this.eventHandlers.get(event)?.delete(handler);
    };
  }

  /**
   * Emit event to all registered handlers
   */
  private emit(event: AircallPhoneEvent, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[AircallWorkspace] Error in ${event} handler:`, error);
        }
      });
    }
  }

  // ============= Call Event Handlers =============

  private handleIncomingCall(callData: AircallCall): void {
    console.log('[AircallWorkspace] 📞 Incoming call:', callData);
    this.currentCall = { ...callData, status: 'ringing', direction: 'inbound' };
    this.emit('incoming_call', this.currentCall);
  }

  private handleCallEndRingtone(callData: AircallCall): void {
    console.log('[AircallWorkspace] 📵 Call end ringtone:', callData);
    this.emit('call_end_ringtone', callData);
  }

  private handleOutgoingCall(callData: AircallCall): void {
    console.log('[AircallWorkspace] 📤 Outgoing call:', callData);
    this.currentCall = { ...callData, status: 'ringing', direction: 'outbound' };
    this.emit('outgoing_call', this.currentCall);
  }

  private handleOutgoingAnswered(callData: AircallCall): void {
    console.log('[AircallWorkspace] ✅ Outgoing call answered:', callData);
    if (this.currentCall) {
      this.currentCall.status = 'ongoing';
    }
    this.emit('outgoing_answered', callData);
  }

  private handleCallEnded(callData: AircallCall): void {
    console.log('[AircallWorkspace] 🔚 Call ended:', callData);
    this.currentCall = null;
    this.emit('call_ended', callData);
  }

  private handleCommentSaved(callData: any): void {
    console.log('[AircallWorkspace] 💬 Comment saved:', callData);
    this.emit('comment_saved', callData);
  }

  // ============= Call Control Methods =============

  /**
   * Answer incoming call
   * Note: v2 SDK requires user interaction with workspace UI
   */
  async answerCall(): Promise<void> {
    console.log('[AircallWorkspace] ℹ️  Please use Aircall Workspace UI to answer');
    throw new Error('Answer call requires interaction with Aircall Workspace UI');
  }

  /**
   * Reject incoming call  
   * Note: v2 SDK requires user interaction with workspace UI
   */
  async rejectCall(): Promise<void> {
    console.log('[AircallWorkspace] ℹ️  Please use Aircall Workspace UI to reject');
    throw new Error('Reject call requires interaction with Aircall Workspace UI');
  }

  /**
   * Hang up current call
   * Note: v2 SDK requires user interaction with workspace UI
   */
  async hangUp(): Promise<void> {
    console.log('[AircallWorkspace] ℹ️  Please use Aircall Workspace UI to hang up');
    // v2 doesn't support programmatic hangup - user must click in workspace
  }

  /**
   * Dial a phone number
   */
  async dialNumber(phoneNumber: string): Promise<void> {
    if (!this.isReady()) {
      throw new Error('Aircall workspace not initialized');
    }

    return new Promise((resolve, reject) => {
      console.log('[AircallWorkspace] 📱 Dialing:', phoneNumber);
      this.workspace!.send(
        'dial_number',
        { phone_number: phoneNumber },
        (success, response) => {
          if (success) {
            console.log('[AircallWorkspace] ✅ Dial successful');
            resolve();
          } else {
            console.error('[AircallWorkspace] ❌ Dial failed:', response);
            reject(new Error(response?.message || 'Failed to dial'));
          }
        }
      );
    });
  }

  /**
   * Show the Aircall workspace UI
   * Phase 1 CRITICAL FIX: Call actual SDK methods instead of just CSS manipulation
   */
  showWorkspace(): void {
    if (!this.workspace) {
      console.warn('[AircallWorkspace] Cannot show workspace - not initialized');
      return;
    }
    
    try {
      console.log('[AircallWorkspace] 🚀 Calling SDK show() to mount iframe');
      
      // Phase 1: Call actual SDK method to properly mount the iframe
      if (typeof (this.workspace as any).show === 'function') {
        (this.workspace as any).show();
        console.log('[AircallWorkspace] ✅ Called workspace.show()');
      } else if (typeof (this.workspace as any).open === 'function') {
        (this.workspace as any).open();
        console.log('[AircallWorkspace] ✅ Called workspace.open()');
      } else {
        console.warn('[AircallWorkspace] ⚠️ No show/open method found, using CSS fallback');
        // Fallback to CSS if SDK doesn't expose methods
        const container = document.querySelector('#aircall-workspace-container');
        if (container instanceof HTMLElement) {
          container.style.display = 'block';
          container.style.visibility = 'visible';
          container.style.pointerEvents = 'auto';
        }
      }
    } catch (error) {
      console.error('[AircallWorkspace] ❌ Error showing workspace:', error);
      throw error;
    }
  }

  /**
   * Hide the Aircall workspace UI
   * Phase 1 CRITICAL FIX: Call actual SDK methods instead of just CSS manipulation
   */
  hideWorkspace(): void {
    if (!this.workspace) {
      console.warn('[AircallWorkspace] Cannot hide workspace - not initialized');
      return;
    }
    
    try {
      console.log('[AircallWorkspace] 🙈 Calling SDK hide() to remove iframe');
      
      // Phase 1: Call actual SDK method to properly unmount the iframe
      if (typeof (this.workspace as any).hide === 'function') {
        (this.workspace as any).hide();
        console.log('[AircallWorkspace] ✅ Called workspace.hide()');
      } else if (typeof (this.workspace as any).close === 'function') {
        (this.workspace as any).close();
        console.log('[AircallWorkspace] ✅ Called workspace.close()');
      } else {
        console.warn('[AircallWorkspace] ⚠️ No hide/close method found, using CSS fallback');
        // Fallback to CSS if SDK doesn't expose methods
        const container = document.querySelector('#aircall-workspace-container');
        if (container instanceof HTMLElement) {
          container.style.display = 'none';
          container.style.visibility = 'hidden';
          container.style.pointerEvents = 'none';
        }
      }
    } catch (error) {
      console.error('[AircallWorkspace] ❌ Error hiding workspace:', error);
      throw error;
    }
  }

  /**
   * Phase 1: Wait for workspace iframe to be ready and identified
   */
  private async waitForWorkspaceReady(timeout: number = 10000): Promise<boolean> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkReady = () => {
        const iframe = document.querySelector('#aircall-workspace-container iframe') as HTMLIFrameElement;
        
        if (iframe && iframe.contentWindow) {
          console.log('[AircallWorkspace] ✅ Workspace iframe ready');
          resolve(true);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          console.warn('[AircallWorkspace] ⏱️ Timeout waiting for workspace iframe');
          resolve(false);
          return;
        }
        
        setTimeout(checkReady, 200);
      };
      
      checkReady();
    });
  }


  /**
   * Phase 3: Wait for workspace to be identified (ready to receive commands)
   * Phase 4: Now includes guard to ensure workspace exists
   */
  private async waitForWorkspaceIdentified(timeout: number = 30000): Promise<boolean> {
    console.log('[AircallWorkspace] ⏳ Phase 3: Waiting for workspace to be identified (enhanced probe)');
    this.logInit('waiting_for_identification');
    
    // Phase 4: Guard - ensure workspace exists
    if (!this.workspace) {
      console.error('[AircallWorkspace] ❌ Cannot wait for identification - workspace not created');
      this.logInit('identification_failed_no_workspace');
      throw new Error('Workspace not created');
    }
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      let attempts = 0;
      let backoffDelay = 500; // Start with 500ms
      
      const checkIdentified = () => {
        attempts++;
        
        if (!this.workspace) {
          console.warn('[AircallWorkspace] ⚠️ Workspace instance not available');
          this.logInit('identification_check_failed_no_workspace', { attempts });
          resolve(false);
          return;
        }
        
        // Use send() as a readiness probe - it will fail with "not identified" if not ready
        try {
          this.workspace.send('ping', {}, (success, response) => {
            // If send() completes without throwing "not identified", we're ready
            console.log(`[AircallWorkspace] ✅ Workspace identified! (attempt ${attempts})`);
            this.logInit('workspace_identified', { attempts, elapsed: Date.now() - startTime });
            resolve(true);
          });
        } catch (error: any) {
          const errorMsg = String(error);
          
          if (Date.now() - startTime > timeout) {
            console.error('[AircallWorkspace] ❌ Timeout (30s) waiting for workspace to be identified');
            console.error('[AircallWorkspace] Last error:', errorMsg);
            resolve(false);
            return;
          }
          
          // Workspace not identified yet, try again with exponential backoff
          if (errorMsg.includes('not identified') || errorMsg.includes('not ready')) {
            if (attempts % 3 === 0) {
              console.log(`[AircallWorkspace] ⏳ Still waiting for identification (attempt ${attempts})...`);
            }
            
            // Exponential backoff: 500ms -> 1s -> 2s -> max 3s
            backoffDelay = Math.min(backoffDelay * 2, 3000);
            setTimeout(checkIdentified, backoffDelay);
          } else {
            // Different error, retry immediately
            setTimeout(checkIdentified, 500);
          }
        }
      };
      
      checkIdentified();
    });
  }

  /**
   * Phase 2: Force reload the workspace iframe to pick up new authentication state
   * This is more aggressive than refresh() and ensures the iframe fetches fresh auth
   */
  async reloadWorkspace(): Promise<void> {
    console.log('[AircallWorkspace] 🔄 Phase 2: Force reloading workspace iframe for OAuth sync');
    
    // Wait for iframe to exist
    const isReady = await this.waitForWorkspaceReady(5000);
    
    if (!isReady) {
      console.warn('[AircallWorkspace] ⚠️ Workspace iframe not ready for reload');
      return;
    }
    
    // Find the Aircall workspace iframe
    const container = document.querySelector('#aircall-workspace-container') as HTMLElement;
    const iframe = container?.querySelector('iframe') as HTMLIFrameElement;
    
    if (!iframe) {
      console.warn('[AircallWorkspace] ⚠️ Cannot reload - iframe not found');
      return;
    }
    
    console.log('[AircallWorkspace] 🔄 Reloading iframe to fetch fresh authentication state');
    
    // Force reload by resetting src
    const currentSrc = iframe.src;
    iframe.src = 'about:blank';
    
    // Wait a moment, then restore with cache-busting
    setTimeout(() => {
      const cacheBuster = `timestamp=${Date.now()}`;
      const newSrc = currentSrc.includes('?') 
        ? `${currentSrc}&${cacheBuster}`
        : `${currentSrc}?${cacheBuster}`;
      
      iframe.src = newSrc;
      console.log('[AircallWorkspace] ✅ Iframe reloaded with fresh auth state');
    }, 100);
  }

  /**
   * Get current call info
   */
  getCurrentCall(): AircallCall | null {
    return this.currentCall;
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    console.log('[AircallWorkspace] 🔌 Disconnecting');
    
    // Clean up event listeners
    if (this.workspace) {
      const events: AircallPhoneEvent[] = [
        'incoming_call',
        'call_end_ringtone',
        'outgoing_call',
        'outgoing_answered',
        'call_ended',
        'comment_saved',
      ];
      
      events.forEach(event => {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
          handlers.forEach(handler => {
            this.workspace!.removeListener(event, handler);
          });
        }
      });
    }
    
    this.workspace = null;
    this.isInitialized = false;
    this.eventHandlers.clear();
    this.currentCall = null;
  }
}

// Export singleton instance
export const aircallPhone = new AircallPhoneManager();
