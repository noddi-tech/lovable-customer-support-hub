// One-time backfill: populate recruitment_form_field_mappings.meta_question_key
// for rows where it is NULL by re-fetching questions from Meta.
//
// Idempotent: only updates rows where meta_question_key IS NULL. Re-running on
// already-backfilled data is a no-op.
//
// Matching strategy per row:
//   1. Try q.id === row.meta_question_id (canonical).
//   2. Fall back to q.label === row.meta_question_text (label match).
//   3. Otherwise: skip and report.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface FieldMappingRow {
  id: string;
  form_mapping_id: string;
  meta_question_id: string;
  meta_question_key: string | null;
  meta_question_text: string;
}

interface MetaQuestion {
  id?: string;
  key?: string;
  label?: string;
}

interface FormSummary {
  form_mapping_id: string;
  form_id: string | null;
  rows_total: number;
  already_set: number;
  updated: number;
  skipped_no_match: number;
  fetch_error?: string;
  skipped_rows?: Array<{ id: string; meta_question_id: string; meta_question_text: string }>;
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

  const userId = claimsData.claims.sub as string;

  // Require admin or super_admin via has_role
  const svc = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: roles } = await svc
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  const roleSet = new Set((roles ?? []).map((r: any) => r.role));
  const isAdmin = roleSet.has('admin') || roleSet.has('super_admin');
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Optional org scoping via body { organization_id?: string }
  let body: { organization_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    // no body is fine
  }

  // Find all rows that still need a key
  let needRowsQuery = svc
    .from('recruitment_form_field_mappings')
    .select('id, form_mapping_id, meta_question_id, meta_question_key, meta_question_text')
    .is('meta_question_key', null);

  if (body.organization_id) {
    // Scope via the parent form mapping's organization_id
    const { data: scopedFms } = await svc
      .from('recruitment_meta_form_mappings')
      .select('id')
      .eq('organization_id', body.organization_id);
    const ids = (scopedFms ?? []).map((r: any) => r.id);
    if (ids.length === 0) {
      return new Response(
        JSON.stringify({
          forms_processed: 0,
          rows_already_set: 0,
          rows_updated: 0,
          rows_skipped: 0,
          summaries: [],
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    needRowsQuery = needRowsQuery.in('form_mapping_id', ids);
  }

  const { data: needRows, error: needErr } = await needRowsQuery;
  if (needErr) {
    return new Response(JSON.stringify({ error: needErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const rowsToProcess = (needRows ?? []) as FieldMappingRow[];

  // Group by form_mapping_id
  const byForm = new Map<string, FieldMappingRow[]>();
  for (const r of rowsToProcess) {
    const arr = byForm.get(r.form_mapping_id) ?? [];
    arr.push(r);
    byForm.set(r.form_mapping_id, arr);
  }

  // Also count rows where the key is already set (per form_mapping_id), so the
  // summary tells admins "X already updated" across the whole org.
  const formIds = Array.from(byForm.keys());
  const alreadySetByForm = new Map<string, number>();
  if (formIds.length > 0) {
    const { data: alreadyRows } = await svc
      .from('recruitment_form_field_mappings')
      .select('form_mapping_id, id')
      .in('form_mapping_id', formIds)
      .not('meta_question_key', 'is', null);
    for (const r of (alreadyRows ?? []) as Array<{ form_mapping_id: string }>) {
      alreadySetByForm.set(r.form_mapping_id, (alreadySetByForm.get(r.form_mapping_id) ?? 0) + 1);
    }
  }

  const summaries: FormSummary[] = [];
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalAlreadySet = 0;

  for (const [formMappingId, rows] of byForm.entries()) {
    const alreadySet = alreadySetByForm.get(formMappingId) ?? 0;
    totalAlreadySet += alreadySet;

    // Look up the form id + integration token
    const { data: fm } = await svc
      .from('recruitment_meta_form_mappings')
      .select('id, integration_id, form_id, organization_id')
      .eq('id', formMappingId)
      .maybeSingle();

    if (!fm) {
      summaries.push({
        form_mapping_id: formMappingId,
        form_id: null,
        rows_total: rows.length,
        already_set: alreadySet,
        updated: 0,
        skipped_no_match: rows.length,
        fetch_error: 'form mapping not found',
      });
      totalSkipped += rows.length;
      continue;
    }

    const { data: integration } = await svc
      .from('recruitment_meta_integrations')
      .select('page_access_token')
      .eq('id', fm.integration_id)
      .maybeSingle();

    if (!integration?.page_access_token) {
      summaries.push({
        form_mapping_id: formMappingId,
        form_id: fm.form_id,
        rows_total: rows.length,
        already_set: alreadySet,
        updated: 0,
        skipped_no_match: rows.length,
        fetch_error: 'integration missing page_access_token',
      });
      totalSkipped += rows.length;
      continue;
    }

    const url =
      `https://graph.facebook.com/v19.0/${encodeURIComponent(fm.form_id)}` +
      `?fields=questions{type,key,label,id,options}` +
      `&access_token=${encodeURIComponent(integration.page_access_token)}`;

    let questions: MetaQuestion[] = [];
    let fetchError: string | undefined;
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (json.error) {
        fetchError = String(json.error.message ?? 'Meta API error');
      } else if (Array.isArray(json.questions)) {
        questions = json.questions as MetaQuestion[];
      }
    } catch (e) {
      fetchError = e instanceof Error ? e.message : String(e);
    }

    if (fetchError || questions.length === 0) {
      summaries.push({
        form_mapping_id: formMappingId,
        form_id: fm.form_id,
        rows_total: rows.length,
        already_set: alreadySet,
        updated: 0,
        skipped_no_match: rows.length,
        fetch_error: fetchError ?? 'no questions returned',
      });
      totalSkipped += rows.length;
      continue;
    }

    // Index questions by id and by label for quick lookup
    const qById = new Map<string, MetaQuestion>();
    const qByLabel = new Map<string, MetaQuestion>();
    for (const q of questions) {
      if (q.id) qById.set(q.id, q);
      if (q.label) qByLabel.set(q.label, q);
    }

    let updated = 0;
    const skippedRows: FormSummary['skipped_rows'] = [];

    for (const row of rows) {
      let match = qById.get(row.meta_question_id);
      if (!match) match = qByLabel.get(row.meta_question_text);
      const newKey = match?.key ?? null;

      if (!newKey) {
        skippedRows!.push({
          id: row.id,
          meta_question_id: row.meta_question_id,
          meta_question_text: row.meta_question_text,
        });
        continue;
      }

      // Idempotent update: only target rows that still have NULL key.
      const { error: updErr } = await svc
        .from('recruitment_form_field_mappings')
        .update({ meta_question_key: newKey })
        .eq('id', row.id)
        .is('meta_question_key', null);

      if (updErr) {
        skippedRows!.push({
          id: row.id,
          meta_question_id: row.meta_question_id,
          meta_question_text: row.meta_question_text,
        });
      } else {
        updated++;
      }
    }

    totalUpdated += updated;
    totalSkipped += skippedRows!.length;

    summaries.push({
      form_mapping_id: formMappingId,
      form_id: fm.form_id,
      rows_total: rows.length,
      already_set: alreadySet,
      updated,
      skipped_no_match: skippedRows!.length,
      skipped_rows: skippedRows!.length > 0 ? skippedRows : undefined,
    });
  }

  return new Response(
    JSON.stringify({
      forms_processed: byForm.size,
      rows_already_set: totalAlreadySet,
      rows_updated: totalUpdated,
      rows_skipped: totalSkipped,
      summaries,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
