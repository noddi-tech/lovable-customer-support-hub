/**
 * Aircall Everywhere SDK Manager
 * 
 * Handles initialization, authentication, and event management for Aircall Everywhere
 */

export type AircallPhoneEvent =
  | 'incoming_call'
  | 'call_end_ringtone'
  | 'outgoing_call'
  | 'outgoing_answered'
  | 'call_ended'
  | 'answer_call'
  | 'reject_call';

export interface AircallCall {
  id: number;
  direction: 'inbound' | 'outbound';
  phone_number: string;
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
  status: 'ringing' | 'answered' | 'ongoing' | 'ended';
  started_at?: number;
  answered_at?: number;
  ended_at?: number;
}

export interface AircallPhoneSettings {
  apiId: string;
  apiToken: string;
  domainName?: string;
  onLogin?: () => void;
  onLogout?: () => void;
}

class AircallPhoneManager {
  private phone: AircallPhoneSDK | null = null;
  private isInitialized = false;
  private eventHandlers: Map<AircallPhoneEvent, Set<(data: any) => void>> = new Map();
  private currentCall: AircallCall | null = null;

  /**
   * Wait for Aircall SDK to be available on window
   */
  private waitForSDK(timeout: number = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkSDK = () => {
        if (window.AircallPhone) {
          console.log('[AircallPhone] ✅ SDK loaded from window');
          resolve();
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          reject(new Error('Aircall SDK failed to load from CDN. Please check your internet connection.'));
          return;
        }
        
        setTimeout(checkSDK, 100);
      };
      
      checkSDK();
    });
  }

  /**
   * Initialize the Aircall Everywhere SDK
   */
  async initialize(settings: AircallPhoneSettings): Promise<void> {
    if (this.isInitialized) {
      console.log('[AircallPhone] Already initialized');
      return;
    }

    console.log('[AircallPhone] Initializing SDK with settings:', {
      apiId: settings.apiId,
      domainName: settings.domainName,
      hasToken: !!settings.apiToken
    });

    try {
      // Wait for SDK to load from CDN
      await this.waitForSDK();
      
      // Access global SDK object
      this.phone = window.AircallPhone;
      
      await this.phone.on('incoming_call', this.handleIncomingCall.bind(this));
      await this.phone.on('call_end_ringtone', this.handleCallEndRingtone.bind(this));
      await this.phone.on('outgoing_call', this.handleOutgoingCall.bind(this));
      await this.phone.on('outgoing_answered', this.handleOutgoingAnswered.bind(this));
      await this.phone.on('call_ended', this.handleCallEnded.bind(this));

      this.isInitialized = true;
      console.log('[AircallPhone] ✅ SDK initialized successfully');

      // Trigger authentication
      if (settings.onLogin) {
        settings.onLogin();
      }
    } catch (error) {
      console.error('[AircallPhone] ❌ Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Check if SDK is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.phone !== null;
  }

  /**
   * Register event listener
   */
  on(event: AircallPhoneEvent, handler: (data: any) => void): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    
    this.eventHandlers.get(event)!.add(handler);
    console.log(`[AircallPhone] Registered handler for ${event}`);

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
          console.error(`[AircallPhone] Error in ${event} handler:`, error);
        }
      });
    }
  }

  // ============= Call Event Handlers =============

  private handleIncomingCall(callData: AircallCall): void {
    console.log('[AircallPhone] 📞 Incoming call:', callData);
    this.currentCall = callData;
    this.emit('incoming_call', callData);
  }

  private handleCallEndRingtone(callData: AircallCall): void {
    console.log('[AircallPhone] 📵 Call end ringtone:', callData);
    this.emit('call_end_ringtone', callData);
  }

  private handleOutgoingCall(callData: AircallCall): void {
    console.log('[AircallPhone] 📤 Outgoing call:', callData);
    this.currentCall = callData;
    this.emit('outgoing_call', callData);
  }

  private handleOutgoingAnswered(callData: AircallCall): void {
    console.log('[AircallPhone] ✅ Outgoing call answered:', callData);
    this.currentCall = callData;
    this.emit('outgoing_answered', callData);
  }

  private handleCallEnded(callData: AircallCall): void {
    console.log('[AircallPhone] 🔚 Call ended:', callData);
    this.currentCall = null;
    this.emit('call_ended', callData);
  }

  // ============= Call Control Methods =============

  /**
   * Answer incoming call
   */
  async answerCall(): Promise<void> {
    if (!this.phone || !this.currentCall) {
      console.warn('[AircallPhone] Cannot answer: no active call');
      return;
    }

    try {
      console.log('[AircallPhone] 📞 Answering call:', this.currentCall.id);
      await this.phone.send('answer_call', { call_id: this.currentCall.id });
      this.emit('answer_call', this.currentCall);
    } catch (error) {
      console.error('[AircallPhone] ❌ Failed to answer call:', error);
      throw error;
    }
  }

  /**
   * Reject incoming call
   */
  async rejectCall(): Promise<void> {
    if (!this.phone || !this.currentCall) {
      console.warn('[AircallPhone] Cannot reject: no active call');
      return;
    }

    try {
      console.log('[AircallPhone] ❌ Rejecting call:', this.currentCall.id);
      await this.phone.send('reject_call', { call_id: this.currentCall.id });
      this.emit('reject_call', this.currentCall);
      this.currentCall = null;
    } catch (error) {
      console.error('[AircallPhone] ❌ Failed to reject call:', error);
      throw error;
    }
  }

  /**
   * Hang up active call
   */
  async hangUp(): Promise<void> {
    if (!this.phone || !this.currentCall) {
      console.warn('[AircallPhone] Cannot hang up: no active call');
      return;
    }

    try {
      console.log('[AircallPhone] 📴 Hanging up call:', this.currentCall.id);
      await this.phone.send('hang_up', { call_id: this.currentCall.id });
      this.currentCall = null;
    } catch (error) {
      console.error('[AircallPhone] ❌ Failed to hang up:', error);
      throw error;
    }
  }

  /**
   * Make outbound call
   */
  async dialNumber(phoneNumber: string): Promise<void> {
    if (!this.phone) {
      console.warn('[AircallPhone] Cannot dial: SDK not initialized');
      return;
    }

    try {
      console.log('[AircallPhone] 📞 Dialing:', phoneNumber);
      await this.phone.send('dial_number', { phone_number: phoneNumber });
    } catch (error) {
      console.error('[AircallPhone] ❌ Failed to dial:', error);
      throw error;
    }
  }

  /**
   * Get current call info
   */
  getCurrentCall(): AircallCall | null {
    return this.currentCall;
  }

  /**
   * Cleanup and disconnect
   */
  disconnect(): void {
    console.log('[AircallPhone] 🔌 Disconnecting');
    this.phone = null;
    this.isInitialized = false;
    this.currentCall = null;
    this.eventHandlers.clear();
  }
}

// Export singleton instance
export const aircallPhone = new AircallPhoneManager();
