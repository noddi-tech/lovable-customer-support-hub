// Quarantine approve — sets import_status='approved' for given applicants
// (org-scoped, admin-only).

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

  const ids: string[] = Array.isArray(body?.applicant_ids) ? body.applicant_ids : [];
  if (ids.length === 0) return jsonRes({ error: 'applicant_ids required' }, 400);
  const targetStageId: string | null = body?.target_stage_id ?? null;

  // RLS via user client ensures only org admins can update these rows.
  const { data: updated, error } = await userClient
    .from('applicants')
    .update({ import_status: 'approved' })
    .in('id', ids)
    .eq('import_status', 'pending_review')
    .select('id');
  if (error) return jsonRes({ error: error.message }, 500);

  if (targetStageId && updated && updated.length > 0) {
    const ids = updated.map((r: any) => r.id);
    await userClient.from('applications').update({ current_stage_id: targetStageId }).in('applicant_id', ids);
  }

  return jsonRes({ approved: updated?.length ?? 0 });
});
