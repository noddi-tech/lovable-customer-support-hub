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

    // Try to download from the provided URL
    console.log('📞 Attempting to download from external URL...');
    let audioResponse;
    
    try {
      // First try the original recording URL
      audioResponse = await fetch(recordingUrl);
      console.log('📞 External fetch response:', { 
        status: audioResponse.status, 
        ok: audioResponse.ok,
        headers: Object.fromEntries(audioResponse.headers.entries())
      });
      
      if (!audioResponse.ok) {
        console.error('❌ External URL not accessible:', audioResponse.status, audioResponse.statusText);
        
        // Try the signed URL from metadata if available
        const signedUrl = voicemail.calls?.metadata?.originalPayload?.voicemail;
        if (signedUrl && signedUrl !== recordingUrl) {
          console.log('📞 Trying signed URL from metadata...');
          audioResponse = await fetch(signedUrl);
          console.log('📞 Signed URL response:', { status: audioResponse.status, ok: audioResponse.ok });
        }
        
        if (!audioResponse.ok) {
          throw new Error(`All URLs failed. Status: ${audioResponse.status}`);
        }
      }
    } catch (fetchError) {
      console.error('❌ Failed to fetch audio:', fetchError);
      
      // Return error response with details
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
    }

    // Get the audio as ArrayBuffer
    console.log('📞 Processing audio data...');
    const audioBuffer = await audioResponse.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { 
      type: audioResponse.headers.get('content-type') || 'audio/mpeg' 
    });

    console.log('📞 Audio processed, size:', audioBlob.size);

    // Generate storage path
    const timestamp = new Date(voicemail.created_at).toISOString().split('T')[0];
    const phone = voicemail.customer_phone?.replace(/[^0-9]/g, '') || 'unknown';
    const fileName = `${timestamp}-${phone}-${voicemailId}.mp3`;
    const storagePath = `${voicemail.organization_id}/${fileName}`;

    // Upload to Supabase Storage
    console.log('📞 Uploading to storage:', storagePath);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('voicemails')
      .upload(storagePath, audioBlob, {
        contentType: audioResponse.headers.get('content-type') || 'audio/mpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError);
      throw new Error(`Failed to store recording: ${uploadError.message}`);
    }

    console.log('📞 Upload successful:', uploadData);

    // Get the public URL for the stored file
    const { data: urlData } = supabase.storage
      .from('voicemails')
      .getPublicUrl(storagePath);

    // Update the internal event with the local storage URL
    console.log('📞 Updating voicemail record with local URL...');
    const updatedEventData = {
      ...voicemail.event_data,
      local_recording_url: urlData.publicUrl,
      original_recording_url: recordingUrl,
      storage_path: storagePath,
      cached_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('internal_events')
      .update({ event_data: updatedEventData })
      .eq('id', voicemailId);

    if (updateError) {
      console.error('⚠️ Error updating voicemail record:', updateError);
      // Don't throw here as the file is already uploaded
    }

    console.log('✅ Voicemail processing complete');

    return new Response(
      JSON.stringify({ 
        success: true,
        localUrl: urlData.publicUrl,
        storagePath,
        cached: false,
        message: 'Voicemail downloaded and stored successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
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