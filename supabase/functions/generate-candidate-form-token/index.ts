// Recruiter-initiated: create a candidate form token and optionally dispatch via email/SMS.
// Token creation is delegated to _shared/sendCandidateForm.ts so this path,
// the bulk path, and the automation path stay on a single code path.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';
import {
  createCandidateFormToken,
  dispatchCandidateFormInvite,
  revokeCandidateFormToken,
} from '../_shared/sendCandidateForm.ts';

interface Body {
  application_id: string;
  channel: 'email' | 'sms' | 'manual';
  expiry_days?: number;
  inbox_id?: string; // required for email channel (recruitment inbox)
  custom_message?: string;
  template_id?: string;
  subject_override?: string;
  body_html_override?: string;
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

  const supabase = createClient(supabaseUrl, serviceKey);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  // Membership + profile lookup (org auth happens against the application's org).
  const { data: application } = await supabase
    .from('applications')
    .select('id, organization_id')
    .eq('id', body.application_id)
    .maybeSingle();
  if (!application) return json({ error: 'Application not found' }, 404);

  const { data: membership } = await supabase
    .from('organization_memberships')
    .select('id')
    .eq('user_id', authUserId)
    .eq('organization_id', application.organization_id)
    .eq('status', 'active')
    .maybeSingle();
  if (!membership) return json({ error: 'Forbidden' }, 403);

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', authUserId)
    .maybeSingle();

  // Create token via shared helper.
  const result = await createCandidateFormToken(supabase, {
    application_id: body.application_id,
    channel: body.channel,
    expiry_days: body.expiry_days,
    created_by_profile_id: profile?.id ?? null,
  });

  if (!result.ok) {
    return json({ error: result.error, message: result.message }, result.status);
  }

  const { token_id, url, expires_at, applicant, position } = result;

  if (body.channel === 'manual') {
    return json({
      token_id,
      token: result.token,
      url,
      expires_at,
      channel: result.channel,
      dispatch: null,
    });
  }

  try {
    const dispatch = await dispatchCandidateFormInvite(supabase, {
      token_id,
      url,
      expires_at,
      channel: body.channel,
      organization_id: result.organization_id,
      recruiter_profile_id: profile?.id ?? null,
      inbox_id: body.inbox_id,
      custom_message: body.custom_message,
      applicant,
      position,
      auth_header: authHeader,
      revoked_by_profile_id: profile?.id ?? null,
    });
    if (!dispatch.ok) {
      return json({ error: dispatch.error, message: dispatch.message }, dispatch.status);
    }
    return json({
      token_id,
      token: result.token,
      url,
      expires_at,
      channel: result.channel,
      dispatch: dispatch.dispatch,
    });
  } catch (e: any) {
    await revokeCandidateFormToken(supabase, token_id, profile?.id ?? null, `unexpected: ${e?.message ?? e}`);
    return json({ error: 'dispatch_failed', message: e?.message ?? String(e) }, 500);
  }
});
