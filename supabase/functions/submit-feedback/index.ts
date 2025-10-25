import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Missing configuration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messageId, rating, comment } = await req.json();
    
    if (!messageId || !rating) {
      return new Response(JSON.stringify({ error: 'Missing messageId or rating' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (rating < 1 || rating > 5) {
      return new Response(JSON.stringify({ error: 'Rating must be between 1 and 5' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find the response tracking record for this message
    const { data: tracking, error: trackingError } = await supabase
      .from('response_tracking')
      .select('*')
      .eq('message_id', messageId)
      .single();

    if (trackingError || !tracking) {
      console.error('No tracking record found for message:', messageId);
      return new Response(JSON.stringify({ error: 'No tracking record found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update with feedback
    const { error: updateError } = await supabase
      .from('response_tracking')
      .update({
        feedback_rating: rating,
        feedback_comment: comment || null,
        feedback_submitted_at: new Date().toISOString(),
      })
      .eq('id', tracking.id);

    if (updateError) {
      console.error('Error updating feedback:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to submit feedback' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Feedback submitted for tracking ${tracking.id}: ${rating}/5`);

    return new Response(JSON.stringify({ 
      success: true,
      tracking_id: tracking.id,
      rating,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('submit-feedback error', err);
    return new Response(JSON.stringify({ 
      error: 'Failed to submit feedback', 
      detail: err instanceof Error ? err.message : String(err) 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
