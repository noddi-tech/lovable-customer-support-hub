import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const application_id = body.application_id;
    const trigger_reason = body.trigger_reason || 'manual';
    if (!application_id) {
      return new Response(JSON.stringify({ error: 'application_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!['initial', 'stage_change', 'manual', 'data_change', 're_run'].includes(trigger_reason)) {
      return new Response(JSON.stringify({ error: 'invalid trigger_reason' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify application + org access via membership join
    const { data: app, error: appErr } = await admin
      .from('applications')
      .select('id, organization_id, current_stage_id, position_id')
      .eq('id', application_id)
      .maybeSingle();
    if (appErr || !app) {
      return new Response(JSON.stringify({ error: 'Application not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: membership } = await admin
      .from('organization_memberships')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', app.organization_id)
      .maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Skip if already pending/processing
    const { data: existing } = await admin
      .from('application_scoring_queue')
      .select('id, status')
      .eq('application_id', application_id)
      .in('status', ['pending', 'processing'])
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ queued: true, queue_id: existing.id, already_pending: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve triggered_by profile id
    const { data: profile } = await admin.from('profiles').select('id').eq('user_id', userId).maybeSingle();

    const { data: queueRow, error: insErr } = await admin
      .from('application_scoring_queue')
      .insert({
        application_id,
        organization_id: app.organization_id,
        trigger_reason,
        triggered_by: profile?.id ?? null,
        triggered_at_stage_id: app.current_stage_id,
      })
      .select('id')
      .single();

    if (insErr) throw insErr;

    // Mark application as 'scoring' so UI shows spinner immediately
    await admin
      .from('applications')
      .update({ score_status: 'scoring' })
      .eq('id', application_id);

    return new Response(JSON.stringify({ queued: true, queue_id: queueRow.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[score-application] error', err);
    return new Response(JSON.stringify({ error: err?.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
