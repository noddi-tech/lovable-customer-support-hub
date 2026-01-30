import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // SECURITY FIX: Block in production environment
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const isProduction = supabaseUrl.includes('qgfaycwsangsqzpveoup'); // Production project ID
  
  if (isProduction) {
    console.log('❌ Dev-login blocked in production');
    return new Response(
      JSON.stringify({ error: 'Endpoint not available in production' }), 
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { email, redirectTo } = await req.json();
    
    // Only allow specific dev emails for security
    const allowedDevEmails = ['joachim@noddi.no', 'joachim.rathke@gmail.com'];
    if (!allowedDevEmails.includes(email)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized email for dev login' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for generating magic links
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Ensure we use the correct redirect URL
    const finalRedirectTo = redirectTo || `${new URL(req.url).origin}/`;
    console.log('Using redirect URL:', finalRedirectTo);

    // Generate magic link
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: finalRedirectTo
      }
    });

    if (error) {
      console.error('Error generating magic link:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to generate magic link' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        magicLink: data.properties?.action_link,
        message: 'Magic link generated successfully' 
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in dev-login function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});