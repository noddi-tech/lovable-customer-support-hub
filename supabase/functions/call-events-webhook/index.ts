import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Provider-specific adapters
interface StandardCallEvent {
  externalId: string;
  provider: string;
  customerPhone?: string;
  agentPhone?: string;
  status: string;
  direction: 'inbound' | 'outbound';
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  recordingUrl?: string;
  metadata: Record<string, any>;
  eventType: string;
  eventData: Record<string, any>;
}

class AircallAdapter {
  static convertWebhookToStandardEvent(payload: any): StandardCallEvent {
    const call = payload.data;
    console.log('Aircall webhook payload:', JSON.stringify(payload, null, 2));
    
    // Map Aircall status to our enum
    const statusMap: Record<string, string> = {
      'initial': 'ringing',
      'ringing': 'ringing', 
      'answered': 'answered',
      'hungup': 'completed',
      'missed': 'missed',
      'busy': 'busy',
      'failed': 'failed',
      'transferred': 'transferred',
      'hold': 'on_hold'
    };

    // Map Aircall events to our event types
    const eventTypeMap: Record<string, string> = {
      'call.created': 'call_started',
      'call.answered': 'call_answered', 
      'call.hungup': 'call_ended',
      'call.missed': 'call_missed',
      'call.transferred': 'call_transferred',
      'call.hold': 'call_on_hold',
      'call.unhold': 'call_resumed',
      'call.voicemail': 'voicemail_left'
    };

    // Convert Unix timestamps to ISO strings
    const convertTimestamp = (unixTimestamp: any): string | undefined => {
      if (!unixTimestamp) return undefined;
      if (typeof unixTimestamp === 'number') {
        return new Date(unixTimestamp * 1000).toISOString();
      }
      if (typeof unixTimestamp === 'string' && /^\d+$/.test(unixTimestamp)) {
        return new Date(parseInt(unixTimestamp) * 1000).toISOString();
      }
      return unixTimestamp; // Already in proper format
    };

    return {
      externalId: call.id.toString(),
      provider: 'aircall',
      customerPhone: call.raw_digits || call.from?.phone_number,
      agentPhone: call.to?.phone_number,
      status: statusMap[call.status] || 'ringing',
      direction: call.direction === 'inbound' ? 'inbound' : 'outbound',
      startedAt: convertTimestamp(call.started_at) || new Date().toISOString(),
      endedAt: convertTimestamp(call.ended_at),
      durationSeconds: call.duration || undefined,
      recordingUrl: call.recording?.url || undefined,
      metadata: {
        aircallId: call.id,
        tags: call.tags || [],
        user: call.user || null,
        contact: call.contact || null,
        originalPayload: call
      },
      eventType: eventTypeMap[payload.event] || 'call_started',
      eventData: {
        webhookEvent: payload.event,
        timestamp: convertTimestamp(payload.timestamp) || new Date().toISOString(),
        callData: call
      }
    };
  }
}

// Generic adapter dispatcher
function adaptWebhookEvent(provider: string, payload: any): StandardCallEvent {
  switch (provider.toLowerCase()) {
    case 'aircall':
      return AircallAdapter.convertWebhookToStandardEvent(payload);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function getOrganizationFromDomain(supabase: any, domain: string): Promise<string | null> {
  // For now, map to demo org. Later we can add domain-based routing
  const { data: org, error } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', 'demo')
    .single();
    
  if (error) {
    console.error('Error fetching organization:', error);
    return null;
  }
  
  return org.id;
}

async function processCallEvent(supabase: any, standardEvent: StandardCallEvent, organizationId: string) {
  console.log('Processing standard event:', JSON.stringify(standardEvent, null, 2));

  // Upsert call record
  const { data: call, error: callError } = await supabase
    .from('calls')
    .upsert({
      external_id: standardEvent.externalId,
      provider: standardEvent.provider,
      organization_id: organizationId,
      customer_phone: standardEvent.customerPhone,
      agent_phone: standardEvent.agentPhone,
      status: standardEvent.status,
      direction: standardEvent.direction,
      started_at: standardEvent.startedAt,
      ended_at: standardEvent.endedAt,
      duration_seconds: standardEvent.durationSeconds,
      recording_url: standardEvent.recordingUrl,
      metadata: standardEvent.metadata,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'provider,external_id',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (callError) {
    console.error('Error upserting call:', callError);
    throw callError;
  }

  console.log('Call upserted successfully:', call);

  // Insert call event
  const { data: callEvent, error: eventError } = await supabase
    .from('call_events')
    .insert({
      call_id: call.id,
      event_type: standardEvent.eventType,
      event_data: standardEvent.eventData,
      timestamp: standardEvent.eventData.timestamp || new Date().toISOString()
    })
    .select()
    .single();

  if (eventError) {
    console.error('Error inserting call event:', eventError);
    throw eventError;
  }

  console.log('Call event inserted successfully:', callEvent);

  return { call, callEvent };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Webhook received:', req.method, req.url);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse webhook payload
    const payload = await req.json();
    console.log('Raw webhook payload:', JSON.stringify(payload, null, 2));

    // Determine provider from URL path or payload
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const provider = pathSegments[pathSegments.length - 1] || 'aircall'; // Default to aircall

    console.log('Detected provider:', provider);

    // Convert to standard event format
    const standardEvent = adaptWebhookEvent(provider, payload);
    console.log('Converted to standard event:', JSON.stringify(standardEvent, null, 2));

    // Get organization (for now using demo, later implement domain-based routing)
    const organizationId = await getOrganizationFromDomain(supabase, 'demo');
    if (!organizationId) {
      throw new Error('No organization found');
    }

    // Process the call event
    const result = await processCallEvent(supabase, standardEvent, organizationId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        callId: result.call.id,
        eventId: result.callEvent.id,
        message: 'Call event processed successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});