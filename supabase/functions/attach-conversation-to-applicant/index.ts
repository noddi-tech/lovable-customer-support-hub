import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing authorization' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) return json({ error: 'Unauthorized' }, 401);
  const authUserId = userRes.user.id;

  const supabase = createClient(supabaseUrl, serviceKey);

  let payload: { conversation_id?: string; applicant_id?: string };
  try { payload = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!payload.conversation_id || !payload.applicant_id) {
    return json({ error: 'conversation_id and applicant_id required' }, 400);
  }

  // Fetch conversation + applicant + verify same org + caller membership
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, organization_id, applicant_id')
    .eq('id', payload.conversation_id)
    .maybeSingle();
  if (!conv) return json({ error: 'Conversation not found' }, 404);

  const { data: applicant } = await supabase
    .from('applicants')
    .select('id, organization_id')
    .eq('id', payload.applicant_id)
    .maybeSingle();
  if (!applicant) return json({ error: 'Applicant not found' }, 404);
  if (applicant.organization_id !== conv.organization_id) {
    return json({ error: 'Cross-organization attach not allowed' }, 400);
  }

  const { data: member } = await supabase
    .from('organization_memberships')
    .select('role, status')
    .eq('user_id', authUserId)
    .eq('organization_id', conv.organization_id)
    .eq('status', 'active')
    .maybeSingle();
  if (!member) return json({ error: 'Not a member of this organization' }, 403);

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', authUserId)
    .maybeSingle();

  const { error: updErr } = await supabase
    .from('conversations')
    .update({
      applicant_id: applicant.id,
      conversation_type: 'recruitment',
    })
    .eq('id', conv.id);
  if (updErr) return json({ error: updErr.message }, 500);

  // Audit (event_category='write' per memory rule + B5b learning)
  await supabase.from('recruitment_audit_events').insert({
    organization_id: conv.organization_id,
    event_type: 'conversation_attached_to_applicant',
    event_category: 'write',
    subject_table: 'conversations',
    subject_id: conv.id,
    applicant_id: applicant.id,
    actor_profile_id: callerProfile?.id || null,
    new_values: { applicant_id: applicant.id, conversation_id: conv.id },
  });

  return json({ ok: true }, 200);
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
