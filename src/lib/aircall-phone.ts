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
      
      // CRITICAL: Mark as initialized AFTER workspace creation, NOT after login
      this.isInitialized = true;
      console.log('[AircallWorkspace] ✅ Workspace initialized (ready for login)');
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
