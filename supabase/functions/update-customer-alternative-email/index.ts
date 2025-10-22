import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { customerId, alternativeEmail, primaryEmail } = await req.json();

    console.log('[Alternative Email] Processing update:', {
      customerId,
      alternativeEmail,
      primaryEmail
    });

    // 1. Fetch current customer metadata
    const { data: customer, error: fetchError } = await supabaseClient
      .from('customers')
      .select('metadata, email')
      .eq('id', customerId)
      .single();

    if (fetchError) {
      console.error('[Alternative Email] Fetch error:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Update metadata with alternative email
    const currentMetadata = customer.metadata || {};
    const alternativeEmails = currentMetadata.alternative_emails || [];
    
    // Add new alternative email if not already present
    if (!alternativeEmails.includes(alternativeEmail)) {
      alternativeEmails.push(alternativeEmail);
    }
    
    // Don't duplicate primary email in alternatives
    const filteredEmails = alternativeEmails.filter((e: string) => e !== customer.email);

    const updatedMetadata = {
      ...currentMetadata,
      alternative_emails: filteredEmails,
      primary_noddi_email: alternativeEmail, // The one that worked for lookup
    };

    console.log('[Alternative Email] Updating metadata:', {
      customerId,
      newAlternatives: filteredEmails,
      primaryNoddi: alternativeEmail
    });

    // 3. Update customer record
    const { error: updateError } = await supabaseClient
      .from('customers')
      .update({ metadata: updatedMetadata })
      .eq('id', customerId);

    if (updateError) {
      console.error('[Alternative Email] Update error:', updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Alternative Email] ✅ Successfully updated metadata');

    return new Response(
      JSON.stringify({ 
        success: true, 
        alternativeEmails: filteredEmails,
        primaryNoddiEmail: alternativeEmail
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Alternative Email] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
