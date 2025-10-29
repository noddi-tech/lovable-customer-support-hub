import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_INSTRUCTIONS = `
You are a helpful AI assistant that refines customer service responses based on agent feedback.

Your task:
1. Take an original suggestion
2. Apply the agent's refinement instructions
3. Return an improved version that incorporates the changes while maintaining professional tone

Important:
- Keep the same language as the original (Norwegian if Norwegian, English if English)
- Maintain professional and friendly tone
- Be specific and actionable
- Don't make the response too long unless specifically asked
`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { 
      originalSuggestion, 
      refinementInstructions,
      customerMessage 
    } = await req.json().catch(() => ({ 
      originalSuggestion: '', 
      refinementInstructions: '',
      customerMessage: ''
    }));

    if (!originalSuggestion || !String(originalSuggestion).trim()) {
      return new Response(JSON.stringify({ error: 'Missing originalSuggestion' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!refinementInstructions || !String(refinementInstructions).trim()) {
      return new Response(JSON.stringify({ error: 'Missing refinementInstructions' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build refinement prompt
    const userPrompt = `
Original suggestion: "${originalSuggestion}"

${customerMessage ? `Customer context: "${customerMessage}"` : ''}

Agent refinement request: "${refinementInstructions}"

Please modify the original suggestion to incorporate the agent's refinement while maintaining professional tone and style.
Return ONLY the refined response text, nothing else.
`;

    const body = {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTIONS },
        { role: 'user', content: userPrompt },
      ],
    };

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error('OpenAI error:', data);
      return new Response(JSON.stringify({ error: 'OpenAI request failed', detail: data }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const refinedText = data?.choices?.[0]?.message?.content ?? '';

    return new Response(JSON.stringify({ 
      refinedText,
      learningMetadata: {
        pattern_type: 'refinement',
        original_length: originalSuggestion.length,
        refined_length: refinedText.length,
        refinement_instruction: refinementInstructions
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('refine-suggestion error', err);
    return new Response(JSON.stringify({ 
      error: 'Failed to refine suggestion', 
      detail: err instanceof Error ? err.message : String(err) 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
