// Recruitment Oversikt — aggregated metrics endpoint.
// POST { organization_id, position_id?, time_window: '7d'|'30d'|'90d'|'all',
//        assignment_scope: 'mine'|'unassigned'|'all', user_id? }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface Stage {
  id: string;
  name: string;
  color: string;
  order: number;
  is_system?: boolean;
  sla_hours?: number | null;
  sla_enabled?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  });
  const token = auth.replace('Bearer ', '');
  const { data: claims } = await userClient.auth.getClaims(token);
  if (!claims?.claims) return json({ error: 'Unauthorized' }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const orgId = body?.organization_id as string | undefined;
  const positionId = (body?.position_id ?? null) as string | null;
  const timeWindow = (body?.time_window ?? '30d') as '7d' | '30d' | '90d' | 'all';
  const scope = (body?.assignment_scope ?? 'all') as 'mine' | 'unassigned' | 'all';
  const userId = body?.user_id as string | undefined;
  if (!orgId) return json({ error: 'organization_id required' }, 400);

  // Resolve current user's profile
  const { data: profile } = await userClient
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', claims.claims.sub)
    .eq('organization_id', orgId)
    .maybeSingle();
  if (!profile) return json({ error: 'Forbidden' }, 403);

  const myProfileId = profile.id as string;
  const sb = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Time window cutoff
  const now = new Date();
  let sinceIso: string | null = null;
  if (timeWindow !== 'all') {
    const days = timeWindow === '7d' ? 7 : timeWindow === '30d' ? 30 : 90;
    sinceIso = new Date(now.getTime() - days * 86400_000).toISOString();
  }

  // Pipeline (default for org for stage SLA + naming)
  const { data: pipelines } = await sb
    .from('recruitment_pipelines')
    .select('id, name, stages, is_default')
    .eq('organization_id', orgId)
    .order('is_default', { ascending: false });
  const pipeline = pipelines?.[0];
  const stages: Stage[] = (pipeline?.stages as any) ?? [];
  const stagesById = new Map(stages.map((s) => [s.id, s]));

  // Active applications (exclude terminal hired/disqualified/withdrawn for "active" sets)
  let appsQ = sb
    .from('applications')
    .select('id, applicant_id, position_id, current_stage_id, assigned_to, score, entered_stage_at, assigned_at, applied_at, updated_at')
    .eq('organization_id', orgId);
  if (positionId) appsQ = appsQ.eq('position_id', positionId);
  const { data: apps } = await appsQ;
  const allApps = apps ?? [];

  const isTerminal = (stageId: string) => {
    const s = stagesById.get(stageId);
    return s?.is_system && (s.id === 'hired' || s.id === 'disqualified' || s.id === 'withdrawn');
  };
  const activeApps = allApps.filter((a) => !isTerminal(a.current_stage_id));

  // Applicant lookup for names
  const applicantIds = Array.from(new Set(activeApps.map((a) => a.applicant_id)));
  const { data: applicants } = applicantIds.length
    ? await sb.from('applicants').select('id, first_name, last_name, email').in('id', applicantIds)
    : { data: [] as any[] };
  const applicantById = new Map((applicants ?? []).map((x: any) => [x.id, x]));

  // Position lookup — applications.position_id may not always link to a positions table
  // Skip for now; show stage badge instead.

  // Profile lookup for assignees
  const assigneeIds = Array.from(new Set(allApps.map((a) => a.assigned_to).filter(Boolean) as string[]));
  const { data: profiles } = assigneeIds.length
    ? await sb.from('profiles').select('id, full_name, email').in('id', assigneeIds)
    : { data: [] as any[] };
  const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  // Apply assignment scope filter
  const scopedApps = activeApps.filter((a) => {
    if (scope === 'mine') return a.assigned_to === myProfileId;
    if (scope === 'unassigned') return !a.assigned_to;
    return true;
  });

  // 1. Stage stalled
  const nowMs = now.getTime();
  const stage_stalled = scopedApps
    .map((a) => {
      const s = stagesById.get(a.current_stage_id);
      if (!s || !s.sla_enabled || !s.sla_hours) return null;
      const enteredMs = a.entered_stage_at ? new Date(a.entered_stage_at).getTime() : nowMs;
      const hoursIn = (nowMs - enteredMs) / 3_600_000;
      const overBy = hoursIn - s.sla_hours;
      if (overBy <= 0) return null;
      const ap = applicantById.get(a.applicant_id);
      return {
        application_id: a.id,
        applicant_id: a.applicant_id,
        applicant_name: ap ? `${ap.first_name ?? ''} ${ap.last_name ?? ''}`.trim() || ap.email : '—',
        stage_id: s.id,
        stage_name: s.name,
        stage_color: s.color,
        sla_hours: s.sla_hours,
        hours_over_sla: Math.round(overBy),
        entered_stage_at: a.entered_stage_at,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.hours_over_sla - a.hours_over_sla);

  // 2. Assigned no activity (>3 days since last event)
  const assignedActiveApps = scopedApps.filter((a) => a.assigned_to);
  const { data: recentEvents } = assignedActiveApps.length
    ? await sb
        .from('recruitment_audit_events')
        .select('subject_id, occurred_at, event_type')
        .eq('organization_id', orgId)
        .eq('subject_table', 'applications')
        .in('subject_id', assignedActiveApps.map((a) => a.id))
        .order('occurred_at', { ascending: false })
    : { data: [] as any[] };
  const lastEventByApp = new Map<string, string>();
  for (const e of (recentEvents ?? [])) {
    if (!lastEventByApp.has(e.subject_id)) lastEventByApp.set(e.subject_id, e.occurred_at);
  }
  const assigned_no_activity = assignedActiveApps
    .map((a) => {
      const lastIso = lastEventByApp.get(a.id) ?? a.assigned_at ?? a.applied_at ?? a.updated_at;
      const lastMs = new Date(lastIso).getTime();
      const daysSince = Math.floor((nowMs - lastMs) / 86400_000);
      if (daysSince < 3) return null;
      const ap = applicantById.get(a.applicant_id);
      const assignee = a.assigned_to ? profileById.get(a.assigned_to) : null;
      return {
        application_id: a.id,
        applicant_id: a.applicant_id,
        applicant_name: ap ? `${ap.first_name ?? ''} ${ap.last_name ?? ''}`.trim() || ap.email : '—',
        stage_id: a.current_stage_id,
        stage_name: stagesById.get(a.current_stage_id)?.name ?? a.current_stage_id,
        days_since_last_event: daysSince,
        assigned_to_name: assignee?.full_name ?? assignee?.email ?? null,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.days_since_last_event - a.days_since_last_event);

  // 3. Follow-ups
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

  let fuQ = sb
    .from('recruitment_followups')
    .select('id, applicant_id, application_id, scheduled_for, snoozed_to, note, assigned_to')
    .eq('organization_id', orgId)
    .is('completed_at', null);
  if (scope === 'mine') fuQ = fuQ.eq('assigned_to', myProfileId);
  if (scope === 'unassigned') fuQ = fuQ.is('assigned_to', null);
  const { data: followups } = await fuQ;

  const fuApplicantIds = Array.from(new Set((followups ?? []).map((f: any) => f.applicant_id)));
  const { data: fuApplicants } = fuApplicantIds.length
    ? await sb.from('applicants').select('id, first_name, last_name, email').in('id', fuApplicantIds)
    : { data: [] as any[] };
  const fuApBy = new Map((fuApplicants ?? []).map((x: any) => [x.id, x]));
  const fuAssigneeIds = Array.from(new Set((followups ?? []).map((f: any) => f.assigned_to).filter(Boolean)));
  const { data: fuAssignees } = fuAssigneeIds.length
    ? await sb.from('profiles').select('id, full_name, email').in('id', fuAssigneeIds)
    : { data: [] as any[] };
  const fuAssBy = new Map((fuAssignees ?? []).map((p: any) => [p.id, p]));

  const overdue_followups: any[] = [];
  const todays_followups: any[] = [];
  for (const f of (followups ?? []) as any[]) {
    const effective = f.snoozed_to ?? f.scheduled_for;
    const eMs = new Date(effective).getTime();
    const ap = fuApBy.get(f.applicant_id);
    const ass = f.assigned_to ? fuAssBy.get(f.assigned_to) : null;
    const item = {
      followup_id: f.id,
      applicant_id: f.applicant_id,
      application_id: f.application_id,
      applicant_name: ap ? `${ap.first_name ?? ''} ${ap.last_name ?? ''}`.trim() || ap.email : '—',
      scheduled_for: effective,
      note: f.note,
      assigned_to_user_name: ass?.full_name ?? ass?.email ?? null,
      days_overdue: Math.max(0, Math.floor((nowMs - eMs) / 86400_000)),
    };
    if (eMs < todayStart.getTime()) overdue_followups.push(item);
    else if (eMs <= todayEnd.getTime()) todays_followups.push(item);
  }
  overdue_followups.sort((a, b) => b.days_overdue - a.days_overdue);
  todays_followups.sort((a, b) => +new Date(a.scheduled_for) - +new Date(b.scheduled_for));

  // 4. Pipeline summary
  const stageCounts = new Map<string, number>();
  for (const a of activeApps) stageCounts.set(a.current_stage_id, (stageCounts.get(a.current_stage_id) ?? 0) + 1);
  const pipeline_summary = {
    stages: stages
      .filter((s) => !isTerminal(s.id))
      .map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        count: stageCounts.get(s.id) ?? 0,
      })),
    total_active_applicants: activeApps.length,
  };

  // 5. Metrics over time window
  const sinceMs = sinceIso ? new Date(sinceIso).getTime() : 0;

  const inWindow = (iso: string | null | undefined) => !iso || !sinceMs || new Date(iso).getTime() >= sinceMs;

  const { data: applicantsInWindow } = await sb
    .from('applicants')
    .select('id, source, created_at')
    .eq('organization_id', orgId);
  const inWindowApplicants = (applicantsInWindow ?? []).filter((a: any) => inWindow(a.created_at));

  const sourceBreakdown = new Map<string, number>();
  for (const a of inWindowApplicants) {
    const src = a.source ?? 'unknown';
    sourceBreakdown.set(src, (sourceBreakdown.get(src) ?? 0) + 1);
  }

  const hiredApps = allApps.filter((a) => a.current_stage_id === 'hired' && inWindow(a.updated_at));
  const rejectedApps = allApps.filter((a) => a.current_stage_id === 'disqualified' && inWindow(a.updated_at));

  // average days to hire
  let avgDays: number | null = null;
  if (hiredApps.length > 0) {
    const totalDays = hiredApps.reduce((sum, a) => {
      const start = new Date(a.applied_at ?? a.entered_stage_at ?? a.updated_at).getTime();
      const end = new Date(a.updated_at).getTime();
      return sum + (end - start) / 86400_000;
    }, 0);
    avgDays = Math.round((totalDays / hiredApps.length) * 10) / 10;
  }

  const totalDecided = hiredApps.length + rejectedApps.length;
  const conversion = totalDecided > 0 ? Math.round((hiredApps.length / totalDecided) * 100) : null;

  return json({
    needs_attention: {
      stage_stalled,
      assigned_no_activity,
      overdue_followups,
      todays_followups,
    },
    pipeline_summary,
    metrics: {
      new_applicants_count: inWindowApplicants.length,
      new_applicants_by_source: Array.from(sourceBreakdown.entries()).map(([source, count]) => ({ source, count })),
      hired_count: hiredApps.length,
      rejected_count: rejectedApps.length,
      average_days_to_hire: avgDays,
      conversion_rate_overall: conversion,
    },
    pipeline: { id: pipeline?.id, stages },
    org_total_applicants: (applicantsInWindow ?? []).length,
  });
});
