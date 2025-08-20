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
    console.log('📞 Download voicemail request received');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      throw new Error('Invalid JSON in request body');
    }

    const { voicemailId, recordingUrl } = requestBody;
    console.log('📞 Request params:', { voicemailId, recordingUrl: recordingUrl?.substring(0, 100) + '...' });

    if (!voicemailId || !recordingUrl) {
      throw new Error('Missing voicemailId or recordingUrl parameters');
    }

    // Get the voicemail record
    console.log('📞 Fetching voicemail record...');
    const { data: voicemail, error: vmError } = await supabase
      .from('internal_events')
      .select('*')
      .eq('id', voicemailId)
      .single();

    if (vmError) {
      console.error('❌ Error fetching voicemail record:', vmError);
      throw new Error(`Voicemail not found: ${vmError.message}`);
    }

    console.log('📞 Voicemail record found:', {
      id: voicemail.id,
      organization_id: voicemail.organization_id,
      customer_phone: voicemail.customer_phone,
      hasLocalUrl: !!voicemail.event_data?.local_recording_url
    });

    // Check if we already have a local copy
    if (voicemail.event_data?.local_recording_url && voicemail.event_data?.storage_path) {
      console.log('📞 Local copy exists, checking if accessible...');
      
      // Try to get the existing stored file
      const { data: existingUrl } = supabase.storage
        .from('voicemails')
        .getPublicUrl(voicemail.event_data.storage_path);
      
      if (existingUrl?.publicUrl) {
        console.log('✅ Returning existing local URL');
        return new Response(
          JSON.stringify({ 
            success: true,
            localUrl: existingUrl.publicUrl,
            storagePath: voicemail.event_data.storage_path,
            cached: true,
            message: 'Using existing local copy' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }
    }

    // For now, return an error indicating the URL has expired
    // In a real implementation, you would download and store the file
    console.log('❌ Recording URL has expired and no local copy available');
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Recording not accessible',
        details: 'The recording URL has expired and cannot be accessed. The voicemail may need to be re-downloaded from the original source.',
        voicemailId,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      }
    );

  } catch (error) {
    console.error('❌ Error in download-voicemail function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error.stack,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});