// Meta Lead Ads webhook handler — rewritten to use the
// recruitment_form_field_mappings pipeline (Phase B3).
//
// Always returns HTTP 200 to Meta — failures surfaced via ingestion log.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'node:crypto';
import { ingestLead, loadIngestionContext } from '../_shared/recruitment-ingest-lead.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Hub-Signature-256, x-hub-signature-256',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function svc() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ── GET: subscription verification ───────────────────────────
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode !== 'subscribe' || !token || !challenge) {
      return new Response('Bad Request', { status: 400, headers: corsHeaders });
    }
    try {
      const supabase = svc();
      const { data: integration } = await supabase
        .from('recruitment_meta_integrations')
        .select('id')
        .eq('verify_token', token)
        .maybeSingle();
      if (!integration) return new Response('Forbidden', { status: 403, headers: corsHeaders });
      return new Response(challenge, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    } catch (err) {
      console.error('GET verification error:', err);
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256');

    let body: any;
    try { body = JSON.parse(rawBody); } catch {
      console.warn('meta-lead-webhook: invalid JSON body');
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    const supabase = svc();
    const appSecret = Deno.env.get('META_APP_SECRET');

    for (const entry of body.entry ?? []) {
      const pageId = String(entry.id ?? '');
      if (!pageId) continue;

      const { data: integration, error: intErr } = await supabase
        .from('recruitment_meta_integrations')
        .select('*')
        .eq('page_id', pageId)
        .maybeSingle();
      if (intErr) { console.error('Integration lookup error:', intErr); continue; }
      if (!integration) { console.log('meta-lead-webhook: unknown page_id', pageId); continue; }

      // HMAC verification
      if (appSecret) {
        if (!signature) {
          await supabase.from('recruitment_lead_ingestion_log').insert({
            organization_id: integration.organization_id,
            source: 'meta_lead_ad',
            integration_id: integration.id,
            status: 'invalid',
            error_message: 'Missing x-hub-signature-256 header',
            raw_payload: body,
          });
          continue;
        }
        const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex');
        if (signature !== expected) {
          await supabase.from('recruitment_lead_ingestion_log').insert({
            organization_id: integration.organization_id,
            source: 'meta_lead_ad',
            integration_id: integration.id,
            status: 'invalid',
            error_message: 'HMAC signature mismatch',
            raw_payload: body,
          });
          continue;
        }
      }

      for (const change of entry.changes ?? []) {
        if (change.field !== 'leadgen') continue;
        const value = change.value ?? {};
        const leadgenId = String(value.leadgen_id ?? '');
        const formId = String(value.form_id ?? '');
        const createdTime = value.created_time ?? null;

        if (!leadgenId) {
          await supabase.from('recruitment_lead_ingestion_log').insert({
            organization_id: integration.organization_id,
            source: 'meta_lead_ad',
            integration_id: integration.id,
            status: 'invalid',
            error_message: 'Missing leadgen_id in change.value',
            raw_payload: value,
          });
          continue;
        }

        // Fetch full lead via Graph API
        let fieldData: Array<{ name: string; values?: string[] }> = [];
        try {
          if (!integration.page_access_token) throw new Error('No page_access_token configured');
          const graphRes = await fetch(
            `https://graph.facebook.com/v19.0/${encodeURIComponent(leadgenId)}?access_token=${encodeURIComponent(integration.page_access_token)}`,
          );
          const graphJson = await graphRes.json();
          if (graphJson.error) throw new Error(`Graph API: ${graphJson.error.message ?? 'unknown error'}`);
          fieldData = Array.isArray(graphJson.field_data) ? graphJson.field_data : [];
        } catch (err) {
          await supabase.from('recruitment_lead_ingestion_log').insert({
            organization_id: integration.organization_id,
            source: 'meta_lead_ad',
            external_id: leadgenId,
            integration_id: integration.id,
            status: 'failed',
            error_message: (err as Error).message,
            raw_payload: value,
          });
          continue;
        }

        // Resolve form mapping (gives org + position + form_mapping_id)
        const { data: formMapping } = await supabase
          .from('recruitment_meta_form_mappings')
          .select('id, position_id')
          .eq('integration_id', integration.id)
          .eq('form_id', formId)
          .eq('is_active', true)
          .maybeSingle();

        // No form mapping at all → ingest with empty mappings (falls back to standard names)
        let fieldMappings: any[] = [];
        let customFields = new Map<string, any>();
        let formMappingId = formMapping?.id ?? null;

        if (formMappingId) {
          const ctx = await loadIngestionContext(supabase, formMappingId);
          fieldMappings = ctx.fieldMappings;
          customFields = ctx.customFields;
        }

        // If we have no formMappingId we still want to create the applicant
        // using fallback heuristics in ingestLead. Pass a synthetic form_mapping_id
        // (the real DB row isn't required by ingestLead — only org/position).
        const result = await ingestLead(
          supabase,
          integration.organization_id,
          integration.id,
          formMappingId ?? '00000000-0000-0000-0000-000000000000',
          formMapping?.position_id ?? null,
          // Fallback path: when no field mappings, ingestLead returns 'unmapped'.
          // Provide a single synthetic mapping for full_name/email/phone fallback by
          // passing one wildcard mapping if mappings are empty.
          fieldMappings.length > 0 ? fieldMappings : [
            { id: '_fb1', form_mapping_id: formMappingId ?? '', meta_question_id: 'full_name', meta_question_text: 'Full name', target_kind: 'standard' as const, target_standard_field: 'full_name' as const, target_custom_field_id: null },
            { id: '_fb2', form_mapping_id: formMappingId ?? '', meta_question_id: 'email', meta_question_text: 'Email', target_kind: 'standard' as const, target_standard_field: 'email' as const, target_custom_field_id: null },
            { id: '_fb3', form_mapping_id: formMappingId ?? '', meta_question_id: 'phone_number', meta_question_text: 'Phone', target_kind: 'standard' as const, target_standard_field: 'phone_number' as const, target_custom_field_id: null },
          ],
          customFields,
          {
            meta_lead_id: leadgenId,
            form_id: formId,
            page_id: pageId,
            created_time: createdTime,
            field_data: fieldData,
          },
          { importedVia: 'webhook' },
        );

        // Map ingestion result → log status
        const logStatus =
          result.status === 'imported' ? 'success'
          : result.status === 'duplicate' ? 'duplicate'
          : result.status === 'unmapped' ? 'invalid'
          : 'failed';

        await supabase.from('recruitment_lead_ingestion_log').insert({
          organization_id: integration.organization_id,
          source: 'meta_lead_ad',
          external_id: leadgenId,
          integration_id: integration.id,
          status: logStatus,
          applicant_id: result.applicantId ?? null,
          error_message: result.errorMessage ?? null,
          raw_payload: value,
        });

        if (result.status === 'imported') {
          await supabase
            .from('recruitment_meta_integrations')
            .update({
              last_event_at: new Date().toISOString(),
              status: 'connected',
              status_message: null,
            })
            .eq('id', integration.id);
        }
      }
    }

    return new Response('OK', { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error('meta-lead-webhook fatal error:', err);
    return new Response('OK', { status: 200, headers: corsHeaders });
  }
});
