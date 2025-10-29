import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Missing configuration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { 
      refinementInstruction, 
      originalSuggestion, 
      refinedSuggestion,
      organizationId 
    } = await req.json();

    if (!refinementInstruction || !organizationId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Extract pattern key from refinement instruction (simple keyword extraction)
    const lowerInstruction = refinementInstruction.toLowerCase();
    let patternKey = 'other';
    let patternDescription = refinementInstruction;

    // Common patterns mapping
    if (lowerInstruction.includes('discount') || lowerInstruction.includes('rabatt')) {
      patternKey = 'add_discount_offer';
      patternDescription = 'Add discount or compensation offer';
    } else if (lowerInstruction.includes('apolog') || lowerInstruction.includes('sorry') || lowerInstruction.includes('beklager')) {
      patternKey = 'more_apologetic';
      patternDescription = 'Make response more apologetic';
    } else if (lowerInstruction.includes('timeline') || lowerInstruction.includes('when') || lowerInstruction.includes('tid')) {
      patternKey = 'include_timeline';
      patternDescription = 'Include specific timeline or deadline';
    } else if (lowerInstruction.includes('detail') || lowerInstruction.includes('explain') || lowerInstruction.includes('detalj')) {
      patternKey = 'more_detailed';
      patternDescription = 'Provide more detailed explanation';
    } else if (lowerInstruction.includes('shorter') || lowerInstruction.includes('brief') || lowerInstruction.includes('kort')) {
      patternKey = 'make_shorter';
      patternDescription = 'Make response more concise';
    } else if (lowerInstruction.includes('friendly') || lowerInstruction.includes('vennlig')) {
      patternKey = 'more_friendly';
      patternDescription = 'Make tone more friendly';
    }

    // Upsert pattern into knowledge_patterns
    const { data: pattern, error: patternError } = await supabase
      .from('knowledge_patterns')
      .upsert({
        organization_id: organizationId,
        pattern_type: 'refinement',
        pattern_key: patternKey,
        pattern_description: patternDescription,
        occurrence_count: 1,
        example_refinements: [refinementInstruction],
        last_seen_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id,pattern_key',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (patternError) {
      // If upsert failed, try to increment existing pattern
      const { error: updateError } = await supabase.rpc('increment_pattern_count', {
        org_id: organizationId,
        p_key: patternKey,
        example_text: refinementInstruction
      });

      if (updateError) {
        console.error('Error updating pattern:', updateError);
      }
    }

    console.log(`Extracted pattern: ${patternKey} for org: ${organizationId}`);

    return new Response(JSON.stringify({ 
      success: true,
      pattern_key: patternKey,
      pattern_description: patternDescription
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('extract-refinement-pattern error', err);
    return new Response(JSON.stringify({ 
      error: 'Failed to extract pattern', 
      detail: err instanceof Error ? err.message : String(err) 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
