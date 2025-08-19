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
    console.log('Download voicemail request received');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { voicemailId, recordingUrl } = await req.json();

    if (!voicemailId || !recordingUrl) {
      throw new Error('Missing voicemailId or recordingUrl');
    }

    console.log('Downloading voicemail:', { voicemailId, recordingUrl });

    // Get the voicemail record to determine organization
    const { data: voicemail, error: vmError } = await supabase
      .from('internal_events')
      .select('organization_id, customer_phone, created_at')
      .eq('id', voicemailId)
      .single();

    if (vmError) {
      console.error('Error fetching voicemail record:', vmError);
      throw new Error('Voicemail not found');
    }

    // Download the audio file from the external URL
    console.log('Fetching recording from:', recordingUrl);
    const audioResponse = await fetch(recordingUrl);
    
    if (!audioResponse.ok) {
      throw new Error(`Failed to download recording: ${audioResponse.status}`);
    }

    // Get the audio as ArrayBuffer
    const audioBuffer = await audioResponse.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { 
      type: audioResponse.headers.get('content-type') || 'audio/mpeg' 
    });

    console.log('Audio downloaded, size:', audioBlob.size);

    // Generate storage path
    const timestamp = new Date(voicemail.created_at).toISOString().split('T')[0];
    const phone = voicemail.customer_phone?.replace(/[^0-9]/g, '') || 'unknown';
    const fileName = `${timestamp}-${phone}-${voicemailId}.mp3`;
    const storagePath = `${voicemail.organization_id}/${fileName}`;

    // Upload to Supabase Storage
    console.log('Uploading to storage:', storagePath);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('voicemails')
      .upload(storagePath, audioBlob, {
        contentType: audioResponse.headers.get('content-type') || 'audio/mpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to store recording: ${uploadError.message}`);
    }

    console.log('Upload successful:', uploadData);

    // Get the signed URL for the stored file
    const { data: urlData } = supabase.storage
      .from('voicemails')
      .getPublicUrl(storagePath);

    // Update the internal event with the local storage URL
    const { error: updateError } = await supabase
      .from('internal_events')
      .update({
        event_data: {
          ...voicemail,
          local_recording_url: urlData.publicUrl,
          original_recording_url: recordingUrl,
          storage_path: storagePath
        }
      })
      .eq('id', voicemailId);

    if (updateError) {
      console.error('Error updating voicemail record:', updateError);
      // Don't throw here as the file is already uploaded
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        localUrl: urlData.publicUrl,
        storagePath,
        message: 'Voicemail downloaded and stored successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error downloading voicemail:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error.stack 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});