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
      console.log('✅ Successfully parsed request body');
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
      console.log('❌ No recording URL provided');
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

    console.log('📞 About to fetch audio file from S3...');
    
    // Fetch the audio file from S3
    let audioResponse;
    try {
      audioResponse = await fetch(recordingUrl);
      console.log('✅ Fetch completed, status:', audioResponse.status);
    } catch (fetchError) {
      console.error('❌ Fetch failed with error:', fetchError);
      throw new Error(`Fetch failed: ${fetchError.message}`);
    }
    
    if (!audioResponse.ok) {
      console.error('❌ Audio response not OK:', audioResponse.status, audioResponse.statusText);
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

    console.log('📞 About to convert response to array buffer...');
    
    // Get the audio data as array buffer
    let audioBuffer;
    try {
      audioBuffer = await audioResponse.arrayBuffer();
      console.log('✅ Array buffer conversion successful, size:', audioBuffer.byteLength);
    } catch (bufferError) {
      console.error('❌ Array buffer conversion failed:', bufferError);
      throw new Error(`Buffer conversion failed: ${bufferError.message}`);
    }
    
    const contentType = audioResponse.headers.get('content-type') || 'audio/mpeg';
    
    console.log('📞 Audio file info:', {
      size: audioBuffer.byteLength,
      contentType
    });

    console.log('📞 About to convert to base64...');

    // Convert to base64 for transport (handle large files properly)
    let audioBytes;
    try {
      audioBytes = new Uint8Array(audioBuffer);
      console.log('✅ Created Uint8Array, length:', audioBytes.length);
    } catch (arrayError) {
      console.error('❌ Uint8Array creation failed:', arrayError);
      throw new Error(`Uint8Array creation failed: ${arrayError.message}`);
    }
    
    // Convert to base64 in chunks to avoid call stack overflow
    let base64Audio = '';
    const chunkSize = 8192; // Process in 8KB chunks
    
    try {
      for (let i = 0; i < audioBytes.length; i += chunkSize) {
        const chunk = audioBytes.slice(i, i + chunkSize);
        const chunkString = String.fromCharCode.apply(null, Array.from(chunk));
        base64Audio += btoa(chunkString);
        
        // Log progress for large files
        if (i % (chunkSize * 10) === 0) {
          console.log(`📞 Base64 progress: ${Math.round((i / audioBytes.length) * 100)}%`);
        }
      }
      console.log('✅ Base64 conversion completed, length:', base64Audio.length);
    } catch (base64Error) {
      console.error('❌ Base64 conversion failed:', base64Error);
      throw new Error(`Base64 conversion failed: ${base64Error.message}`);
    }

    console.log('📞 About to create response...');

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