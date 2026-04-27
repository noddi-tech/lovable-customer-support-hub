import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';

interface ExportBody {
  applicant_id?: string;
  date_range?: { from?: string; to?: string };
  format: 'csv' | 'json';
  include?: {
    applicant_data?: boolean;
    applications?: boolean;
    notes?: boolean;
    files?: boolean;
    automation_events?: boolean;
    ingestion_events?: boolean;
  };
}

interface UnifiedEvent {
  occurred_at: string;
  source: 'audit' | 'automation' | 'ingestion';
  event_type: string;
  actor: string | null;
  applicant_id: string | null;
  description: string;
  details: Record<string, unknown>;
}

const csvEscape = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const toCsv = (events: UnifiedEvent[]): string => {
  const header = ['timestamp', 'source', 'event_type', 'actor', 'applicant_id', 'description', 'details'];
  const lines = [header.join(',')];
  for (const e of events) {
    lines.push([
      e.occurred_at,
      e.source,
      e.event_type,
      e.actor ?? '',
      e.applicant_id ?? '',
      e.description,
      JSON.stringify(e.details),
    ].map(csvEscape).join(','));
  }
  return lines.join('\n');
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // User-context client (for auth + RPC under user identity)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service client (for cross-table reads scoped manually by org)
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve org + admin role
    const { data: profile } = await adminClient
      .from('profiles')
      .select('id, organization_id')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (!profile?.organization_id) {
      return new Response(JSON.stringify({ error: 'No organization' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: membership } = await adminClient
      .from('organization_memberships')
      .select('role, status')
      .eq('user_id', userData.user.id)
      .eq('organization_id', profile.organization_id)
      .eq('status', 'active')
      .maybeSingle();

    if (!membership || !['admin', 'super_admin'].includes(membership.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: ExportBody = await req.json();
    if (!body.format || !['csv', 'json'].includes(body.format)) {
      return new Response(JSON.stringify({ error: 'Invalid format' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const orgId = profile.organization_id;
    const include = body.include ?? {
      applicant_data: true, applications: true, notes: true, files: true,
      automation_events: true, ingestion_events: true,
    };
    const fromTs = body.date_range?.from;
    const toTs = body.date_range?.to;

    // Build queries
    const auditQ = adminClient
      .from('recruitment_audit_events')
      .select('*')
      .eq('organization_id', orgId)
      .order('occurred_at', { ascending: false })
      .limit(10000);
    if (body.applicant_id) auditQ.eq('applicant_id', body.applicant_id);
    if (fromTs) auditQ.gte('occurred_at', fromTs);
    if (toTs) auditQ.lte('occurred_at', toTs);

    const automationQ = include.automation_events
      ? adminClient
          .from('recruitment_automation_executions')
          .select('*')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
          .limit(10000)
      : null;
    if (automationQ && body.applicant_id) automationQ.eq('applicant_id', body.applicant_id);
    if (automationQ && fromTs) automationQ.gte('created_at', fromTs);
    if (automationQ && toTs) automationQ.lte('created_at', toTs);

    const ingestionQ = include.ingestion_events
      ? adminClient
          .from('recruitment_lead_ingestion_log')
          .select('*')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
          .limit(10000)
      : null;
    if (ingestionQ && body.applicant_id) ingestionQ.eq('applicant_id', body.applicant_id);
    if (ingestionQ && fromTs) ingestionQ.gte('created_at', fromTs);
    if (ingestionQ && toTs) ingestionQ.lte('created_at', toTs);

    const [auditR, autoR, ingR] = await Promise.all([
      auditQ,
      automationQ ?? Promise.resolve({ data: [], error: null }),
      ingestionQ ?? Promise.resolve({ data: [], error: null }),
    ]);

    if (auditR.error) throw auditR.error;

    const events: UnifiedEvent[] = [];

    for (const r of auditR.data ?? []) {
      events.push({
        occurred_at: r.occurred_at,
        source: 'audit',
        event_type: r.event_type,
        actor: r.actor_profile_id,
        applicant_id: r.applicant_id,
        description: `${r.event_category}: ${r.subject_table}`,
        details: { old: r.old_values, new: r.new_values, context: r.context },
      });
    }
    for (const r of (autoR.data ?? []) as any[]) {
      events.push({
        occurred_at: r.created_at,
        source: 'automation',
        event_type: r.rule_name ?? 'automation_executed',
        actor: r.triggered_by,
        applicant_id: r.applicant_id,
        description: `${r.overall_status} (${r.duration_ms ?? 0}ms)`,
        details: { rule_id: r.rule_id, results: r.action_results, context: r.trigger_context },
      });
    }
    for (const r of (ingR.data ?? []) as any[]) {
      events.push({
        occurred_at: r.created_at,
        source: 'ingestion',
        event_type: `ingestion_${r.status}`,
        actor: null,
        applicant_id: r.applicant_id,
        description: `${r.source}${r.error_message ? ': ' + r.error_message : ''}`,
        details: { external_id: r.external_id, payload: r.raw_payload },
      });
    }

    events.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));

    // DSAR snapshot
    let snapshot: Record<string, unknown> | undefined;
    if (body.applicant_id) {
      const [appR, appsR, notesR, filesR] = await Promise.all([
        include.applicant_data
          ? adminClient.from('applicants').select('*').eq('id', body.applicant_id).eq('organization_id', orgId).maybeSingle()
          : Promise.resolve({ data: null }),
        include.applications
          ? adminClient.from('applications').select('*').eq('applicant_id', body.applicant_id).eq('organization_id', orgId)
          : Promise.resolve({ data: [] }),
        include.notes
          ? adminClient.from('applicant_notes').select('*').eq('applicant_id', body.applicant_id).eq('organization_id', orgId)
          : Promise.resolve({ data: [] }),
        include.files
          ? adminClient.from('applicant_files').select('id, file_name, file_type, file_size, created_at, uploaded_by').eq('applicant_id', body.applicant_id).eq('organization_id', orgId)
          : Promise.resolve({ data: [] }),
      ]);
      snapshot = {
        applicant: appR.data,
        applications: appsR.data,
        notes: notesR.data,
        files: filesR.data,
      };
    }

    // Log the export event under the user's identity
    const exportEventType = body.applicant_id ? 'applicant_exported' : 'applicants_bulk_exported';
    await userClient.rpc('log_audit_export', {
      p_event_type: exportEventType,
      p_applicant_id: body.applicant_id ?? null,
      p_context: {
        format: body.format,
        count: events.length,
        date_range: body.date_range ?? null,
        include,
      },
    });

    const stamp = new Date().toISOString().slice(0, 10);
    const scope = body.applicant_id ? `applicant-${body.applicant_id.slice(0, 8)}` : 'all';
    const filename = `recruitment-audit-${scope}-${stamp}.${body.format}`;

    if (body.format === 'json') {
      return new Response(JSON.stringify({ snapshot, events }, null, 2), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return new Response(toCsv(events), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('audit-export error', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
