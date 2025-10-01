/**
 * Aircall Event Bridge
 * 
 * Synchronizes events between Aircall webhooks and Aircall Everywhere SDK
 * Handles deduplication to prevent double event processing
 */

import type { AircallCall, AircallPhoneEvent } from './aircall-phone';

interface WebhookEvent {
  id: string;
  type: string;
  timestamp: string;
  data: any;
}

interface SDKEvent {
  type: AircallPhoneEvent;
  call: AircallCall;
  timestamp: number;
}

interface ProcessedEvent {
  id: string;
  type: string;
  timestamp: number;
  source: 'webhook' | 'sdk';
}

class AircallEventBridge {
  private processedEvents: Map<string, ProcessedEvent> = new Map();
  private readonly DEDUPLICATION_WINDOW_MS = 5000; // 5 seconds
  private readonly MAX_CACHE_SIZE = 100;

  /**
   * Generate a unique event identifier for deduplication
   */
  private generateEventId(type: string, callId: string | number, timestamp: number): string {
    return `${type}:${callId}:${Math.floor(timestamp / 1000)}`;
  }

  /**
   * Check if an event has been processed recently
   */
  private isDuplicate(eventId: string): boolean {
    return this.processedEvents.has(eventId);
  }

  /**
   * Mark an event as processed
   */
  private markProcessed(eventId: string, type: string, source: 'webhook' | 'sdk'): void {
    const event: ProcessedEvent = {
      id: eventId,
      type,
      timestamp: Date.now(),
      source
    };

    this.processedEvents.set(eventId, event);

    // Cleanup old events if cache is too large
    if (this.processedEvents.size > this.MAX_CACHE_SIZE) {
      const now = Date.now();
      const expiredKeys: string[] = [];

      this.processedEvents.forEach((event, key) => {
        if (now - event.timestamp > this.DEDUPLICATION_WINDOW_MS) {
          expiredKeys.push(key);
        }
      });

      expiredKeys.forEach(key => this.processedEvents.delete(key));
    }

    console.log(`[EventBridge] ✅ Marked as processed [${source}]: ${type} (${eventId})`);
  }

  /**
   * Process webhook event with deduplication
   */
  processWebhookEvent(event: WebhookEvent): boolean {
    const callId = event.data?.id || event.data?.call_id || 'unknown';
    const timestamp = event.timestamp ? new Date(event.timestamp).getTime() : Date.now();
    const eventId = this.generateEventId(event.type, callId, timestamp);

    console.log(`[EventBridge] 📥 Webhook event: ${event.type} (${eventId})`);

    if (this.isDuplicate(eventId)) {
      console.log(`[EventBridge] ⏭️  Skipping duplicate webhook event: ${eventId}`);
      return false;
    }

    this.markProcessed(eventId, event.type, 'webhook');
    return true;
  }

  /**
   * Process SDK event with deduplication
   */
  processSDKEvent(event: SDKEvent): boolean {
    const callId = event.call.call_id || 'unknown';
    const timestamp = event.timestamp;
    const eventId = this.generateEventId(event.type, callId, timestamp);

    console.log(`[EventBridge] 📱 SDK event: ${event.type} (${eventId})`);

    if (this.isDuplicate(eventId)) {
      console.log(`[EventBridge] ⏭️  Skipping duplicate SDK event: ${eventId}`);
      return false;
    }

    this.markProcessed(eventId, event.type, 'sdk');
    return true;
  }

  /**
   * Map webhook event type to SDK event type
   */
  webhookToSDKEvent(webhookType: string): AircallPhoneEvent | null {
    const mapping: Record<string, AircallPhoneEvent> = {
      'call.created': 'incoming_call',
      'call.ringing': 'incoming_call',
      'call.answered': 'outgoing_answered',
      'call.hungup': 'call_ended',
      'call.ended': 'call_ended',
      'call.missed': 'call_end_ringtone'
    };

    return mapping[webhookType] || null;
  }

  /**
   * Map SDK event type to webhook event type
   */
  sdkToWebhookEvent(sdkType: AircallPhoneEvent): string | null {
    const mapping: Record<AircallPhoneEvent, string> = {
      'incoming_call': 'call.created',
      'call_end_ringtone': 'call.missed',
      'outgoing_call': 'call.created',
      'outgoing_answered': 'call.answered',
      'call_ended': 'call.ended',
      'comment_saved': 'comment.created',
      'external_dial': 'call.dial',
      'powerdialer_updated': 'powerdialer.updated',
      'redirect_event': 'redirect.event'
    };

    return mapping[sdkType] || null;
  }

  /**
   * Get statistics about processed events
   */
  getStats(): {
    totalProcessed: number;
    webhookEvents: number;
    sdkEvents: number;
    cacheSize: number;
  } {
    const stats = {
      totalProcessed: 0,
      webhookEvents: 0,
      sdkEvents: 0,
      cacheSize: this.processedEvents.size
    };

    this.processedEvents.forEach(event => {
      stats.totalProcessed++;
      if (event.source === 'webhook') {
        stats.webhookEvents++;
      } else {
        stats.sdkEvents++;
      }
    });

    return stats;
  }

  /**
   * Clear all cached events (useful for testing)
   */
  clear(): void {
    console.log('[EventBridge] 🧹 Clearing event cache');
    this.processedEvents.clear();
  }
}

// Export singleton instance
export const aircallEventBridge = new AircallEventBridge();
