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
      await this.waitForContainer('#aircall-workspace-container');
      
      // Create AircallWorkspace instance
      this.workspace = new AircallWorkspace({
        domToLoadWorkspace: '#aircall-workspace-container',
        onLogin: (workspaceSettings) => {
          console.log('[AircallWorkspace] ✅ User logged in:', workspaceSettings.user);
          this.isInitialized = true;
          settings.onLogin?.();
        },
        onLogout: () => {
          console.log('[AircallWorkspace] 🚪 User logged out');
          this.isInitialized = false;
          settings.onLogout?.();
        },
        size: 'big',
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
      console.log('[AircallWorkspace] ℹ️  Please log in through the workspace UI');
    } catch (error) {
      console.error('[AircallWorkspace] ❌ Initialization failed:', error);
      throw error;
    }
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
