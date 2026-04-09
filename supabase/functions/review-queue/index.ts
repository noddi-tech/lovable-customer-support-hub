import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const { action } = body;

    if (action === 'list') {
      return await handleList(supabase, body);
    } else if (action === 'update') {
      return await handleUpdate(supabase, body);
    } else if (action === 'stats') {
      return await handleStats(supabase, body);
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: list, update, stats' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[review-queue] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

async function handleList(supabase: any, body: any) {
  const { organizationId, status, reason, limit: lim } = body;

  if (!organizationId) {
    return new Response(
      JSON.stringify({ error: 'organizationId required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  let query = supabase
    .from('review_queue')
    .select(`
      id, conversation_id, reason, priority, details, status,
      reviewer_id, reviewer_notes, reviewed_at, created_at
    `)
    .eq('organization_id', organizationId)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(lim || 50);

  if (status) query = query.eq('status', status);
  if (reason) query = query.eq('reason', reason);

  const { data, error } = await query;

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({ items: data || [] }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

async function handleUpdate(supabase: any, body: any) {
  const { id, status, reviewerNotes, reviewerId } = body;

  if (!id || !status || !['reviewed', 'dismissed'].includes(status)) {
    return new Response(
      JSON.stringify({ error: 'id and status (reviewed|dismissed) required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const { error } = await supabase
    .from('review_queue')
    .update({
      status,
      reviewer_notes: reviewerNotes || null,
      reviewer_id: reviewerId || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

async function handleStats(supabase: any, body: any) {
  const { organizationId } = body;

  if (!organizationId) {
    return new Response(
      JSON.stringify({ error: 'organizationId required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const { data, error } = await supabase
    .from('review_queue')
    .select('reason, status')
    .eq('organization_id', organizationId);

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const stats = {
    total_pending: 0,
    by_reason: {} as Record<string, number>,
    reviewed: 0,
    dismissed: 0,
  };

  for (const row of data || []) {
    if (row.status === 'pending') {
      stats.total_pending++;
      stats.by_reason[row.reason] = (stats.by_reason[row.reason] || 0) + 1;
    } else if (row.status === 'reviewed') {
      stats.reviewed++;
    } else if (row.status === 'dismissed') {
      stats.dismissed++;
    }
  }

  return new Response(
    JSON.stringify({ stats }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}
