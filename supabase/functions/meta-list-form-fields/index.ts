// Lists Meta Lead Ad form questions for the integration's stored page.
// Caches results in-memory for 60s to avoid hammering Meta on UI re-renders.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CacheEntry {
  expiresAt: number;
  payload: unknown;
}
const cache = new Map<string, CacheEntry>();

function getCached(key: string): unknown | null {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    cache.delete(key);
    return null;
  }
  return e.payload;
}

function setCached(key: string, payload: unknown) {
  cache.set(key, { expiresAt: Date.now() + 60_000, payload });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { form_mapping_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!body.form_mapping_id) {
    return new Response(JSON.stringify({ error: 'form_mapping_id required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Use service role for the integration lookup so we can read page_access_token.
  // RLS on the form mapping check is verified through user client first.
  const { data: formMapping, error: fmErr } = await userClient
    .from('recruitment_meta_form_mappings')
    .select('id, integration_id, form_id, organization_id')
    .eq('id', body.form_mapping_id)
    .maybeSingle();

  if (fmErr || !formMapping) {
    return new Response(JSON.stringify({ error: 'Form mapping not found or access denied' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: integration } = await svc
    .from('recruitment_meta_integrations')
    .select('page_access_token')
    .eq('id', formMapping.integration_id)
    .maybeSingle();

  if (!integration?.page_access_token) {
    return new Response(JSON.stringify({ error: 'Integration missing page_access_token' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const cacheKey = `${formMapping.form_id}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = `https://graph.facebook.com/v19.0/${encodeURIComponent(formMapping.form_id)}?fields=questions{type,key,label,id,options}&access_token=${encodeURIComponent(integration.page_access_token)}`;
  const res = await fetch(url);
  const json = await res.json();

  if (json.error) {
    const msg = String(json.error.message ?? '');
    const scopeMissing = /pages_manage_ads|permission|scope/i.test(msg);
    const payload = scopeMissing
      ? { questions: null, scope_missing: true, error: msg }
      : { questions: null, error: msg };
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const questions = Array.isArray(json.questions) ? json.questions : [];
  const payload = { questions, scope_missing: false };
  setCached(cacheKey, payload);

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
