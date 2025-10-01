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

  /**
   * Phase 1: Diagnostic check for browser environment issues
   */
  async diagnoseEnvironment(): Promise<{ hasIssues: boolean; issues: string[] }> {
    const issues: string[] = [];

    console.log('[AircallWorkspace] 🔍 Phase 1: Running environment diagnostics...');

    // Check 1: Test network request to Aircall domain
    try {
      const testUrl = 'https://phone.aircall.io/favicon.ico';
      const response = await fetch(testUrl, { method: 'HEAD', mode: 'no-cors' });
      console.log('[AircallWorkspace] ✅ Network test passed');
    } catch (error) {
      console.error('[AircallWorkspace] ❌ Network test failed:', error);
      issues.push('network_blocked');
    }

    // Check 2: Look for blocked requests in console
    const perfEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const blockedAircall = perfEntries.some(entry => 
      entry.name.includes('aircall') && entry.transferSize === 0
    );
    if (blockedAircall) {
      console.warn('[AircallWorkspace] ⚠️ Detected blocked Aircall resources');
      issues.push('resources_blocked');
    }

    // Check 3: iframe sandbox support
    const testIframe = document.createElement('iframe');
    testIframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms');
    if (!testIframe.sandbox) {
      console.warn('[AircallWorkspace] ⚠️ iframe sandbox not supported');
      issues.push('sandbox_unsupported');
    }

    if (issues.length > 0) {
      console.warn('[AircallWorkspace] ⚠️ Environment issues detected:', issues);
    } else {
      console.log('[AircallWorkspace] ✅ Environment diagnostics passed');
    }

    return {
      hasIssues: issues.length > 0,
      issues
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
  async initialize(settings: AircallPhoneSettings): Promise<void> {
    if (this.isInitialized) {
      console.log('[AircallWorkspace] Already initialized');
      return;
    }

    console.log('[AircallWorkspace] 🚀 Initializing workspace...', {
      domSelector: '#aircall-workspace-container',
    });

    try {
      // Wait for container to be available in the DOM
      await this.waitForContainer('#aircall-workspace-container', 10000);
      
      console.log('[AircallWorkspace] Container found, creating workspace instance...');
      
      // Phase 2: Set up MutationObserver to intercept iframe IMMEDIATELY
      let iframeFound = false;
      const observer = new MutationObserver((mutations) => {
        if (iframeFound) return;
        
        const container = document.querySelector('#aircall-workspace-container');
        const iframe = container?.querySelector('iframe') as HTMLIFrameElement;
        
        if (iframe && !iframeFound) {
          iframeFound = true;
          console.log('[AircallWorkspace] 🔧 Phase 2: Iframe detected, fixing permissions immediately');
          
          // Fix permissions synchronously before first request
          const currentAllow = iframe.getAttribute('allow') || '';
          const permissions = currentAllow.split(';').map(p => p.trim()).filter(p => p);
          const filteredPermissions = permissions.filter(p => !p.includes('hid'));
          const newAllow = filteredPermissions.join('; ');
          
          if (currentAllow !== newAllow) {
            iframe.setAttribute('allow', newAllow);
            console.log('[AircallWorkspace] ✅ Phase 2: Removed HID permission before first load');
          }
          
          observer.disconnect();
        }
      });
      
      // Start observing
      const container = document.querySelector('#aircall-workspace-container');
      if (container) {
        observer.observe(container, { childList: true, subtree: true });
      }
      
      // Create AircallWorkspace instance
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
      
      // Disconnect observer after workspace creation
      observer.disconnect();
      
      // Phase 3: Wait for workspace to be identified (improved with readiness probe)
      const isIdentified = await this.waitForWorkspaceIdentified();
      
      if (!isIdentified) {
        console.error('[AircallWorkspace] ❌ Workspace failed to be identified');
        console.error('[AircallWorkspace] 💡 Troubleshooting:');
        console.error('[AircallWorkspace]    1. Check browser console for SDK errors');
        console.error('[AircallWorkspace]    2. Verify API credentials are correct');
        console.error('[AircallWorkspace]    3. Try manually reloading the page');
        
        // Phase 5: Try one more time by recreating workspace
        console.log('[AircallWorkspace] 🔄 Attempting to recreate workspace...');
        this.workspace = null;
        
        this.workspace = new AircallWorkspace({
          domToLoadWorkspace: '#aircall-workspace-container',
          onLogin: (workspaceSettings) => {
            console.log('[AircallWorkspace] ✅ User logged in:', workspaceSettings.user);
            settings.onLogin?.();
          },
          onLogout: () => {
            console.log('[AircallWorkspace] 🚪 User logged out');
            this.isInitialized = false;
            settings.onLogout?.();
          },
          size: 'small',
          debug: true,
        });
        
        // Re-register event listeners
        this.workspace.on('incoming_call', this.handleIncomingCall.bind(this));
        this.workspace.on('call_end_ringtone', this.handleCallEndRingtone.bind(this));
        this.workspace.on('outgoing_call', this.handleOutgoingCall.bind(this));
        this.workspace.on('outgoing_answered', this.handleOutgoingAnswered.bind(this));
        this.workspace.on('call_ended', this.handleCallEnded.bind(this));
        this.workspace.on('comment_saved', this.handleCommentSaved.bind(this));
        
        const retryIdentified = await this.waitForWorkspaceIdentified();
        
        if (!retryIdentified) {
          throw new Error('Failed to initialize Aircall workspace - iframe not identified after retry');
        }
      }
      
      // Phase 4: Mark as initialized only after workspace is ready
      this.isInitialized = true;
      console.log('[AircallWorkspace] ✅ Workspace fully initialized and identified');
      console.log('[AircallWorkspace] ℹ️  Please log in through the workspace UI');
    } catch (error) {
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
   * Brings the container back on screen
   */
  showWorkspace(): void {
    if (!this.workspace) {
      console.warn('[AircallWorkspace] Cannot show workspace - not initialized');
      return;
    }
    
    const container = document.querySelector('#aircall-workspace-container') as HTMLElement;
    if (container) {
      container.style.bottom = '1rem';
      container.style.right = '1rem';
      console.log('[AircallWorkspace] 👁️  Workspace shown');
    }
  }

  /**
   * Hide the Aircall workspace UI
   * Moves the container off-screen
   */
  hideWorkspace(): void {
    if (!this.workspace) {
      console.warn('[AircallWorkspace] Cannot hide workspace - not initialized');
      return;
    }
    
    const container = document.querySelector('#aircall-workspace-container') as HTMLElement;
    if (container) {
      container.style.bottom = '-100vh';
      container.style.right = '-100vw';
      console.log('[AircallWorkspace] 🙈 Workspace hidden');
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
   * Phase 1: Fix iframe permissions by removing blocked HID permission
   */
  private async fixIframePermissions(): Promise<void> {
    console.log('[AircallWorkspace] 🔧 Phase 1: Fixing iframe permissions (removing HID)');
    
    // Wait for iframe to exist
    const isReady = await this.waitForWorkspaceReady(5000);
    
    if (!isReady) {
      console.warn('[AircallWorkspace] ⚠️ Cannot fix permissions - iframe not found');
      return;
    }
    
    const container = document.querySelector('#aircall-workspace-container') as HTMLElement;
    const iframe = container?.querySelector('iframe') as HTMLIFrameElement;
    
    if (!iframe) {
      console.warn('[AircallWorkspace] ⚠️ Cannot fix permissions - iframe not found');
      return;
    }
    
    // Get current allow attribute
    const currentAllow = iframe.getAttribute('allow') || '';
    console.log('[AircallWorkspace] 📋 Current iframe permissions:', currentAllow);
    
    // Remove HID permission (it's blocked by browser and causes issues)
    const permissions = currentAllow.split(';').map(p => p.trim()).filter(p => p);
    const filteredPermissions = permissions.filter(p => !p.includes('hid'));
    const newAllow = filteredPermissions.join('; ');
    
    if (currentAllow !== newAllow) {
      iframe.setAttribute('allow', newAllow);
      console.log('[AircallWorkspace] ✅ Removed HID permission. New permissions:', newAllow);
      
      // Phase 2: Force reload after permission fix
      console.log('[AircallWorkspace] 🔄 Phase 2: Reloading iframe after permission fix');
      const currentSrc = iframe.src;
      
      // Set to blank first
      iframe.src = 'about:blank';
      
      // Wait for reload, then restore with cache-busting
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          const cacheBuster = `timestamp=${Date.now()}`;
          const newSrc = currentSrc.includes('?') 
            ? `${currentSrc}&${cacheBuster}`
            : `${currentSrc}?${cacheBuster}`;
          
          iframe.src = newSrc;
          
          // Wait for iframe to load
          iframe.onload = () => {
            console.log('[AircallWorkspace] ✅ Iframe reloaded successfully');
            resolve();
          };
          
          // Fallback timeout
          setTimeout(() => resolve(), 3000);
        }, 100);
      });
    } else {
      console.log('[AircallWorkspace] ℹ️  No HID permission found, skipping fix');
    }
  }

  /**
   * Phase 3: Wait for workspace to be identified (ready to receive commands)
   * Improved with exponential backoff and dedicated readiness probe
   */
  private async waitForWorkspaceIdentified(timeout: number = 30000): Promise<boolean> {
    console.log('[AircallWorkspace] ⏳ Phase 3: Waiting for workspace to be identified (enhanced probe)');
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      let attempts = 0;
      let backoffDelay = 500; // Start with 500ms
      
      const checkIdentified = () => {
        attempts++;
        
        if (!this.workspace) {
          console.warn('[AircallWorkspace] ⚠️ Workspace instance not available');
          resolve(false);
          return;
        }
        
        // Use send() as a readiness probe - it will fail with "not identified" if not ready
        try {
          this.workspace.send('ping', {}, (success, response) => {
            // If send() completes without throwing "not identified", we're ready
            console.log(`[AircallWorkspace] ✅ Workspace identified! (attempt ${attempts})`);
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
