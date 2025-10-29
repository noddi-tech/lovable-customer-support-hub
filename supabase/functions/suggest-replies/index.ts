import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_INSTRUCTIONS = `
You are Noddi Customer Assistant.
Tone: trygg, kunnskapsrik, med humør og punch (Noddi TOV).
Task: Suggest 3–5 short, ready-to-send replies the agent can use.
- Mirror the customer's language (Norwegian if they wrote Norwegian).
- Never invent order data; propose a clarifying question if needed.
- Include one "go-deeper" option when appropriate.
- Avoid links unless explicitly provided.
Output ONLY valid JSON with the following shape:
{
  "suggestions": [
    { "title"?: string, "reply": string, "rationale"?: string, "tags"?: string[], "confidence"?: number }
  ]
}
`;

async function getLearnedPatterns(supabase: any, organizationId: string): Promise<string> {
  try {
    const { data: patterns } = await supabase
      .from('knowledge_patterns')
      .select('pattern_description, occurrence_count')
      .eq('organization_id', organizationId)
      .eq('pattern_type', 'refinement')
      .order('occurrence_count', { ascending: false })
      .limit(10);

    if (!patterns || patterns.length === 0) return '';

    return '\n\nLEARNED PATTERNS FROM THIS ORGANIZATION:\n' +
      patterns.map((p: any) => `- ${p.pattern_description} (used ${p.occurrence_count}x successfully)`).join('\n') +
      '\n\nPlease incorporate these learned patterns when they apply to the customer situation.\n';
  } catch (error) {
    console.warn('Failed to fetch learned patterns:', error);
    return '';
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { customerMessage, organizationId } = await req.json().catch(() => ({ customerMessage: '', organizationId: null }));
    if (!customerMessage || !String(customerMessage).trim()) {
      return new Response(JSON.stringify({ error: 'Missing customerMessage' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const inputText = String(customerMessage).slice(0, 8000);

    // Step 1: Get learned patterns (if we have org ID and supabase access)
    let learnedPatterns = '';
    let knowledgeContext = '';
    let supabaseClient: any = null;

    if (organizationId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      learnedPatterns = await getLearnedPatterns(supabaseClient, organizationId);
    }

    // Step 2: Search knowledge base for similar responses
    if (organizationId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && supabaseClient) {
      try {
        // Create embedding for the customer message
        const embeddingResp = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: inputText,
          }),
        });

        const embeddingData = await embeddingResp.json();
        const embedding = embeddingData?.data?.[0]?.embedding;

        if (embedding && supabaseClient) {
          // Search for similar responses including refined ones
          const { data: similarResponses } = await supabaseClient.rpc(
            'find_similar_responses',
            {
              query_embedding: embedding,
              org_id: organizationId,
              match_threshold: 0.75,
              match_count: 3,
            }
          );

          if (similarResponses && similarResponses.length > 0) {
            knowledgeContext = '\n\n## Proven responses from knowledge base:\n';
            similarResponses.forEach((item: any, idx: number) => {
              knowledgeContext += `\n${idx + 1}. Customer asked: "${item.customer_context}"\n`;
              knowledgeContext += `   Agent replied: "${item.agent_response}"\n`;
              knowledgeContext += `   (Quality: ${item.quality_score}, Used ${item.usage_count} times`;
              if (item.was_refined) {
                knowledgeContext += `, Refined by agent ⭐`;
              }
              knowledgeContext += `)\n`;
            });
            knowledgeContext += '\nPrioritize responses marked as "Refined by agent" - these were manually improved by our team.\n';
          }
        }
      } catch (embError) {
        console.warn('Knowledge search failed, continuing without it:', embError);
      }
    }

    // Step 3: Generate AI suggestions with learned patterns and knowledge context
    const body = {
      model: 'gpt-4o-mini',
      temperature: 0.5,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTIONS + learnedPatterns + knowledgeContext },
        { role: 'user', content: `Customer wrote:\n${inputText}` },
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

    const content = data?.choices?.[0]?.message?.content ?? '';
    let json;
    try {
      json = JSON.parse(content);
    } catch {
      json = { suggestions: content ? [{ reply: content }] : [] };
    }

    // Normalize result
    if (!json || typeof json !== 'object' || !Array.isArray(json.suggestions)) {
      json = { suggestions: [] };
    }

    return new Response(JSON.stringify(json), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('suggest-replies error', err);
    return new Response(JSON.stringify({ error: 'Failed to generate suggestions', detail: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
