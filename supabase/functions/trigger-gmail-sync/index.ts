import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
    console.log('🚀 Triggering Gmail sync...');
    
    // Parse the request body
    const requestBody = await req.json().catch(() => ({}));
    console.log('Request body:', requestBody);
    
    // Call the gmail-sync function with the same parameters
    const syncResponse = await fetch(
      `https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/gmail-sync`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    const syncResult = await syncResponse.text();
    console.log('Gmail sync result:', syncResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Gmail sync triggered successfully',
        syncResult 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error triggering Gmail sync:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});