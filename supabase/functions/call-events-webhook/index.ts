import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to download and store voicemail in Supabase storage
async function downloadAndStoreVoicemail(supabase: any, voicemailUrl: string, callUuid: string) {
  try {
    console.log('📥 Downloading voicemail from:', voicemailUrl);
    
    // Fetch the voicemail file
    const response = await fetch(voicemailUrl);
    if (!response.ok) {
      throw new Error(`Failed to download voicemail: ${response.status}`);
    }
    
    const audioBuffer = await response.arrayBuffer();
    const audioFile = new Uint8Array(audioBuffer);
    
    // Generate a storage path
    const fileName = `${callUuid}-${Date.now()}.mp3`;
    const filePath = `voicemails/${fileName}`;
    
    console.log('💾 Storing voicemail in Supabase storage:', filePath);
    
    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('voicemails')
      .upload(filePath, audioFile, {
        contentType: 'audio/mpeg',
        upsert: false
      });
    
    if (error) {
      console.error('❌ Error uploading voicemail:', error);
      throw error;
    }
    
    console.log('✅ Voicemail stored successfully:', data);
    return filePath;
    
  } catch (error) {
    console.error('❌ Error downloading/storing voicemail:', error);
    throw error;
  }
}

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
      'done': 'completed',  // Add missing 'done' status
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
      'call.ended': 'call_ended',  // Add missing call.ended
      'call.ended-manual': 'call_ended',  // Add support for manual termination
      'call.missed': 'call_missed',
      'call.transferred': 'call_transferred',
      'call.hold': 'call_on_hold',
      'call.unhold': 'call_resumed',
      'call.voicemail': 'voicemail_left',
      'call.voicemail_left': 'voicemail_left',  // Fix: Add mapping for call.voicemail_left
      'call.ivr_option_selected': 'dtmf_pressed'  // Map to appropriate event type
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

  // Process internal events based on webhook mappings
  await processInternalEvents(supabase, standardEvent, call, callEvent, organizationId);

  return { call, callEvent };
}

// New function to handle internal event processing
async function processInternalEvents(
  supabase: any, 
  standardEvent: StandardCallEvent, 
  call: any, 
  callEvent: any, 
  organizationId: string
) {
  try {
    console.log('Checking for internal event mappings...');
    
    // Get webhook event mappings for this provider and event
    const { data: mappings, error: mappingsError } = await supabase
      .from('webhook_event_mappings')
      .select('*')
      .eq('provider', standardEvent.provider)
      .eq('external_event', standardEvent.eventData.webhookEvent)
      .eq('is_active', true);

    if (mappingsError) {
      console.error('Error fetching webhook mappings:', mappingsError);
      return;
    }

    if (!mappings || mappings.length === 0) {
      console.log('No webhook mappings found for:', standardEvent.provider, standardEvent.eventData.webhookEvent);
      return;
    }

    console.log('Found webhook mappings:', mappings);

    for (const mapping of mappings) {
      // Check if conditions are met
      if (!evaluateConditions(mapping.condition_rules, standardEvent)) {
        console.log('Conditions not met for mapping:', mapping.id);
        continue;
      }

      // Extract data using mapping rules
      const eventData = extractEventData(mapping.data_mapping, standardEvent);
      
      console.log('Creating internal event:', mapping.internal_event_type, eventData);

      // Create internal event
      const { data: internalEvent, error: internalError } = await supabase
        .from('internal_events')
        .insert({
          organization_id: organizationId,
          event_type: mapping.internal_event_type,
          call_id: call.id,
          customer_phone: standardEvent.customerPhone,
          event_data: eventData,
          triggered_by_event_id: callEvent.id,
          status: 'pending'
        })
        .select()
        .single();

      if (internalError) {
        console.error('Error creating internal event:', internalError);
      } else {
        console.log('Internal event created successfully:', internalEvent);
        
        // If this is a voicemail event, download and store the audio file
        if (mapping.internal_event_type === 'voicemail_left' && eventData.recording_url) {
          try {
            console.log('📞 Processing voicemail for storage...');
            const callUuid = standardEvent.eventData?.callData?.call_uuid || `call-${Date.now()}`;
            const storagePath = await downloadAndStoreVoicemail(supabase, eventData.recording_url, callUuid);
            
            // Update the internal event with the local storage path
            const { error: updateError } = await supabase
              .from('internal_events')
              .update({
                event_data: {
                  ...eventData,
                  storage_path: storagePath,
                  original_recording_url: eventData.recording_url
                }
              })
              .eq('id', internalEvent.id);
              
            if (updateError) {
              console.error('❌ Error updating internal event with storage path:', updateError);
            } else {
              console.log('✅ Updated internal event with storage path:', storagePath);
            }
          } catch (error) {
            console.error('❌ Error processing voicemail storage:', error);
            // Don't fail the entire webhook - just log the error
          }
        }
      }
    }
  } catch (error) {
    console.error('Error processing internal events:', error);
  }
}

// Helper function to evaluate condition rules
function evaluateConditions(conditionRules: any, standardEvent: StandardCallEvent): boolean {
  if (!conditionRules || Object.keys(conditionRules).length === 0) {
    return true; // No conditions means always match
  }

  try {
    // Check IVR options condition
    if (conditionRules.ivr_options) {
      const callData = standardEvent.eventData.callData;
      const ivrOptions = callData?.ivr_options || [];
      
      for (const option of ivrOptions) {
        if (conditionRules.ivr_options.branch && option.branch === conditionRules.ivr_options.branch) {
          return true;
        }
      }
      return false;
    }

    // Add more condition types as needed
    return true;
  } catch (error) {
    console.error('Error evaluating conditions:', error);
    return false;
  }
}

// Helper function to extract data using JSONPath-like mapping
function extractEventData(dataMapping: any, standardEvent: StandardCallEvent): any {
  const result: any = {};

  try {
    for (const [key, path] of Object.entries(dataMapping)) {
      if (typeof path === 'string') {
        // Simple JSONPath-like extraction
        if (path.startsWith('$.')) {
          const pathParts = path.substring(2).split('.');
          let value = standardEvent;
          
          for (const part of pathParts) {
            if (part.includes('[') && part.includes(']')) {
              // Handle array access like 'ivr_options[0]'
              const [arrayName, indexStr] = part.split('[');
              const index = parseInt(indexStr.replace(']', ''));
              value = (value as any)?.[arrayName]?.[index];
            } else {
              value = (value as any)?.[part];
            }
            
            if (value === undefined) break;
          }
          
          result[key] = value;
        } else {
          // Direct value
          result[key] = path;
        }
      } else {
        // Direct value (non-string)
        result[key] = path;
      }
    }
  } catch (error) {
    console.error('Error extracting event data:', error);
  }

  return result;
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
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});