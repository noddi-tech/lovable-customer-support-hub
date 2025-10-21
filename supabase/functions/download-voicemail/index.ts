import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log('🚀 EDGE FUNCTION CALLED - Method:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📞 Starting download-voicemail function...');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { voicemailId } = await req.json();
    console.log('🎵 Processing voicemail ID:', voicemailId);

    if (!voicemailId) {
      console.error('❌ No voicemail ID provided');
      throw new Error('No voicemail ID provided');
    }

    // Get the voicemail event with storage path
    const { data: voicemailEvent, error: eventError } = await supabase
      .from('internal_events')
      .select('event_data')
      .eq('id', voicemailId)
      .eq('event_type', 'voicemail_left')
      .single();

    if (eventError || !voicemailEvent) {
      console.error('❌ Voicemail event not found:', eventError);
      throw new Error('Voicemail event not found');
    }

    const storagePath = voicemailEvent.event_data?.storage_path;
    if (!storagePath) {
      console.error('❌ No storage path found for voicemail');
      throw new Error('No storage path found for voicemail');
    }

    console.log('📁 Retrieving voicemail from storage:', storagePath);

    // Get the file from Supabase storage
    const { data: fileData, error: storageError } = await supabase.storage
      .from('voicemails')
      .download(storagePath);

    if (storageError || !fileData) {
      console.error('❌ Error retrieving file from storage:', storageError);
      throw new Error(`Error retrieving file from storage: ${storageError?.message}`);
    }

    console.log('🔄 Converting file to base64...');
    const arrayBuffer = await fileData.arrayBuffer();
    const audioBytes = new Uint8Array(arrayBuffer);
    
    // Convert to base64 using chunks to handle large files
    let base64Data = '';
    const chunkSize = 8192;
    for (let i = 0; i < audioBytes.length; i += chunkSize) {
      const chunk = audioBytes.slice(i, i + chunkSize);
      base64Data += btoa(String.fromCharCode.apply(null, Array.from(chunk)));
    }

    console.log('✅ Successfully converted voicemail to base64, length:', base64Data.length);

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
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});