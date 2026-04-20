/**
 * backfill-critical-alert-ts
 *
 * Best-effort backfill of `slack_message_ts` and `slack_channel_id` for recent
 * `critical_alert_sent` notifications. For each notification missing a ts:
 *   1. Resolve the org's Slack bot token + critical channel ID from
 *      slack_integrations / inbox_slack_routing.
 *   2. Call conversations.history around the notification's created_at (±60s).
 *   3. Match the bot's message whose text contains "CRITICAL".
 *   4. Patch notifications.data with slack_message_ts + slack_channel_id.
 *
 * Idempotent: skips notifications already containing slack_message_ts.
 * Admin-only.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRow {
  id: string;
  created_at: string;
  data: Record<string, unknown> | null;
}

async function fetchBotUserId(token: string): Promise<string | null> {
  try {
    const r = await fetch('https://slack.com/api/auth.test', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const j = await r.json();
    return j.ok ? (j.user_id as string) : null;
  } catch {
    return null;
  }
}

async function findMessageInChannel(
  token: string,
  channelId: string,
  approxTsSec: number,
  botUserId: string | null,
): Promise<string | null> {
  // Search ±60 seconds around the approximate timestamp.
  const oldest = (approxTsSec - 60).toFixed(0);
  const latest = (approxTsSec + 60).toFixed(0);
  const url =
    `https://slack.com/api/conversations.history?channel=${encodeURIComponent(channelId)}` +
    `&oldest=${oldest}&latest=${latest}&limit=50&inclusive=true`;
  try {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const j = await r.json();
    if (!j.ok) {
      console.warn(`history error for ${channelId}: ${j.error}`);
      return null;
    }
    const messages = (j.messages || []) as Array<{
      ts: string;
      user?: string;
      bot_id?: string;
      text?: string;
      attachments?: Array<{ blocks?: unknown[] }>;
      blocks?: unknown[];
    }>;

    // Pick the closest bot message that looks like a critical alert.
    let best: { ts: string; delta: number } | null = null;
    for (const m of messages) {
      const isOurBot = botUserId ? m.user === botUserId : !!m.bot_id;
      if (!isOurBot) continue;
      // Heuristic: critical alerts contain "CRITICAL" or 🚨 or "TEST" sentinel
      const haystack =
        (m.text || '') +
        ' ' +
        JSON.stringify(m.attachments || []) +
        ' ' +
        JSON.stringify(m.blocks || []);
      const looksCritical =
        /CRITICAL/i.test(haystack) ||
        haystack.includes('🚨') ||
        /test-trigger-please-ignore/i.test(haystack);
      if (!looksCritical) continue;

      const tsSec = parseFloat(m.ts);
      const delta = Math.abs(tsSec - approxTsSec);
      if (!best || delta < best.delta) best = { ts: m.ts, delta };
    }
    return best?.ts ?? null;
  } catch (e) {
    console.warn(`history fetch failed for ${channelId}:`, e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: roles } = await supabase
      .from('user_roles')
      .select('organization_id, role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin');

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: 'Admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminOrgIds = new Set(
      roles.map((r) => (r as { organization_id: string }).organization_id),
    );

    // Pull last 50 critical_alert_sent notifications missing slack_message_ts
    const { data: notifications, error: notifErr } = await supabase
      .from('notifications')
      .select('id, created_at, data')
      .eq('type', 'critical_alert_sent')
      .order('created_at', { ascending: false })
      .limit(100);
    if (notifErr) throw notifErr;

    const candidates = (notifications || []).filter((n) => {
      const d = (n.data as Record<string, unknown>) || {};
      const orgId = d.organization_id as string | undefined;
      const hasTs = !!d.slack_message_ts;
      return !!orgId && !hasTs && adminOrgIds.has(orgId);
    }) as NotificationRow[];

    let scanned = 0;
    let patched = 0;
    const skipped: Record<string, number> = {};

    // Cache bot tokens + bot user IDs per org to avoid repeat auth.test calls
    const orgCache = new Map<
      string,
      { token: string | null; botUserId: string | null; channelId: string | null }
    >();

    for (const n of candidates) {
      scanned++;
      const data = (n.data || {}) as Record<string, unknown>;
      const orgId = data.organization_id as string;
      let storedChannelId = (data.slack_channel_id as string | undefined) || null;

      if (!orgCache.has(orgId)) {
        const { data: integration } = await supabase
          .from('slack_integrations')
          .select('access_token')
          .eq('organization_id', orgId)
          .maybeSingle();
        const token = (integration?.access_token as string | undefined) || null;
        const botUserId = token ? await fetchBotUserId(token) : null;

        // Find a critical channel from any inbox routing (preferred when channel_id missing)
        let channelId: string | null = null;
        const { data: routing } = await supabase
          .from('inbox_slack_routing')
          .select('critical_channel_id')
          .eq('is_active', true)
          .not('critical_channel_id', 'is', null)
          .limit(1)
          .maybeSingle();
        channelId = (routing?.critical_channel_id as string | undefined) || null;

        orgCache.set(orgId, { token, botUserId, channelId });
      }

      const cached = orgCache.get(orgId)!;
      const token = cached.token;
      const botUserId = cached.botUserId;
      const channelId = storedChannelId || cached.channelId;

      if (!token) {
        skipped['no_token'] = (skipped['no_token'] || 0) + 1;
        continue;
      }
      if (!channelId) {
        skipped['no_channel'] = (skipped['no_channel'] || 0) + 1;
        continue;
      }

      const approxTsSec = Math.floor(new Date(n.created_at).getTime() / 1000);
      const ts = await findMessageInChannel(token, channelId, approxTsSec, botUserId);
      if (!ts) {
        skipped['no_match'] = (skipped['no_match'] || 0) + 1;
        continue;
      }

      const newData = {
        ...data,
        slack_message_ts: ts,
        slack_channel_id: channelId,
      };
      const { error: updErr } = await supabase
        .from('notifications')
        .update({ data: newData })
        .eq('id', n.id);
      if (updErr) {
        console.error('update error', updErr);
        skipped['update_error'] = (skipped['update_error'] || 0) + 1;
      } else {
        patched++;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, scanned, patched, skipped, total_candidates: candidates.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('backfill-critical-alert-ts error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
