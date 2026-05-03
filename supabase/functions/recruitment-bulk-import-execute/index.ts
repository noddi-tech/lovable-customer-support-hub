// Bulk import — EXECUTE.
// Synchronously paginates Meta /leads per form_mapping in scope and ingests each lead.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ingestLead, loadIngestionContext } from '../_shared/recruitment-ingest-lead.ts';

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

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonRes({ error: 'Invalid JSON' }, 400);
  }
  const bulkImportId: string | undefined = body?.bulk_import_id;
  if (!bulkImportId) return jsonRes({ error: 'bulk_import_id required' }, 400);

  // Org access check
  const { data: orgCheck } = await userClient
    .from('recruitment_bulk_imports')
    .select('id')
    .eq('id', bulkImportId)
    .maybeSingle();
  if (!orgCheck) return jsonRes({ error: 'Access denied' }, 403);

  const svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: imp } = await svc
    .from('recruitment_bulk_imports')
    .select('*')
    .eq('id', bulkImportId)
    .maybeSingle();
  if (!imp) return jsonRes({ error: 'Bulk import not found' }, 404);
  if (imp.status !== 'pending') {
    return jsonRes({ error: `Bulk import already ${imp.status}` }, 400);
  }

  const { data: integration } = await svc
    .from('recruitment_meta_integrations')
    .select('id, organization_id, page_access_token, page_id')
    .eq('id', imp.integration_id)
    .maybeSingle();
  if (!integration?.page_access_token) {
    await svc.from('recruitment_bulk_imports').update({
      status: 'failed', error_message: 'Integration missing page_access_token', completed_at: new Date().toISOString(),
    }).eq('id', bulkImportId);
    return jsonRes({ error: 'Integration missing page_access_token' }, 400);
  }

  // Mark running
  await svc.from('recruitment_bulk_imports').update({
    status: 'running', started_at: new Date().toISOString(),
  }).eq('id', bulkImportId);

  let totals = {
    imported: 0,
    duplicate: 0,
    unmapped: 0,
    failed: 0,
  };
  let scopeMissing = false;

  try {
    const sinceSec = Math.floor(new Date(imp.since_date).getTime() / 1000);
    const untilSec = Math.floor(new Date(imp.until_date).getTime() / 1000);

    for (const fmId of imp.form_mapping_ids as string[]) {
      const { data: fm } = await svc
        .from('recruitment_meta_form_mappings')
        .select('id, form_id, position_id, organization_id')
        .eq('id', fmId)
        .maybeSingle();
      if (!fm) continue;

      const { fieldMappings, customFields } = await loadIngestionContext(svc, fmId);

      // Decide target stage for this form
      const stageId: string | null = imp.imported_pipeline_stage_id ?? null;

      let next: string | null = `https://graph.facebook.com/v19.0/${encodeURIComponent(fm.form_id)}/leads?fields=id,created_time,field_data&limit=100&filtering=[{"field":"time_created","operator":"GREATER_THAN","value":${sinceSec}},{"field":"time_created","operator":"LESS_THAN","value":${untilSec}}]&access_token=${encodeURIComponent(integration.page_access_token!)}`;
      let pages = 0;

      while (next && pages < 100) {
        const res = await fetch(next);
        const j = await res.json();
        if (j.error) {
          const msg = String(j.error.message ?? 'Meta error');
          if (/pages_manage_ads|permission|scope/i.test(msg)) {
            scopeMissing = true;
          }
          throw new Error(msg);
        }

        for (const leadRow of (j.data ?? [])) {
          const metaLeadId = String(leadRow.id ?? '');
          if (!metaLeadId) continue;

          // Idempotency: have we processed this lead in any prior bulk import?
          const { data: priorLog } = await svc
            .from('recruitment_bulk_import_lead_log')
            .select('id, status, applicant_id')
            .eq('meta_lead_id', metaLeadId)
            .limit(1)
            .maybeSingle();

          let result;
          if (priorLog) {
            result = { status: 'duplicate' as const, applicantId: priorLog.applicant_id ?? undefined };
          } else {
            result = await ingestLead(
              svc,
              integration.organization_id,
              integration.id,
              fmId,
              fm.position_id,
              fieldMappings,
              customFields,
              {
                meta_lead_id: metaLeadId,
                form_id: fm.form_id,
                page_id: integration.page_id,
                created_time: leadRow.created_time ?? null,
                field_data: leadRow.field_data ?? [],
              },
              {
                importedVia: 'bulk_import',
                bulkImportId,
                approvalMode: imp.approval_mode,
                targetStageId: stageId,
              },
            );
          }

          // Log per-lead
          await svc.from('recruitment_bulk_import_lead_log').insert({
            bulk_import_id: bulkImportId,
            form_mapping_id: fmId,
            meta_lead_id: metaLeadId,
            status: result.status,
            applicant_id: result.applicantId ?? null,
            error_message: result.errorMessage ?? null,
          }).then(() => {}, () => {}); // ignore unique conflict (re-running same lead)

          totals[result.status]++;
        }

        // Persist counters every page so UI polling sees progress
        await svc.from('recruitment_bulk_imports').update({
          total_leads_imported: totals.imported,
          total_leads_skipped_duplicate: totals.duplicate,
          total_leads_skipped_unmapped: totals.unmapped,
          total_leads_failed: totals.failed,
        }).eq('id', bulkImportId);

        // Check cancellation
        const { data: cur } = await svc.from('recruitment_bulk_imports').select('status').eq('id', bulkImportId).maybeSingle();
        if (cur?.status === 'cancelled') {
          return jsonRes({ status: 'cancelled', totals });
        }

        next = j.paging?.next ?? null;
        pages++;
      }
    }

    await svc.from('recruitment_bulk_imports').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      total_leads_imported: totals.imported,
      total_leads_skipped_duplicate: totals.duplicate,
      total_leads_skipped_unmapped: totals.unmapped,
      total_leads_failed: totals.failed,
    }).eq('id', bulkImportId);

    return jsonRes({ status: 'completed', totals });
  } catch (err) {
    const msg = (err as Error).message;
    const friendly = scopeMissing
      ? 'Bulk import requires the pages_manage_ads scope which is currently not granted. Live webhook ingestion is unaffected.'
      : msg;
    await svc.from('recruitment_bulk_imports').update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: friendly,
      total_leads_imported: totals.imported,
      total_leads_skipped_duplicate: totals.duplicate,
      total_leads_skipped_unmapped: totals.unmapped,
      total_leads_failed: totals.failed,
    }).eq('id', bulkImportId);
    return jsonRes({ status: 'failed', error: friendly, scope_missing: scopeMissing, totals }, 200);
  }
});
