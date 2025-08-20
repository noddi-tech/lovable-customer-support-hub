import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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
      console.error('❌ No recording URL provided');
      throw new Error('No recording URL provided');
    }

    // Fetch the audio file from the recording URL
    console.log('🌐 Fetching audio from URL...');
    const audioResponse = await fetch(recordingUrl);
    
    console.log('📊 Audio response status:', audioResponse.status, audioResponse.statusText);
    
    if (!audioResponse.ok) {
      console.error('❌ Failed to fetch audio:', audioResponse.status, audioResponse.statusText);
      const errorText = await audioResponse.text();
      console.error('❌ Error response body:', errorText);
      throw new Error(`Failed to fetch audio: ${audioResponse.status} ${audioResponse.statusText} - ${errorText}`);
    }

    // Convert to array buffer then base64 using Deno's native base64 encoder
    console.log('🔄 Converting to array buffer...');
    const audioBuffer = await audioResponse.arrayBuffer();
    console.log('📏 Audio buffer size:', audioBuffer.byteLength);
    
    console.log('🔄 Converting to base64 using Deno encoder...');
    const audioBytes = new Uint8Array(audioBuffer);
    const base64Data = encode(audioBytes);

    console.log('✅ Successfully converted audio to base64, length:', base64Data.length);

    return new Response(
      JSON.stringify({ 
        success: true,
        base64Data: base64Data,
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