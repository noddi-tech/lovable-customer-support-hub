// Recruiter-initiated: revoke an active candidate form token.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';
import { logAudit } from '../_shared/candidateFormUtils.ts';

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

  let body: { token_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.token_id) return json({ error: 'token_id required' }, 400);

  const { data: tokenRow } = await supabase
    .from('candidate_form_tokens')
    .select('id, organization_id, applicant_id, used_at, revoked_at')
    .eq('id', body.token_id)
    .maybeSingle();

  if (!tokenRow) return json({ error: 'Token not found' }, 404);
  if (tokenRow.used_at) return json({ error: 'Token already used' }, 409);
  if (tokenRow.revoked_at) return json({ error: 'Token already revoked' }, 409);

  // Verify caller is org member
  const { data: membership } = await supabase
    .from('organization_memberships')
    .select('id')
    .eq('user_id', authUserId)
    .eq('organization_id', tokenRow.organization_id)
    .eq('status', 'active')
    .maybeSingle();
  if (!membership) return json({ error: 'Forbidden' }, 403);

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', authUserId)
    .maybeSingle();

  const now = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from('candidate_form_tokens')
    .update({ revoked_at: now, revoked_by: profile?.id ?? null })
    .eq('id', tokenRow.id);

  if (updateErr) return json({ error: 'Failed to revoke', details: updateErr.message }, 500);

  await logAudit(supabase, tokenRow, 'candidate_form_revoked', null, null);

  return json({ success: true });
});
