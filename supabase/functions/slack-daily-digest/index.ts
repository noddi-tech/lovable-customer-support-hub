import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active Slack integrations with digest enabled
    const { data: integrations, error: intError } = await supabase
      .from('slack_integrations')
      .select('*')
      .eq('is_active', true);

    if (intError) throw intError;
    if (!integrations || integrations.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: 'No active integrations' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: { org: string; sent: boolean; error?: string }[] = [];

    for (const integration of integrations) {
      const config = integration.configuration || {};
      if (!config.digest_enabled || !integration.digest_channel_id) {
        continue;
      }

      const orgId = integration.organization_id;
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Fetch conversation stats for last 24h
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id, status, channel, priority, subject, customer_id, created_at, updated_at')
        .eq('organization_id', orgId)
        .gte('updated_at', since)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(500);

      if (convError) {
        console.error(`Error fetching conversations for org ${orgId}:`, convError);
        results.push({ org: orgId, sent: false, error: convError.message });
        continue;
      }

      const newConversations = (conversations || []).filter(c => c.created_at >= since);
      const openCount = (conversations || []).filter(c => c.status === 'open').length;
      const pendingCount = (conversations || []).filter(c => c.status === 'pending').length;
      const closedCount = (conversations || []).filter(c => c.status === 'closed').length;
      const urgentCount = (conversations || []).filter(c => c.priority === 'urgent' || c.priority === 'high').length;

      // Count by channel
      const channelCounts: Record<string, number> = {};
      for (const c of newConversations) {
        channelCounts[c.channel] = (channelCounts[c.channel] || 0) + 1;
      }

      const channelBreakdown = Object.entries(channelCounts)
        .map(([ch, count]) => `${ch}: ${count}`)
        .join(' · ') || 'None';

      // Top subjects (most active)
      const subjectCounts: Record<string, number> = {};
      for (const c of conversations || []) {
        const subj = c.subject || '(no subject)';
        subjectCounts[subj] = (subjectCounts[subj] || 0) + 1;
      }
      const topSubjects = Object.entries(subjectCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([subj, count]) => `• ${subj} (${count})`)
        .join('\n');

      const now = new Date().toLocaleDateString('en-US', {
        timeZone: 'Europe/Oslo',
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });

      // Build Block Kit message
      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `📊 Daily Support Digest — ${now}`,
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*New conversations:*\n${newConversations.length}` },
            { type: 'mrkdwn', text: `*Open:*\n${openCount}` },
            { type: 'mrkdwn', text: `*Pending:*\n${pendingCount}` },
            { type: 'mrkdwn', text: `*Closed (24h):*\n${closedCount}` },
          ],
        },
      ];

      if (urgentCount > 0) {
        blocks.push({
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*🔴 Urgent/High priority:*\n${urgentCount}` },
          ],
        } as any);
      }

      blocks.push({
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*By channel:*\n${channelBreakdown}` },
        ],
      } as any);

      if (topSubjects) {
        blocks.push(
          { type: 'divider' } as any,
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*🔥 Most active conversations:*\n${topSubjects}`,
            },
          } as any,
        );
      }

      blocks.push(
        { type: 'divider' } as any,
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Data from the last 24 hours · ${(conversations || []).length} conversations active`,
            },
          ],
        } as any,
      );

      // Post to Slack
      const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${integration.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: integration.digest_channel_id,
          text: `📊 Daily Support Digest — ${now}: ${newConversations.length} new, ${openCount} open, ${urgentCount} urgent`,
          blocks,
          unfurl_links: false,
          unfurl_media: false,
        }),
      });

      const slackResult = await slackResponse.json();
      if (!slackResult.ok) {
        console.error(`Slack error for org ${orgId}:`, slackResult.error);
        results.push({ org: orgId, sent: false, error: slackResult.error });
      } else {
        console.log(`Digest sent for org ${orgId}`);
        results.push({ org: orgId, sent: true });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in slack-daily-digest:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
