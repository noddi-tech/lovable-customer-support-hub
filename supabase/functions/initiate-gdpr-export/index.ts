// Phase 12 M12.2 — Initiate GDPR Article 15+20 export.
// Recruiter (org admin) endpoint. Creates a gdpr_requests row, fires off
// fulfill-gdpr-export asynchronously with the service-role key, returns
// the request_id immediately so the UI can poll.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';

interface Body {
  applicant_id: string;
  reason?: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) return json({ error: 'Unauthorized' }, 401);
  const authUserId = userRes.user.id;

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!body.applicant_id) return json({ error: 'applicant_id required' }, 400);

  const supabase = createClient(supabaseUrl, serviceKey);

  // Load applicant + org
  const { data: applicant } = await supabase
    .from('applicants')
    .select('id, organization_id, first_name, last_name, email, anonymized_at')
    .eq('id', body.applicant_id)
    .maybeSingle();
  if (!applicant) return json({ error: 'Applicant not found' }, 404);

  // Admin authorization in that org
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, organization_id, is_active')
    .eq('user_id', authUserId)
    .maybeSingle();
  const isAdmin =
    profile?.is_active &&
    profile.organization_id === applicant.organization_id &&
    (profile.role === 'admin' || profile.role === 'super_admin');
  if (!isAdmin) return json({ error: 'Forbidden — admin required' }, 403);

  const fullName =
    [applicant.first_name, applicant.last_name].filter(Boolean).join(' ').trim() ||
    '[ANONYMIZED]';

  // Create the gdpr_requests row in 'processing' state
  const { data: request, error: insertErr } = await supabase
    .from('gdpr_requests')
    .insert({
      organization_id: applicant.organization_id,
      applicant_id: applicant.id,
      applicant_name_snapshot: fullName,
      applicant_email_snapshot: applicant.email ?? null,
      request_type: 'export',
      status: 'processing',
      requested_by: profile?.id ?? null,
      reason_provided: body.reason ?? null,
    })
    .select('id')
    .single();

  if (insertErr || !request) {
    return json({ error: 'insert_failed', message: insertErr?.message }, 500);
  }

  // Entry audit event
  await supabase.from('recruitment_audit_events').insert({
    organization_id: applicant.organization_id,
    event_type: 'gdpr_export_requested',
    event_category: 'export',
    subject_table: 'gdpr_requests',
    subject_id: request.id,
    applicant_id: applicant.id,
    actor_profile_id: profile?.id ?? null,
    context: { reason: body.reason ?? null },
  });

  // Fire-and-forget fulfill call (do not await — UI polls gdpr_requests).
  // We still await invoke() because Deno edge runtime may kill the request
  // context when the response is returned; using EdgeRuntime.waitUntil if
  // available, else best-effort.
  const fulfillUrl = `${supabaseUrl}/functions/v1/fulfill-gdpr-export`;
  const fulfillPromise = fetch(fulfillUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      apikey: serviceKey,
    },
    body: JSON.stringify({ request_id: request.id }),
  }).catch((e) => {
    console.error('[initiate-gdpr-export] fulfill dispatch failed', e);
  });

  // @ts-ignore EdgeRuntime is provided by Supabase Deno deploy runtime
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(fulfillPromise);
  }

  return json({
    request_id: request.id,
    status: 'processing',
  });
});
