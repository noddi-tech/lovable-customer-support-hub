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

  let payload: { conversation_id?: string };
  try { payload = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!payload.conversation_id) return json({ error: 'conversation_id required' }, 400);

  const { data: conv } = await supabase
    .from('conversations')
    .select('id, organization_id, applicant_id, conversation_type')
    .eq('id', payload.conversation_id)
    .maybeSingle();
  if (!conv) return json({ error: 'Conversation not found' }, 404);

  // Admin-only per spec §3c
  const { data: roleRows } = await supabase
    .from('user_roles')
    .select('role, organization_id')
    .eq('user_id', authUserId);
  const isAdmin = (roleRows || []).some((r: any) =>
    (r.role === 'admin' || r.role === 'super_admin')
    && (r.organization_id === conv.organization_id || r.role === 'super_admin')
  );
  if (!isAdmin) return json({ error: 'Admin only' }, 403);

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', authUserId)
    .maybeSingle();

  const previousApplicant = conv.applicant_id;

  const { error: updErr } = await supabase
    .from('conversations')
    .update({ applicant_id: null })
    .eq('id', conv.id);
  if (updErr) return json({ error: updErr.message }, 500);

  await supabase.from('recruitment_audit_events').insert({
    organization_id: conv.organization_id,
    event_type: 'conversation_detached_from_applicant',
    event_category: 'write',
    subject_table: 'conversations',
    subject_id: conv.id,
    applicant_id: previousApplicant,
    actor_profile_id: callerProfile?.id || null,
    old_values: { applicant_id: previousApplicant },
  });

  return json({ ok: true }, 200);
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
