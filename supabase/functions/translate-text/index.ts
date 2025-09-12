import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Language code mapping for better OpenAI compatibility
const languageNames: Record<string, string> = {
  'auto': 'auto-detect',
  'en': 'English',
  'es': 'Spanish', 
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'nl': 'Dutch',
  'no': 'Norwegian',
  'sv': 'Swedish',
  'da': 'Danish'
};

const SYSTEM_INSTRUCTIONS = `
You are a professional translation assistant.
Task: Translate the provided text accurately while preserving meaning, tone, and context.
- If source language is "auto-detect", identify the language first
- Maintain the original formatting and structure
- Keep proper nouns, brand names, and technical terms appropriate for the context
- Preserve any emotional tone or formality level
- For customer service contexts, maintain professional courtesy

Output ONLY valid JSON with this exact structure:
{
  "translatedText": "the translated text here",
  "detectedSourceLanguage": "language code if auto-detected, otherwise null"
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

    const { text, sourceLanguage, targetLanguage } = await req.json().catch(() => ({}));
    
    if (!text || !String(text).trim()) {
      return new Response(JSON.stringify({ error: 'Missing text to translate' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!targetLanguage) {
      return new Response(JSON.stringify({ error: 'Missing target language' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const inputText = String(text).slice(0, 4000); // Limit input length
    const sourceLang = sourceLanguage === 'auto' ? 'auto-detect' : (languageNames[sourceLanguage] || sourceLanguage);
    const targetLang = languageNames[targetLanguage] || targetLanguage;

    let prompt = `Translate the following text to ${targetLang}`;
    if (sourceLang !== 'auto-detect') {
      prompt += ` from ${sourceLang}`;
    }
    prompt += `:\n\n${inputText}`;

    const body = {
      model: 'gpt-4o-mini',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTIONS },
        { role: 'user', content: prompt },
      ],
    };

    console.log('Translation request:', { sourceLang, targetLang, textLength: inputText.length });

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
      return new Response(JSON.stringify({ error: 'Translation request failed', detail: data }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const content = data?.choices?.[0]?.message?.content ?? '';
    let json;
    try {
      json = JSON.parse(content);
    } catch {
      // Fallback if JSON parsing fails
      json = { translatedText: content || inputText, detectedSourceLanguage: null };
    }

    // Validate and normalize response
    if (!json || typeof json !== 'object' || typeof json.translatedText !== 'string') {
      json = { translatedText: inputText, detectedSourceLanguage: null };
    }

    console.log('Translation completed successfully');

    return new Response(JSON.stringify(json), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('translate-text error:', err);
    return new Response(JSON.stringify({ 
      error: 'Failed to translate text', 
      detail: err?.message || String(err) 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});