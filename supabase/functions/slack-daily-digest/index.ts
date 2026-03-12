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
      const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

      // Fetch conversation stats for the period
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

      // Fetch actual message content for AI summary
      const conversationIds = (conversations || []).map(c => c.id);
      let customerMessages: { content: string; conversation_subject: string }[] = [];

      if (conversationIds.length > 0) {
        // Fetch customer messages from the period (limit to 150 for AI context)
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
          const convMap = new Map((conversations || []).map(c => [c.id, c.subject || '(no subject)']));
          customerMessages = (messages || []).map(m => ({
            content: stripHtml(m.content).substring(0, 300),
            conversation_subject: convMap.get(m.conversation_id) || '(no subject)',
          }));
        }
      }

      // Compute numeric stats
      const newConversations = (conversations || []).filter(c => c.created_at >= since);
      const openCount = (conversations || []).filter(c => c.status === 'open').length;
      const pendingCount = (conversations || []).filter(c => c.status === 'pending').length;
      const closedCount = (conversations || []).filter(c => c.status === 'closed').length;
      const urgentCount = (conversations || []).filter(c => c.priority === 'urgent' || c.priority === 'high').length;

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
            // Post-process: convert **bold** to *bold* for Slack mrkdwn
            aiSummary = aiSummary.replace(/\*\*([^*]+)\*\*/g, '*$1*');
            // Truncate to 2800 chars to stay under Slack's 3000-char block limit
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

      // Build Block Kit message
      const blocks: any[] = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `📊 ${periodLabel} Support Digest — ${now}`,
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

      // Add AI summary section
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
              text: `${periodLabel} digest · ${(conversations || []).length} conversations active · ${customerMessages.length} messages analyzed`,
            },
          ],
        },
      );

      // Post to Slack
      const digestToken = integration.secondary_access_token || integration.access_token;
      const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${digestToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: integration.digest_channel_id,
          text: `📊 ${periodLabel} Support Digest — ${now}: ${newConversations.length} new, ${openCount} open, ${urgentCount} urgent`,
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
        console.log(`${periodLabel} digest sent for org ${orgId}`);
        results.push({ org: orgId, sent: true });
      }
    }

    return new Response(JSON.stringify({ success: true, digest_type: digestType, results }), {
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
