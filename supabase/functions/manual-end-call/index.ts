import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Manual end call request received:', req.method);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body = await req.json();
    const { callId, externalId, provider, reason } = body;

    console.log('Manual end call request:', { callId, externalId, provider, reason });

    if (!callId) {
      throw new Error('Call ID is required');
    }

    // Get the current call details
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*')
      .eq('id', callId)
      .single();

    if (callError || !call) {
      throw new Error('Call not found');
    }

    // Check if call is actually ongoing (not already ended)
    const ongoingStatuses = ['ringing', 'answered', 'on_hold', 'transferred'];
    if (!ongoingStatuses.includes(call.status)) {
      throw new Error(`Call is not ongoing. Current status: ${call.status}`);
    }

    console.log('Found ongoing call:', call);

    // Update the call status to completed
    const endedAt = new Date().toISOString();
    const { data: updatedCall, error: updateError } = await supabase
      .from('calls')
      .update({
        status: 'completed',
        ended_at: endedAt,
        end_reason: 'manual_termination',
        updated_at: endedAt,
        // Add metadata about manual termination
        metadata: {
          ...call.metadata,
          manual_termination: {
            terminated_at: endedAt,
            reason: reason || 'Manual termination by user',
            terminated_by: 'user' // Could be enhanced to track which user
          }
        }
      })
      .eq('id', callId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating call:', updateError);
      throw updateError;
    }

    console.log('Call updated successfully:', updatedCall);

    // Create a call event for this manual termination
    const { data: callEvent, error: eventError } = await supabase
      .from('call_events')
      .insert({
        call_id: callId,
        event_type: 'call_ended',
        event_data: {
          webhookEvent: 'call.ended-manual',
          timestamp: endedAt,
          manual_termination: true,
          reason: reason || 'Manual termination by user',
          callData: {
            id: call.external_id,
            status: 'done',
            ended_at: Math.floor(new Date(endedAt).getTime() / 1000),
            direction: call.direction,
            customer_phone: call.customer_phone,
            agent_phone: call.agent_phone,
            manual_termination: true
          }
        },
        timestamp: endedAt
      })
      .select()
      .single();

    if (eventError) {
      console.error('Error creating call event:', eventError);
      throw eventError;
    }

    console.log('Call event created successfully:', callEvent);

    // Log the manual termination for audit purposes
    console.log(`AUDIT: Call ${callId} (external: ${externalId}) manually terminated. Reason: ${reason || 'No reason provided'}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Call ended manually',
        call: updatedCall,
        event: callEvent
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in manual end call function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});