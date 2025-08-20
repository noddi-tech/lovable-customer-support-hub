import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🚀 EDGE FUNCTION CALLED - Method:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📞 Starting download-voicemail function...');
    
    const { voicemailId, recordingUrl } = await req.json();
    console.log('🎵 Processing voicemail:', voicemailId, 'URL:', recordingUrl);

    if (!recordingUrl) {
      throw new Error('No recording URL provided');
    }

    // Fetch the audio file from the recording URL
    console.log('🌐 Fetching audio from URL...');
    const audioResponse = await fetch(recordingUrl);
    
    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch audio: ${audioResponse.status} ${audioResponse.statusText}`);
    }

    // Convert to array buffer then base64
    console.log('🔄 Converting to base64...');
    const audioBuffer = await audioResponse.arrayBuffer();
    const audioBytes = new Uint8Array(audioBuffer);
    
    // Convert to base64 in chunks to avoid call stack issues
    let base64 = '';
    const chunkSize = 8192;
    for (let i = 0; i < audioBytes.length; i += chunkSize) {
      const chunk = audioBytes.slice(i, i + chunkSize);
      base64 += btoa(String.fromCharCode.apply(null, Array.from(chunk)));
    }

    console.log('✅ Successfully converted audio to base64, length:', base64.length);

    return new Response(
      JSON.stringify({ 
        success: true,
        base64Data: base64,
        mimeType: 'audio/mpeg',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Error in edge function:', error);
    
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