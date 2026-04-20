/**
 * slack-event-handler
 *
 * Public Slack Events API endpoint. Listens for `reaction_added` on bot
 * messages (critical alerts) and writes feedback rows.
 *
 * Reactions tracked:
 *   👍 (+1)        → mark trigger as useful
 *   👎 (-1)        → mark trigger as false alarm
 *   🔇 (mute)      → mute the matched keyword for 7 days
 *
 * Verifies Slack signing secret on every request.
 * Public endpoint (no JWT) — security comes from signature verification.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-slack-signature, x-slack-request-timestamp',
};

const POSITIVE_REACTIONS = new Set(['+1', 'thumbsup', 'thumbsup_all']);
const NEGATIVE_REACTIONS = new Set(['-1', 'thumbsdown']);
const MUTE_REACTIONS = new Set(['mute', 'no_bell', 'no_entry']);

function mapReaction(name: string): '+1' | '-1' | 'mute' | null {
  const n = name.toLowerCase();
  if (POSITIVE_REACTIONS.has(n)) return '+1';
  if (NEGATIVE_REACTIONS.has(n)) return '-1';
  if (MUTE_REACTIONS.has(n)) return 'mute';
  return null;
}

/** Verify Slack request signature. */
async function verifySlackSignature(
  body: string,
  timestamp: string,
  signature: string,
  signingSecret: string,
): Promise<boolean> {
  // Reject requests older than 5 minutes (replay protection)
  const ts = parseInt(timestamp, 10);
  if (!ts || Math.abs(Date.now() / 1000 - ts) > 60 * 5) return false;

  const baseString = `v0:${timestamp}:${body}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(baseString));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
  const expected = `v0=${hex}`;

  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

async function resolveSlackUserEmail(token: string, userId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data?.user?.profile?.email ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const signingSecret = Deno.env.get('SLACK_SIGNING_SECRET');

    // Verify signature if secret is configured
    if (signingSecret) {
      const sig = req.headers.get('x-slack-signature') || '';
      const ts = req.headers.get('x-slack-request-timestamp') || '';
      if (!sig || !ts || !(await verifySlackSignature(rawBody, ts, sig, signingSecret))) {
        console.warn('Slack signature verification failed');
        return new Response(JSON.stringify({ error: 'invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      console.warn('SLACK_SIGNING_SECRET not configured — signature check skipped');
    }

    const payload = JSON.parse(rawBody);

    // 1. URL verification handshake
    if (payload.type === 'url_verification') {
      return new Response(JSON.stringify({ challenge: payload.challenge }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Event callback
    if (payload.type === 'event_callback' && payload.event) {
      const event = payload.event;
      if (event.type !== 'reaction_added') {
        return new Response(JSON.stringify({ ok: true, ignored: event.type }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const reaction = mapReaction(event.reaction);
      if (!reaction) {
        return new Response(JSON.stringify({ ok: true, ignored_reaction: event.reaction }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );

      const channelId: string = event.item?.channel;
      const messageTs: string = event.item?.ts;
      const reactorSlackId: string = event.user;

      if (!channelId || !messageTs || !reactorSlackId) {
        return new Response(JSON.stringify({ ok: true, skipped: 'missing event fields' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Find the original notification matching this Slack message
      const { data: notification } = await supabase
        .from('notifications')
        .select('id, data')
        .eq('type', 'critical_alert_sent')
        .filter('data->>slack_message_ts', 'eq', messageTs)
        .filter('data->>slack_channel_id', 'eq', channelId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!notification) {
        console.log(`No critical alert notification found for ts=${messageTs} channel=${channelId}`);
        return new Response(JSON.stringify({ ok: true, skipped: 'unknown message' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = (notification.data as Record<string, unknown>) || {};
      const organizationId = data.organization_id as string | undefined;
      if (!organizationId) {
        console.log('Notification missing organization_id, skipping');
        return new Response(JSON.stringify({ ok: true, skipped: 'no org' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Try to resolve reactor email via the workspace's bot token
      let reactorEmail: string | null = null;
      const { data: integration } = await supabase
        .from('slack_integrations')
        .select('access_token, secondary_access_token')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (integration?.access_token) {
        reactorEmail =
          (await resolveSlackUserEmail(integration.access_token, reactorSlackId)) ||
          (integration.secondary_access_token
            ? await resolveSlackUserEmail(integration.secondary_access_token, reactorSlackId)
            : null);
      }

      // Insert feedback row (idempotent via UNIQUE constraint)
      const { error: insertError } = await supabase.from('critical_alert_feedback').insert({
        notification_id: notification.id,
        conversation_id: data.conversation_id ?? null,
        organization_id: organizationId,
        trigger_source: data.trigger_source ?? 'keyword',
        matched_keyword: data.matched_keyword ?? null,
        ai_category: data.ai_category ?? null,
        resolved_bucket: data.resolved_bucket ?? null,
        reaction,
        reactor_slack_id: reactorSlackId,
        reactor_email: reactorEmail,
        slack_channel_id: channelId,
        slack_message_ts: messageTs,
      });

      if (insertError && !insertError.message.includes('duplicate')) {
        console.error('Failed to insert feedback:', insertError);
      }

      // 🔇 mute → 7-day keyword mute (only if a keyword was matched)
      if (reaction === 'mute' && data.matched_keyword) {
        const { error: muteError } = await supabase.from('critical_keyword_mutes').upsert(
          {
            organization_id: organizationId,
            keyword: String(data.matched_keyword).toLowerCase(),
            muted_via: 'reaction',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
          { onConflict: 'organization_id,keyword' },
        );
        if (muteError) console.error('Failed to mute keyword:', muteError);
      }

      return new Response(JSON.stringify({ ok: true, recorded: reaction }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('slack-event-handler error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
