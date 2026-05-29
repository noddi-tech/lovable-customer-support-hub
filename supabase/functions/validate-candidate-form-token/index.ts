// Public endpoint: validate a candidate form token + identity check.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';
import { validateTokenAndIdentity, getClientIp } from '../_shared/candidateFormUtils.ts';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let body: { token?: string; phone_last_4?: string };
  try {
    body = await req.json();
  } catch {
    return json({ valid: false, reason: 'invalid_input' }, 400);
  }

  const result = await validateTokenAndIdentity(
    supabase,
    body.token ?? '',
    body.phone_last_4 ?? '',
    getClientIp(req),
  );

  if (!result.ok) {
    return json(result.body, result.status);
  }

  // Minimal response — only what the landing page needs to render the form intro.
  const { data: position } = await supabase
    .from('applications')
    .select('id, position:job_positions!inner(title, candidate_form_intro_text)')
    .eq('id', result.token.application_id)
    .maybeSingle();

  return json({
    valid: true,
    applicant: {
      first_name: result.applicant.first_name,
      last_name: result.applicant.last_name,
    },
    position: (position as any)?.position
      ? {
          title: (position as any).position.title,
          intro_text: (position as any).position.candidate_form_intro_text,
        }
      : null,
  });
});
