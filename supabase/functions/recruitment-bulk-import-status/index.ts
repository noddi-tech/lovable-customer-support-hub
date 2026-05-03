// Bulk import — STATUS poll endpoint.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonRes({ error: 'Method not allowed' }, 405);

  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return jsonRes({ error: 'Unauthorized' }, 401);

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: auth } } },
  );
  const token = auth.replace('Bearer ', '');
  const { data: claimsData } = await userClient.auth.getClaims(token);
  if (!claimsData?.claims) return jsonRes({ error: 'Unauthorized' }, 401);

  let body: any;
  try { body = await req.json(); } catch { return jsonRes({ error: 'Invalid JSON' }, 400); }

  const id = body?.bulk_import_id;
  if (!id) return jsonRes({ error: 'bulk_import_id required' }, 400);

  const { data: imp, error } = await userClient
    .from('recruitment_bulk_imports')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !imp) return jsonRes({ error: 'Not found' }, 404);

  // counts by status
  const { data: counts } = await userClient
    .from('recruitment_bulk_import_lead_log')
    .select('status')
    .eq('bulk_import_id', id);

  const breakdown = { pending: 0, imported: 0, duplicate: 0, unmapped: 0, failed: 0 } as Record<string, number>;
  for (const r of (counts ?? [])) breakdown[r.status as string] = (breakdown[r.status as string] ?? 0) + 1;

  return jsonRes({ import: imp, breakdown });
});
