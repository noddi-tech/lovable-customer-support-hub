// Bulk applicant action — supports 8 actions on selected applicants.
// Actions: move_stage, assign, reject, hire, send_email, add_tags,
// remove_tags, delete (admin), export_csv.

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

interface BulkBody {
  organization_id: string;
  applicant_ids: string[];
  action: string;
  payload?: Record<string, any>;
}

interface PerResult {
  applicant_id: string;
  ok: boolean;
  message?: string;
  skipped_reason?: string;
}

const VALID_ACTIONS = new Set([
  'move_stage','assign','reject','hire','send_email','add_tags','remove_tags','delete','export_csv',
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function csvEscape(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function substituteTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => vars[k] ?? '');
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonRes({ error: 'Method not allowed' }, 405);

  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return jsonRes({ error: 'Unauthorized' }, 401);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

  const token = auth.replace('Bearer ', '');
  const { data: claimsData } = await userClient.auth.getClaims(token);
  if (!claimsData?.claims) return jsonRes({ error: 'Unauthorized' }, 401);
  const userId = claimsData.claims.sub as string;

  let body: BulkBody;
  try { body = (await req.json()) as BulkBody; } catch { return jsonRes({ error: 'Invalid JSON' }, 400); }

  // ---- Validation ----
  if (!body || typeof body !== 'object') return jsonRes({ error: 'Invalid body' }, 400);
  if (!UUID_RE.test(body.organization_id || '')) return jsonRes({ error: 'organization_id invalid' }, 400);
  if (!Array.isArray(body.applicant_ids) || body.applicant_ids.length === 0) {
    return jsonRes({ error: 'applicant_ids required' }, 400);
  }
  if (body.applicant_ids.length > 500) {
    return jsonRes({ error: 'Maks 500 søkere per operasjon. Velg færre.' }, 400);
  }
  for (const id of body.applicant_ids) {
    if (!UUID_RE.test(id)) return jsonRes({ error: `Ugyldig søker-ID: ${id}` }, 400);
  }
  if (!VALID_ACTIONS.has(body.action)) return jsonRes({ error: `Ukjent handling: ${body.action}` }, 400);

  const orgId = body.organization_id;
  const action = body.action;
  const payload = body.payload ?? {};

  // ---- Caller membership check ----
  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', userId)
    .eq('organization_id', orgId)
    .maybeSingle();
  if (!callerProfile) return jsonRes({ error: 'Du er ikke medlem av denne organisasjonen' }, 403);
  const actorProfileId = callerProfile.id as string;

  // Role check
  const { data: roleRows } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);
  const roles = new Set((roleRows ?? []).map((r: any) => r.role));
  const isAdmin = roles.has('admin') || roles.has('super_admin');

  if (action === 'delete' && !isAdmin) {
    return jsonRes({ error: 'Kun administratorer kan slette søkere' }, 403);
  }

  // ---- Validate org ownership of all applicants ----
  const { data: ownedRows, error: ownedErr } = await adminClient
    .from('applicants')
    .select('id, first_name, last_name, email, phone, source, gdpr_consent, created_at')
    .in('id', body.applicant_ids)
    .eq('organization_id', orgId);
  if (ownedErr) return jsonRes({ error: ownedErr.message }, 500);

  const ownedMap = new Map<string, any>((ownedRows ?? []).map((r: any) => [r.id, r]));
  const validIds = body.applicant_ids.filter((id) => ownedMap.has(id));
  const invalidIds = body.applicant_ids.filter((id) => !ownedMap.has(id));

  const results: PerResult[] = invalidIds.map((id) => ({
    applicant_id: id,
    ok: false,
    message: 'Søker tilhører ikke organisasjonen',
  }));

  // ---- Audit helper ----
  async function audit(applicantId: string, eventType: string, newVals: any) {
    await adminClient.from('recruitment_audit_events').insert({
      organization_id: orgId,
      event_type: eventType,
      event_category: 'applicant',
      subject_table: 'applicants',
      subject_id: applicantId,
      applicant_id: applicantId,
      actor_profile_id: actorProfileId,
      new_values: newVals ?? null,
    });
  }

  // ---- Pipeline lookup for terminal stages ----
  async function getDefaultPipeline() {
    const { data } = await adminClient
      .from('recruitment_pipelines')
      .select('id, stages')
      .eq('organization_id', orgId)
      .eq('is_default', true)
      .maybeSingle();
    return data;
  }

  // ============================================================
  // Action handlers
  // ============================================================

  if (action === 'export_csv') {
    // Fetch extra context (latest application + position + tags)
    const { data: apps } = await adminClient
      .from('applications')
      .select('applicant_id, current_stage_id, score, applied_at, position_id, job_positions(title)')
      .in('applicant_id', validIds);
    const appsByApplicant = new Map<string, any>();
    for (const a of (apps ?? []) as any[]) {
      const existing = appsByApplicant.get(a.applicant_id);
      if (!existing || (a.applied_at ?? '') > (existing.applied_at ?? '')) {
        appsByApplicant.set(a.applicant_id, a);
      }
    }

    const { data: tagLinks } = await adminClient
      .from('recruitment_applicant_tags')
      .select('applicant_id, recruitment_tags(name)')
      .in('applicant_id', validIds);
    const tagsByApplicant = new Map<string, string[]>();
    for (const t of (tagLinks ?? []) as any[]) {
      const arr = tagsByApplicant.get(t.applicant_id) ?? [];
      const name = t.recruitment_tags?.name;
      if (name) arr.push(name);
      tagsByApplicant.set(t.applicant_id, arr);
    }

    const { data: org } = await adminClient
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .maybeSingle();
    const orgSlug = (org?.name ?? 'org').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'org';
    const today = new Date().toISOString().slice(0, 10);
    const filename = `soekere-${orgSlug}-${today}.csv`;

    // Norwegian-friendly: UTF-8 BOM + semicolon separator (Excel NO default)
    const SEP = ';';
    const headers = ['ID', 'Fornavn', 'Etternavn', 'E-post', 'Telefon', 'Kilde', 'Stilling', 'Steg', 'Poeng', 'Søkt dato', 'Opprettet', 'Etiketter'];
    const rows = validIds.map((id) => {
      const a = ownedMap.get(id);
      const app = appsByApplicant.get(id);
      const tags = (tagsByApplicant.get(id) ?? []).join(', ');
      return [
        a.id,
        a.first_name,
        a.last_name,
        a.email,
        a.phone ?? '',
        a.source,
        app?.job_positions?.title ?? '',
        app?.current_stage_id ?? '',
        app?.score ?? '',
        app?.applied_at ? new Date(app.applied_at).toISOString().slice(0, 10) : '',
        new Date(a.created_at).toISOString().slice(0, 10),
        tags,
      ].map(csvEscape).join(SEP);
    });
    const csv = '\uFEFF' + [headers.join(SEP), ...rows].join('\r\n');
    const csvBytes = new TextEncoder().encode(csv);
    let bin = '';
    for (let i = 0; i < csvBytes.length; i++) bin += String.fromCharCode(csvBytes[i]);
    const csv_base64 = btoa(bin);

    for (const id of validIds) results.push({ applicant_id: id, ok: true });
    return jsonRes({
      processed: body.applicant_ids.length,
      succeeded: validIds.length,
      failed: invalidIds.length,
      errors: results.filter((r) => !r.ok).map((r) => ({ applicant_id: r.applicant_id, message: r.message! })),
      download: { filename, csv_base64 },
    });
  }

  if (action === 'move_stage' || action === 'reject' || action === 'hire') {
    let targetStageId = payload.stage_id as string | undefined;
    if (action === 'reject' || action === 'hire') {
      // Find terminal stage from default pipeline
      const pipeline = await getDefaultPipeline();
      const stages = (pipeline?.stages as any[]) ?? [];
      const terminalId = action === 'reject' ? 'disqualified' : 'hired';
      const stage = stages.find((s: any) => s.id === terminalId);
      targetStageId = stage?.id ?? terminalId;
    }
    if (!targetStageId) return jsonRes({ error: 'stage_id påkrevd' }, 400);

    for (const id of validIds) {
      try {
        const updateBody: any = { current_stage_id: targetStageId };
        if (action === 'reject' && payload.reason) {
          updateBody.rejection_reason = String(payload.reason).slice(0, 1000);
        }
        const { error } = await adminClient
          .from('applications')
          .update(updateBody)
          .eq('applicant_id', id);
        if (error) throw error;
        const evtType = action === 'reject' ? 'rejected' : action === 'hire' ? 'hired' : 'stage_changed';
        await audit(id, evtType, {
          stage_id: targetStageId,
          ...(payload.reason ? { reason: String(payload.reason).slice(0, 1000) } : {}),
        });
        results.push({ applicant_id: id, ok: true });
      } catch (e: any) {
        results.push({ applicant_id: id, ok: false, message: e.message });
      }
    }
  }

  if (action === 'assign') {
    const assigneeId = (payload.assignee_id ?? null) as string | null;
    if (assigneeId !== null && !UUID_RE.test(assigneeId)) {
      return jsonRes({ error: 'assignee_id ugyldig' }, 400);
    }
    if (assigneeId) {
      const { data: assigneeProfile } = await adminClient
        .from('profiles')
        .select('id')
        .eq('id', assigneeId)
        .eq('organization_id', orgId)
        .maybeSingle();
      if (!assigneeProfile) return jsonRes({ error: 'Tildelt person ikke i organisasjonen' }, 400);
    }
    for (const id of validIds) {
      try {
        const { error } = await adminClient
          .from('applications')
          .update({ assigned_to: assigneeId })
          .eq('applicant_id', id);
        if (error) throw error;
        await audit(id, 'assigned', { assignee_id: assigneeId });
        results.push({ applicant_id: id, ok: true });
      } catch (e: any) {
        results.push({ applicant_id: id, ok: false, message: e.message });
      }
    }
  }

  if (action === 'add_tags' || action === 'remove_tags') {
    const tagIds = (payload.tag_ids ?? []) as string[];
    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      return jsonRes({ error: 'tag_ids påkrevd' }, 400);
    }
    for (const t of tagIds) if (!UUID_RE.test(t)) return jsonRes({ error: `Ugyldig tag: ${t}` }, 400);

    // Validate tags belong to org
    const { data: validTags } = await adminClient
      .from('recruitment_tags')
      .select('id')
      .in('id', tagIds)
      .eq('organization_id', orgId);
    const validTagIds = new Set((validTags ?? []).map((t: any) => t.id));
    if (validTagIds.size === 0) return jsonRes({ error: 'Ingen gyldige etiketter' }, 400);

    for (const id of validIds) {
      try {
        if (action === 'add_tags') {
          const rows = [...validTagIds].map((tag_id) => ({
            applicant_id: id,
            tag_id,
            organization_id: orgId,
            added_by: actorProfileId,
          }));
          const { error } = await adminClient
            .from('recruitment_applicant_tags')
            .upsert(rows, { onConflict: 'applicant_id,tag_id', ignoreDuplicates: true });
          if (error) throw error;
        } else {
          const { error } = await adminClient
            .from('recruitment_applicant_tags')
            .delete()
            .eq('applicant_id', id)
            .in('tag_id', [...validTagIds]);
          if (error) throw error;
        }
        results.push({ applicant_id: id, ok: true });
      } catch (e: any) {
        results.push({ applicant_id: id, ok: false, message: e.message });
      }
    }
  }

  let skipped = 0;
  const skippedReasons: { applicant_id: string; reason: string }[] = [];

  if (action === 'send_email') {
    const templateId = payload.template_id as string | undefined;
    if (!templateId || !UUID_RE.test(templateId)) {
      return jsonRes({ error: 'template_id påkrevd' }, 400);
    }
    const { data: tpl } = await adminClient
      .from('recruitment_email_templates')
      .select('id, subject, body, name')
      .eq('id', templateId)
      .eq('organization_id', orgId)
      .maybeSingle();
    if (!tpl) return jsonRes({ error: 'Mal ikke funnet' }, 404);

    const { data: org } = await adminClient
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .maybeSingle();
    const orgName = org?.name ?? '';

    for (const id of validIds) {
      const a = ownedMap.get(id);
      // Skip applicants without GDPR consent
      if (a.gdpr_consent === false) {
        skipped++;
        skippedReasons.push({ applicant_id: id, reason: 'no_consent' });
        results.push({ applicant_id: id, ok: false, skipped_reason: 'no_consent', message: 'Mangler samtykke' });
        continue;
      }
      try {
        const vars = {
          first_name: a.first_name ?? '',
          last_name: a.last_name ?? '',
          full_name: `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim(),
          email: a.email ?? '',
          organization_name: orgName,
        };
        const subject = substituteTemplate(tpl.subject ?? '', vars);
        const html = substituteTemplate(tpl.body ?? '', vars);

        const { error: sendErr } = await adminClient.functions.invoke('send-email', {
          body: {
            to: a.email,
            subject,
            html,
            from_name: orgName || 'Rekruttering',
          },
        });
        if (sendErr) throw new Error(sendErr.message || 'send-email feilet');
        await audit(id, 'email_sent', { template_id: templateId, template_name: tpl.name, subject });
        results.push({ applicant_id: id, ok: true });
      } catch (e: any) {
        results.push({ applicant_id: id, ok: false, message: e.message });
      }
      // Defensive rate limit: 200ms between sends
      await sleep(200);
    }
  }

  if (action === 'delete') {
    for (const id of validIds) {
      try {
        // Audit BEFORE delete (cascade will remove applicant)
        await audit(id, 'applicant_deleted', {
          email: ownedMap.get(id)?.email,
          first_name: ownedMap.get(id)?.first_name,
          last_name: ownedMap.get(id)?.last_name,
        });
        const { error } = await adminClient
          .from('applicants')
          .delete()
          .eq('id', id)
          .eq('organization_id', orgId);
        if (error) throw error;
        results.push({ applicant_id: id, ok: true });
      } catch (e: any) {
        results.push({ applicant_id: id, ok: false, message: e.message });
      }
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok && !r.skipped_reason).length;

  return jsonRes({
    processed: body.applicant_ids.length,
    succeeded,
    failed,
    skipped,
    skipped_reasons: skippedReasons,
    errors: results
      .filter((r) => !r.ok && !r.skipped_reason)
      .map((r) => ({ applicant_id: r.applicant_id, message: r.message ?? 'feilet' })),
  });
});
