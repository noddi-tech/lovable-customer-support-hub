import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Clean HTML tags from text for AI processing
 */
function stripHtml(text: string): string {
  if (!text) return '';
  let result = text;
  result = result.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  result = result.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  result = result.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
  result = result.replace(/<[^>]+>/g, ' ');
  result = result.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
  result = result.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Support manual invocation with digest_type and force parameters
    let digestType = 'daily';
    let force = false;
    try {
      const body = await req.json();
      if (body?.digest_type) digestType = body.digest_type;
      if (body?.force) force = true;
    } catch { /* no body = cron invocation, default to daily */ }

    const periodDays = digestType === 'weekly' ? 7 : 1;
    const periodLabel = digestType === 'weekly' ? 'Weekly' : 'Daily';

    // Get current Oslo time for time-gate check
    const osloNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Oslo' }));
    const currentHour = osloNow.getHours();
    const currentDay = osloNow.getDay(); // 0=Sun, 1=Mon
    console.log(`Digest invoked: type=${digestType}, force=${force}, Oslo hour=${currentHour}, day=${currentDay}`);

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

      // Check digest frequency setting
      const frequency = config.digest_frequency || 'daily';
      if (digestType === 'daily' && frequency === 'weekly') continue;
      if (digestType === 'weekly' && frequency === 'daily') continue;
      // 'both' always runs

      // Time-gate: only send when current Oslo hour matches configured digest_time
      if (!force) {
        const digestTime = config.digest_time || '08:00';
        const configuredHour = parseInt(digestTime.split(':')[0], 10);
        if (currentHour !== configuredHour) {
          console.log(`Skipping org ${integration.organization_id}: configured hour ${configuredHour}, current Oslo hour ${currentHour}`);
          continue;
        }
        // Weekly digests only on Mondays
        if (digestType === 'weekly' && currentDay !== 1) {
          console.log(`Skipping weekly for org ${integration.organization_id}: not Monday (day=${currentDay})`);
          continue;
        }
      }

      const orgId = integration.organization_id;
      const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

      // Fetch conversation stats for the period (include inbox_id)
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id, status, channel, priority, subject, customer_id, inbox_id, created_at, updated_at')
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

      // Fetch per-inbox routing entries
      const { data: routingEntries } = await supabase
        .from('inbox_slack_routing')
        .select('*')
        .eq('slack_integration_id', integration.id)
        .eq('is_active', true);

      // Build routing map: use dedicated digest_channel_id if set, else fall back to channel_id
      const routingMap = new Map<string, { digest_channel_id: string; digest_use_secondary: boolean }>();
      if (routingEntries) {
        for (const r of routingEntries) {
          // Skip inboxes where digest is explicitly disabled
          if (r.digest_enabled === false) {
            routingMap.set(r.inbox_id, { digest_channel_id: '__disabled__', digest_use_secondary: false });
            continue;
          }
          if (r.digest_channel_id) {
            routingMap.set(r.inbox_id, { digest_channel_id: r.digest_channel_id, digest_use_secondary: r.digest_use_secondary ?? false });
          } else if (r.channel_id && r.channel_id !== '_placeholder') {
            // Fall back to notification channel for digest if no dedicated digest channel
            routingMap.set(r.inbox_id, { digest_channel_id: r.channel_id, digest_use_secondary: r.use_secondary_workspace ?? false });
          }
        }
      }

      // Group conversations: routed inboxes get their own digest, rest go to default
      const inboxGroups = new Map<string, typeof conversations>();
      const defaultGroup: typeof conversations = [];

      for (const conv of (conversations || [])) {
        if (conv.inbox_id && routingMap.has(conv.inbox_id)) {
          const entry = routingMap.get(conv.inbox_id)!;
          if (entry.digest_channel_id === '__disabled__') {
            // Digest disabled for this inbox — exclude entirely
            continue;
          }
          if (!inboxGroups.has(conv.inbox_id)) {
            inboxGroups.set(conv.inbox_id, []);
          }
          inboxGroups.get(conv.inbox_id)!.push(conv);
        } else {
          defaultGroup.push(conv);
        }
      }

      // Helper: build and send a digest for a set of conversations
      const sendDigestForGroup = async (
        groupConversations: typeof conversations,
        targetChannelId: string,
        targetToken: string,
        inboxLabel?: string,
      ) => {
        // Fetch actual message content for AI summary
        const conversationIds = (groupConversations || []).map(c => c.id);
        let customerMessages: { content: string; conversation_subject: string }[] = [];

        if (conversationIds.length > 0) {
          const { data: messages, error: msgError } = await supabase
            .from('messages')
            .select('content, conversation_id')
            .in('conversation_id', conversationIds.slice(0, 100))
            .eq('sender_type', 'customer')
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(150);

          if (msgError) {
            console.error(`Error fetching messages for org ${orgId}:`, msgError);
          } else {
            const convMap = new Map((groupConversations || []).map(c => [c.id, c.subject || '(no subject)']));
            customerMessages = (messages || []).map(m => ({
              content: stripHtml(m.content).substring(0, 300),
              conversation_subject: convMap.get(m.conversation_id) || '(no subject)',
            }));
          }
        }

        // Compute numeric stats
        const newConversations = (groupConversations || []).filter(c => c.created_at >= since);
        const openCount = (groupConversations || []).filter(c => c.status === 'open').length;
        const pendingCount = (groupConversations || []).filter(c => c.status === 'pending').length;
        const closedCount = (groupConversations || []).filter(c => c.status === 'closed').length;
        const urgentCount = (groupConversations || []).filter(c => c.priority === 'urgent' || c.priority === 'high').length;

        const channelCounts: Record<string, number> = {};
        for (const c of newConversations) {
          channelCounts[c.channel] = (channelCounts[c.channel] || 0) + 1;
        }
        const channelBreakdown = Object.entries(channelCounts)
          .map(([ch, count]) => `${ch}: ${count}`)
          .join(' · ') || 'None';

        // Generate AI summary if OpenAI key is available and we have messages
        let aiSummary = '';
        if (openaiApiKey && customerMessages.length > 0) {
          try {
            const messagesForAI = customerMessages.slice(0, 80).map((m, i) =>
              `[${i + 1}] Subject: "${m.conversation_subject}" — "${m.content}"`
            ).join('\n');

            const systemPrompt = digestType === 'weekly'
              ? `You are a support analytics assistant. Summarize this week's customer messages using Slack mrkdwn format.

CRITICAL: Use *bold* (single asterisks) for emphasis. NEVER use **double asterisks**. Use • for bullet points. Be extremely concise.

Format exactly like this:
*Key Themes*
• Theme 1 — one sentence
• Theme 2 — one sentence
• Theme 3 — one sentence

*Action Items*
• Urgent issues and recommendations combined

*Sentiment:* One sentence overview.

Max 200 words total. No extra sections.`
              : `You are a support analytics assistant. Summarize today's customer messages using Slack mrkdwn format.

CRITICAL: Use *bold* (single asterisks) for emphasis. NEVER use **double asterisks**. Use • for bullet points. Be extremely concise.

Format exactly like this:
*Key Themes*
• Theme 1 — one sentence
• Theme 2 — one sentence

*Action Items*
• Urgent issues and recommendations

*Sentiment:* One sentence overview.

Max 150 words total. No extra sections.`;

            const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: `Here are ${customerMessages.length} customer messages from the last ${periodDays} day(s):\n\n${messagesForAI}` },
                ],
                max_tokens: 500,
                temperature: 0.3,
              }),
            });

            if (aiResponse.ok) {
              const aiResult = await aiResponse.json();
              aiSummary = aiResult.choices?.[0]?.message?.content || '';
              aiSummary = aiSummary.replace(/\*\*([^*]+)\*\*/g, '*$1*');
              if (aiSummary.length > 2800) aiSummary = aiSummary.substring(0, 2800) + '…';
            } else {
              console.error('OpenAI API error:', await aiResponse.text());
            }
          } catch (aiErr) {
            console.error('AI summary generation failed:', aiErr);
          }
        }

        const now = new Date().toLocaleDateString('en-US', {
          timeZone: 'Europe/Oslo',
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        });

        const headerText = inboxLabel
          ? `📊 ${periodLabel} Digest — ${inboxLabel} — ${now}`
          : `📊 ${periodLabel} Support Digest — ${now}`;

        // Build Block Kit message
        const blocks: any[] = [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: headerText,
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*New conversations:*\n${newConversations.length}` },
              { type: 'mrkdwn', text: `*Open:*\n${openCount}` },
              { type: 'mrkdwn', text: `*Pending:*\n${pendingCount}` },
              { type: 'mrkdwn', text: `*Closed (${periodDays}d):*\n${closedCount}` },
            ],
          },
        ];

        if (urgentCount > 0) {
          blocks.push({
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*🔴 Urgent/High priority:*\n${urgentCount}` },
            ],
          });
        }

        blocks.push({
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*By channel:*\n${channelBreakdown}` },
          ],
        });

        if (aiSummary) {
          blocks.push(
            { type: 'divider' },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*🤖 AI Summary*\n\n${aiSummary}`,
              },
            },
          );
        } else if (customerMessages.length === 0) {
          blocks.push(
            { type: 'divider' },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `_No customer messages to summarize for this period._`,
              },
            },
          );
        }

        blocks.push(
          { type: 'divider' },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `${periodLabel} digest${inboxLabel ? ` · ${inboxLabel}` : ''} · ${(groupConversations || []).length} conversations active · ${customerMessages.length} messages analyzed`,
              },
            ],
          },
        );

        const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${targetToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel: targetChannelId,
            text: `📊 ${periodLabel}${inboxLabel ? ` ${inboxLabel}` : ''} Digest — ${now}: ${newConversations.length} new, ${openCount} open, ${urgentCount} urgent`,
            blocks,
            unfurl_links: false,
            unfurl_media: false,
          }),
        });

        const slackResult = await slackResponse.json();
        if (!slackResult.ok) {
          console.error(`Slack error for org ${orgId}:`, slackResult.error);
          return { sent: false, error: slackResult.error };
        }
        console.log(`${periodLabel} digest sent for org ${orgId}${inboxLabel ? ` (${inboxLabel})` : ''}`);
        return { sent: true };
      };

      // Fetch inbox names for routed inboxes
      const routedInboxIds = Array.from(inboxGroups.keys());
      let inboxNames = new Map<string, string>();
      if (routedInboxIds.length > 0) {
        const { data: inboxes } = await supabase
          .from('inboxes')
          .select('id, name')
          .in('id', routedInboxIds);
        if (inboxes) {
          for (const inbox of inboxes) {
            inboxNames.set(inbox.id, inbox.name);
          }
        }
      }

      // Send per-inbox digests
      for (const [inboxId, groupConvs] of inboxGroups) {
        const routing = routingMap.get(inboxId)!;
        const token = routing.digest_use_secondary && integration.secondary_access_token
          ? integration.secondary_access_token
          : integration.access_token;
        const inboxName = inboxNames.get(inboxId) || 'Unknown Inbox';
        const result = await sendDigestForGroup(groupConvs, routing.digest_channel_id, token, inboxName);
        results.push({ org: orgId, sent: result.sent, error: result.error });
      }

      // Send default digest for unrouted conversations
      if (defaultGroup.length > 0 && integration.digest_channel_id) {
        const defaultToken = integration.secondary_access_token || integration.access_token;
        const result = await sendDigestForGroup(defaultGroup, integration.digest_channel_id, defaultToken);
        results.push({ org: orgId, sent: result.sent, error: result.error });
      } else if (defaultGroup.length === 0 && inboxGroups.size === 0 && integration.digest_channel_id) {
        // No conversations at all — send empty digest to default channel
        const defaultToken = integration.secondary_access_token || integration.access_token;
        const result = await sendDigestForGroup([], integration.digest_channel_id, defaultToken);
        results.push({ org: orgId, sent: result.sent, error: result.error });
      }
    }

    return new Response(JSON.stringify({ success: true, digest_type: digestType, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in slack-daily-digest:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
