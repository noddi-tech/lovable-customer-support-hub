import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
- Include one “go-deeper” option when appropriate.
- Avoid links unless explicitly provided.
Output ONLY valid JSON with the following shape:
{
  "suggestions": [
    { "title"?: string, "reply": string, "rationale"?: string, "tags"?: string[], "confidence"?: number }
  ]
}
`;

serve(async (req) => {
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

    const { customerMessage } = await req.json().catch(() => ({ customerMessage: '' }));
    if (!customerMessage || !String(customerMessage).trim()) {
      return new Response(JSON.stringify({ error: 'Missing customerMessage' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const inputText = String(customerMessage).slice(0, 8000);

    const body = {
      model: 'gpt-4o-mini',
      temperature: 0.5,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTIONS },
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
    return new Response(JSON.stringify({ error: 'Failed to generate suggestions', detail: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
