// Bulk import — DRY RUN.
// Creates a pending recruitment_bulk_imports row, paginates Meta /leads
// per form just to count, and reports per-form mapping completeness.

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
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims) return jsonRes({ error: 'Unauthorized' }, 401);
  const userId = claimsData.claims.sub as string;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonRes({ error: 'Invalid JSON' }, 400);
  }

  const { integration_id, form_mapping_ids, since_date, until_date, approval_mode, target_pipeline_stage_id_per_form } = body ?? {};
  if (!integration_id || !Array.isArray(form_mapping_ids) || form_mapping_ids.length === 0 || !since_date || !until_date) {
    return jsonRes({ error: 'Missing required fields' }, 400);
  }
  if (!['direct', 'quarantine'].includes(approval_mode)) {
    return jsonRes({ error: 'Invalid approval_mode' }, 400);
  }

  const sinceMs = Date.parse(since_date);
  const untilMs = Date.parse(until_date);
  if (!Number.isFinite(sinceMs) || !Number.isFinite(untilMs) || untilMs < sinceMs) {
    return jsonRes({ error: 'Invalid date range' }, 400);
  }
  if (untilMs - sinceMs > 90 * 24 * 60 * 60 * 1000) {
    return jsonRes({ error: 'Date range cannot exceed 90 days' }, 400);
  }

  const svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Resolve integration → org + page token
  const { data: integration } = await svc
    .from('recruitment_meta_integrations')
    .select('id, organization_id, page_access_token')
    .eq('id', integration_id)
    .maybeSingle();
  if (!integration) return jsonRes({ error: 'Integration not found' }, 404);
  if (!integration.page_access_token) return jsonRes({ error: 'Integration missing page_access_token' }, 400);

  // Verify user belongs to org via user client
  const { data: orgCheck } = await userClient
    .from('recruitment_meta_integrations')
    .select('id')
    .eq('id', integration_id)
    .maybeSingle();
  if (!orgCheck) return jsonRes({ error: 'Access denied' }, 403);

  // Resolve profile id for created_by
  const { data: profile } = await svc.from('profiles').select('id').eq('user_id', userId).maybeSingle();

  // Look up each form mapping + its current field mapping count
  const totalsPerForm: any[] = [];
  let totalLeadsFound = 0;
  let scopeMissing = false;

  for (const fmId of form_mapping_ids) {
    const { data: fm } = await svc
      .from('recruitment_meta_form_mappings')
      .select('id, form_id, form_name, position_id, integration_id, organization_id')
      .eq('id', fmId)
      .maybeSingle();

    if (!fm || fm.integration_id !== integration_id) {
      totalsPerForm.push({ form_mapping_id: fmId, error: 'Form mapping not found' });
      continue;
    }

    // Mapping completeness: has at least one field_mapping row
    const { count: mappingCount } = await svc
      .from('recruitment_form_field_mappings')
      .select('id', { count: 'exact', head: true })
      .eq('form_mapping_id', fmId);

    let leadsFound = 0;
    let next: string | null = `https://graph.facebook.com/v19.0/${encodeURIComponent(fm.form_id)}/leads?fields=id&limit=100&filtering=[{"field":"time_created","operator":"GREATER_THAN","value":${Math.floor(sinceMs / 1000)}},{"field":"time_created","operator":"LESS_THAN","value":${Math.floor(untilMs / 1000)}}]&access_token=${encodeURIComponent(integration.page_access_token)}`;
    let pages = 0;
    let formError: string | null = null;

    while (next && pages < 100) {
      const res = await fetch(next);
      const j = await res.json();
      if (j.error) {
        formError = String(j.error.message ?? 'Meta error');
        if (/pages_manage_ads|permission|scope/i.test(formError)) scopeMissing = true;
        break;
      }
      leadsFound += (j.data ?? []).length;
      next = j.paging?.next ?? null;
      pages++;
    }

    totalLeadsFound += leadsFound;
    totalsPerForm.push({
      form_mapping_id: fmId,
      form_name: fm.form_name,
      form_id: fm.form_id,
      leads_found: leadsFound,
      mapping_complete: (mappingCount ?? 0) > 0,
      mapping_status: (mappingCount ?? 0) > 0 ? 'complete' : 'missing',
      error: formError,
      target_stage_id: target_pipeline_stage_id_per_form?.[fmId] ?? null,
    });
  }

  if (scopeMissing) {
    return jsonRes({
      error: 'pages_manage_ads scope missing',
      scope_missing: true,
      message: 'Bulk import requires the pages_manage_ads scope which is currently not granted. Live webhook ingestion is unaffected.',
      totals_per_form: totalsPerForm,
    }, 200);
  }

  // Insert pending bulk import row
  const { data: imp, error: impErr } = await svc
    .from('recruitment_bulk_imports')
    .insert({
      organization_id: integration.organization_id,
      integration_id,
      form_mapping_ids,
      since_date,
      until_date,
      approval_mode,
      status: 'pending',
      total_leads_found: totalLeadsFound,
      created_by: profile?.id ?? null,
    })
    .select('id')
    .single();

  if (impErr || !imp) {
    return jsonRes({ error: impErr?.message ?? 'Could not create bulk import row' }, 500);
  }

  return jsonRes({
    bulk_import_id: imp.id,
    dry_run: true,
    totals_per_form: totalsPerForm,
    total_leads_found: totalLeadsFound,
  });
});
