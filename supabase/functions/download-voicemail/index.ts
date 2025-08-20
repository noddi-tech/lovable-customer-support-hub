import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    console.log('📞 Download voicemail function called successfully');
    
    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      console.error('❌ Invalid JSON:', e);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON in request body' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    const { voicemailId, recordingUrl } = requestBody;
    console.log('📞 Processing request:', { voicemailId, recordingUrl: recordingUrl?.substring(0, 100) + '...' });

    if (!recordingUrl) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No recording URL provided' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    console.log('📞 Fetching audio file from S3...');
    
    // Fetch the audio file from S3
    const audioResponse = await fetch(recordingUrl);
    
    if (!audioResponse.ok) {
      console.error('❌ Failed to fetch audio:', audioResponse.status, audioResponse.statusText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to fetch recording: ${audioResponse.status} ${audioResponse.statusText}` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    // Get the audio data as array buffer
    const audioBuffer = await audioResponse.arrayBuffer();
    const contentType = audioResponse.headers.get('content-type') || 'audio/mpeg';
    
    console.log('📞 Successfully fetched audio file:', {
      size: audioBuffer.byteLength,
      contentType
    });

    // Convert to base64 for transport (handle large files properly)
    const audioBytes = new Uint8Array(audioBuffer);
    
    // Convert to base64 in chunks to avoid call stack overflow
    let base64Audio = '';
    const chunkSize = 8192; // Process in 8KB chunks
    
    for (let i = 0; i < audioBytes.length; i += chunkSize) {
      const chunk = audioBytes.slice(i, i + chunkSize);
      const chunkString = String.fromCharCode.apply(null, Array.from(chunk));
      base64Audio += btoa(chunkString);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        audioData: base64Audio,
        contentType: contentType,
        message: 'Audio file successfully downloaded and encoded',
        voicemailId,
        timestamp: new Date().toISOString()
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
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});