import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-version',
};

const AIRCALL_API = 'https://api.aircall.io/v1';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

interface AircallTag {
  id: number;
  name: string;
  color?: string;
}

/** Fetch every tag defined in the Aircall account (paginated). */
async function listTags(auth: string): Promise<AircallTag[]> {
  const tags: AircallTag[] = [];
  let page = 1;
  while (page <= 10) {
    const res = await fetch(`${AIRCALL_API}/tags?per_page=50&page=${page}`, {
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
    });
    if (!res.ok) break;
    const data = await res.json();
    const batch: AircallTag[] = data?.tags || [];
    tags.push(...batch);
    if (batch.length < 50) break;
    page++;
  }
  return tags;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const adminClient = createClient(supabaseUrl, serviceKey);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: 'Unauthorized' }, 401);

    let body: { callId?: string; brandName?: string | null } = {};
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const callId = (body.callId || '').trim();
    if (!callId || !/^[0-9a-f-]{36}$/i.test(callId)) {
      return json({ error: 'callId must be a valid uuid' }, 400);
    }

    // The caller must belong to the organization that owns the call
    const { data: call, error: callError } = await adminClient
      .from('calls')
      .select('id, organization_id, provider, external_id, metadata')
      .eq('id', callId)
      .maybeSingle();
    if (callError) throw callError;
    if (!call) return json({ error: 'Call not found' }, 404);

    const { data: membership } = await adminClient
      .from('organization_memberships')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', call.organization_id)
      .maybeSingle();
    const { data: profile } = await adminClient
      .from('profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!membership && profile?.organization_id !== call.organization_id) {
      return json({ error: 'Forbidden' }, 403);
    }

    if (call.provider !== 'aircall' || !call.external_id) {
      return json({ success: true, skipped: 'Call is not an Aircall call' });
    }

    const { data: integration } = await adminClient
      .from('voice_integrations')
      .select('configuration')
      .eq('organization_id', call.organization_id)
      .eq('provider', 'aircall')
      .maybeSingle();

    const everywhere = (integration?.configuration as any)?.aircallEverywhere;
    const apiId = everywhere?.apiId;
    const apiToken = everywhere?.apiToken;
    if (!apiId || !apiToken) {
      return json({ error: 'Aircall API credentials not configured' }, 400);
    }
    const auth = `Basic ${btoa(`${apiId}:${apiToken}`)}`;

    const meta = (call.metadata || {}) as Record<string, any>;
    const previousTagIds: number[] = [
      ...(Array.isArray(meta.aircall_brand_tag_ids) ? meta.aircall_brand_tag_ids : []),
      ...(Array.isArray(meta.aircall_managed_tag_ids) ? meta.aircall_managed_tag_ids : []),
    ].filter((n: unknown): n is number => typeof n === 'number');

    // Labels we mirror onto the Aircall call: the brand label plus every custom
    // tag linked to the call. Both are read from the database so the sync always
    // reflects the current state, whatever triggered it.
    const labels: string[] = [];
    const pushLabel = (value: unknown) => {
      const clean = typeof value === 'string' ? value.trim() : '';
      if (clean && clean.length <= 100 && !labels.some((l) => l.toLowerCase() === clean.toLowerCase())) {
        labels.push(clean);
      }
    };
    pushLabel(meta.brand_name ?? meta.brand);

    const { data: tagLinks } = await adminClient
      .from('tag_links')
      .select('tags(name)')
      .eq('entity_type', 'call')
      .eq('entity_id', call.id);
    for (const link of (tagLinks || []) as any[]) pushLabel(link?.tags?.name);

    const existingTags = await listTags(auth);

    const tagIds: number[] = [];
    for (const label of labels) {
      const match = existingTags.find(
        (t) => (t.name || '').trim().toLowerCase() === label.toLowerCase(),
      );
      let tagId = match?.id ?? null;

      // Create the tag in Aircall the first time it is used
      if (!tagId) {
        const createRes = await fetch(`${AIRCALL_API}/tags`, {
          method: 'POST',
          headers: { Authorization: auth, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: label }),
        });
        if (!createRes.ok) {
          const text = await createRes.text();
          return json(
            { error: `Failed to create Aircall tag (${createRes.status}): ${text.slice(0, 200)}` },
            502,
          );
        }
        const created = await createRes.json();
        tagId = created?.tag?.id ?? null;
      }
      if (!tagId) return json({ error: `Could not resolve Aircall tag id for "${label}"` }, 502);
      if (!tagIds.includes(tagId)) tagIds.push(tagId);
    }

    // Keep tags agents added directly in Aircall, replace the ones we manage
    const keptTags: number[] = [];
    const callRes = await fetch(`${AIRCALL_API}/calls/${call.external_id}`, {
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
    });
    if (callRes.ok) {
      const remote = await callRes.json();
      for (const t of remote?.call?.tags || []) {
        if (typeof t?.id === 'number' && !previousTagIds.includes(t.id) && !tagIds.includes(t.id)) {
          keptTags.push(t.id);
        }
      }
    }

    const finalTags = [...keptTags, ...tagIds];
    const applyRes = await fetch(`${AIRCALL_API}/calls/${call.external_id}/tags`, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: finalTags }),
    });

    if (!applyRes.ok) {
      const text = await applyRes.text();
      console.error('[aircall-tag-call] Apply failed', applyRes.status, text.slice(0, 300));
      return json(
        { error: `Failed to tag call in Aircall (${applyRes.status}): ${text.slice(0, 200)}` },
        502,
      );
    }

    await adminClient
      .from('calls')
      .update({
        metadata: {
          ...meta,
          aircall_brand_tag_ids: tagIds,
          aircall_managed_tag_ids: tagIds,
          aircall_managed_tag_labels: labels,
          aircall_brand_tag_synced_at: new Date().toISOString(),
        },
      })
      .eq('id', call.id);

    return json({ success: true, tags: finalTags, labels });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[aircall-tag-call] Error:', message);
    return json({ success: false, error: message }, 500);
  }
});
