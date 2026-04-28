// Meta Lead Ads webhook handler
// Receives lead submissions from Facebook/Instagram Lead Ads,
// dedupes via applicants.external_id, creates applicant + optional
// application, logs every attempt to recruitment_lead_ingestion_log.
//
// Always returns HTTP 200 to Meta — failures are surfaced via the
// ingestion log, never via HTTP status (Meta retries aggressively).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'node:crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Hub-Signature-256, x-hub-signature-256',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function svc() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ─────────────────────────────────────────────────────────────
  // GET — Meta subscription verification handshake
  // ─────────────────────────────────────────────────────────────
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

      if (!integration) {
        return new Response('Forbidden', { status: 403, headers: corsHeaders });
      }

      return new Response(challenge, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    } catch (err) {
      console.error('GET verification error:', err);
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // POST — lead delivery
  // ─────────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  // Outer try/catch: last line of defense — never 500 to Meta.
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256');

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      console.warn('meta-lead-webhook: invalid JSON body');
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    const supabase = svc();
    const appSecret = Deno.env.get('META_APP_SECRET');

    for (const entry of body.entry ?? []) {
      const pageId = String(entry.id ?? '');
      if (!pageId) continue;

      // Find integration for this page
      const { data: integration, error: intErr } = await supabase
        .from('recruitment_meta_integrations')
        .select('*')
        .eq('page_id', pageId)
        .maybeSingle();

      if (intErr) {
        console.error('Integration lookup error:', intErr);
        continue;
      }
      if (!integration) {
        console.log('meta-lead-webhook: unknown page_id', pageId);
        continue;
      }

      // HMAC verification (only enforced if META_APP_SECRET is configured)
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
        const expected =
          'sha256=' +
          createHmac('sha256', appSecret).update(rawBody).digest('hex');
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

      // Process each leadgen change
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

        // ── Dedup check ─────────────────────────────────────────
        const { data: existing } = await supabase
          .from('applicants')
          .select('id')
          .eq('organization_id', integration.organization_id)
          .eq('external_id', leadgenId)
          .maybeSingle();

        if (existing) {
          await supabase.from('recruitment_lead_ingestion_log').insert({
            organization_id: integration.organization_id,
            source: 'meta_lead_ad',
            external_id: leadgenId,
            integration_id: integration.id,
            status: 'duplicate',
            applicant_id: existing.id,
            raw_payload: value,
          });
          continue;
        }

        // ── Fetch full lead data via Graph API ──────────────────
        let fieldData: Array<{ name: string; values?: string[] }> = [];
        try {
          if (!integration.page_access_token) {
            throw new Error('No page_access_token configured for integration');
          }
          const graphRes = await fetch(
            `https://graph.facebook.com/v19.0/${encodeURIComponent(leadgenId)}?access_token=${encodeURIComponent(integration.page_access_token)}`,
          );
          const graphJson = await graphRes.json();
          if (graphJson.error) {
            throw new Error(`Graph API: ${graphJson.error.message ?? 'unknown error'}`);
          }
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

        // ── Extract standard fields ─────────────────────────────
        const fieldMap = new Map<string, string>();
        for (const f of fieldData) {
          fieldMap.set(f.name, f.values?.[0] ?? '');
        }
        const fullName = (fieldMap.get('full_name') ?? fieldMap.get('name') ?? '').trim();
        const email = (fieldMap.get('email') ?? fieldMap.get('email_address') ?? '').trim();
        const phone = (fieldMap.get('phone_number') ?? fieldMap.get('phone') ?? '').trim() || null;

        if (!fullName && !email) {
          await supabase.from('recruitment_lead_ingestion_log').insert({
            organization_id: integration.organization_id,
            source: 'meta_lead_ad',
            external_id: leadgenId,
            integration_id: integration.id,
            status: 'invalid',
            error_message: 'No name or email in lead data',
            raw_payload: { change: value, fieldData },
          });
          continue;
        }

        const nameParts = fullName.split(/\s+/).filter(Boolean);
        const firstName = nameParts[0] ?? 'Ukjent';
        const lastName = nameParts.slice(1).join(' ') || '—';

        // ── Look up form mapping for routing ────────────────────
        const { data: mapping } = await supabase
          .from('recruitment_meta_form_mappings')
          .select('position_id')
          .eq('integration_id', integration.id)
          .eq('form_id', formId)
          .eq('is_active', true)
          .maybeSingle();

        // ── Create applicant ────────────────────────────────────
        const { data: newApplicant, error: applicantErr } = await supabase
          .from('applicants')
          .insert({
            organization_id: integration.organization_id,
            first_name: firstName,
            last_name: lastName,
            email: email || `unknown-${leadgenId}@no-email.local`,
            phone,
            source: 'meta_lead_ad',
            external_id: leadgenId,
            source_details: {
              field_data: fieldData,
              form_id: formId,
              page_id: pageId,
              created_time: createdTime,
            },
            gdpr_consent: true,
            gdpr_consent_at: new Date().toISOString(),
            // language_norwegian, work_permit_status, drivers_license_classes,
            // certifications: rely on column defaults — operator can edit later.
          })
          .select('id')
          .single();

        if (applicantErr || !newApplicant) {
          const isUnique = (applicantErr as any)?.code === '23505';
          await supabase.from('recruitment_lead_ingestion_log').insert({
            organization_id: integration.organization_id,
            source: 'meta_lead_ad',
            external_id: leadgenId,
            integration_id: integration.id,
            status: isUnique ? 'duplicate' : 'failed',
            error_message: applicantErr?.message ?? 'Insert failed',
            raw_payload: { change: value, fieldData },
          });
          continue;
        }

        // ── Create application if position mapped (best-effort) ─
        if (mapping?.position_id) {
          const { error: appErr } = await supabase.from('applications').insert({
            organization_id: integration.organization_id,
            applicant_id: newApplicant.id,
            position_id: mapping.position_id,
            current_stage_id: 'not_reviewed',
            applied_at: new Date().toISOString(),
          });
          if (appErr) {
            console.error('Application insert failed:', appErr);
            // Continue — applicant was created, log success below with note.
          }
        }

        // ── Success log ─────────────────────────────────────────
        await supabase.from('recruitment_lead_ingestion_log').insert({
          organization_id: integration.organization_id,
          source: 'meta_lead_ad',
          external_id: leadgenId,
          integration_id: integration.id,
          status: 'success',
          applicant_id: newApplicant.id,
          raw_payload: value,
        });

        // ── Update integration last_event_at + status ───────────
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

    return new Response('OK', { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error('meta-lead-webhook fatal error:', err);
    // Always 200 to Meta — never trigger retry storm
    return new Response('OK', { status: 200, headers: corsHeaders });
  }
});
