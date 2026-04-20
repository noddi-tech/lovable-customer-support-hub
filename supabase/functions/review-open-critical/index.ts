import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  resolveBucket,
  getBucketConfig,
  buildMentionPrefix,
  describeRouting,
  inferCategoryFromKeyword,
  buildAlertHeader,
  buildFeedbackFooterBlock,
  getEffectiveKeywords,
  type IntegrationRoutingFields,
  type KeywordOverrides,
} from '../_shared/critical-routing.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function cleanPreviewText(text: string | undefined, maxLength: number = 180): string {
  if (!text) return '';
  let result = text;
  result = result.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
  result = result.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  result = result.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  result = result.replace(/<!--[\s\S]*?-->/g, '');
  result = result.replace(/<\/?(p|div|br|tr|li|td|th|h[1-6])[^>]*>/gi, '\n');
  result = result.replace(/<[^>]+>/g, ' ');
  result = result.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&[a-z]+;/gi, ' ');
  result = result.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (result.length > maxLength) result = result.substring(0, maxLength).trim() + '...';
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: integrations, error: intError } = await supabase
      .from('slack_integrations')
      .select('*')
      .eq('is_active', true)
      .not('critical_channel_id', 'is', null);

    if (intError || !integrations || integrations.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No orgs with critical channels configured', reviewed: 0, alerted: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const summary = { reviewed: 0, alerted: 0, skipped_dedup: 0, details: [] as any[] };

    for (const integration of integrations) {
      const orgId = integration.organization_id;
      const criticalChannelId = integration.critical_channel_id;
      const config = (integration.configuration as any) || {};

      if (config.critical_alerts_enabled === false) {
        console.log(`🔇 Org ${orgId}: critical alerts disabled in config`);
        continue;
      }

      // Resolve effective keyword list (BASE ∪ added − disabled − active mutes)
      const overrides = (integration.critical_keyword_overrides as KeywordOverrides) || {};
      const { data: muteRows } = await supabase
        .from('critical_keyword_mutes')
        .select('keyword')
        .eq('organization_id', orgId)
        .gt('expires_at', new Date().toISOString());
      const activeMutes = (muteRows || []).map((m: { keyword: string }) => m.keyword);
      const effectiveKeywords = getEffectiveKeywords(overrides, activeMutes);

      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id, subject, preview_text, customer_id, inbox_id, customers(full_name, email)')
        .eq('organization_id', orgId)
        .in('status', ['open', 'pending'])
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(500);

      if (convError || !conversations) {
        console.error(`Error fetching conversations for org ${orgId}:`, convError);
        continue;
      }

      console.log(`📋 Org ${orgId}: reviewing ${conversations.length} open conversations`);

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: existingAlerts } = await supabase
        .from('notifications')
        .select('data')
        .eq('type', 'critical_alert_sent')
        .gte('created_at', twentyFourHoursAgo);

      const alertedConvIds = new Set<string>();
      if (existingAlerts) {
        for (const alert of existingAlerts) {
          const convId = (alert.data as any)?.conversation_id;
          if (convId) alertedConvIds.add(convId);
        }
      }

      for (const conv of conversations) {
        summary.reviewed++;
        const customer = conv.customers as any;
        const customerName = customer?.full_name || 'Unknown';
        const customerEmail = customer?.email || '';

        if (alertedConvIds.has(conv.id)) {
          summary.skipped_dedup++;
          continue;
        }

        let convCriticalChannelId = criticalChannelId;
        let convCriticalToken = integration.secondary_access_token || integration.access_token;
        let inboxRoutingOverride: any = null;

        if (conv.inbox_id) {
          const { data: routing } = await supabase
            .from('inbox_slack_routing')
            .select('*')
            .eq('inbox_id', conv.inbox_id)
            .eq('is_active', true)
            .maybeSingle();

          if (routing) {
            inboxRoutingOverride = routing;
            if (routing.critical_enabled === false) {
              console.log(`🔇 Critical alerts disabled for inbox ${conv.inbox_id}, skipping`);
              continue;
            }
            if (routing.critical_channel_id) {
              convCriticalChannelId = routing.critical_channel_id;
              convCriticalToken = routing.critical_use_secondary && integration.secondary_access_token
                ? integration.secondary_access_token
                : integration.access_token;
            } else if (routing.channel_id && routing.channel_id !== '_placeholder') {
              convCriticalChannelId = routing.channel_id;
              convCriticalToken = routing.use_secondary_workspace && integration.secondary_access_token
                ? integration.secondary_access_token
                : integration.access_token;
            }
          }
        }

        const { data: latestMsg } = await supabase
          .from('messages')
          .select('content')
          .eq('conversation_id', conv.id)
          .eq('sender_type', 'customer')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const previewText = latestMsg?.content || conv.preview_text || '';
        const textToCheck = [conv.subject, previewText, customerName]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const matchedKeyword = effectiveKeywords.find(kw => textToCheck.includes(kw));

        if (!matchedKeyword) continue;

        const title = conv.subject || 'No subject';
        const cleanedPreview = cleanPreviewText(previewText, 180);

        // Resolve Tech vs Ops bucket + mention prefix
        const resolvedCategory = inferCategoryFromKeyword(matchedKeyword);
        const bucket = resolveBucket(
          resolvedCategory,
          (integration.critical_category_routing as Record<string, string>) || {},
        );
        const bucketConfig = getBucketConfig(
          bucket,
          integration as IntegrationRoutingFields,
          inboxRoutingOverride,
        );
        const mentionPrefix = buildMentionPrefix(bucketConfig);

        // Category-aware header
        const header = buildAlertHeader({
          category: resolvedCategory,
          title,
          customerName,
          mentionPrefix,
          isBatch: true,
        });

        const criticalBlocks: any[] = [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: header.headerText },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*From:*\n${customerName}${customerEmail ? ` (${customerEmail})` : ''}` },
              { type: 'mrkdwn', text: `*Subject:*\n${title}` },
            ],
          },
        ];

        if (cleanedPreview) {
          criticalBlocks.push({
            type: 'section',
            text: { type: 'mrkdwn', text: `> ${cleanedPreview.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}` },
          });
        }

        criticalBlocks.push({
          type: 'context',
          elements: [{ type: 'mrkdwn', text: `🔑 Triggered by keyword: \`${matchedKeyword}\`` }],
        });
        criticalBlocks.push({
          type: 'context',
          elements: [{ type: 'mrkdwn', text: describeRouting(bucket, bucketConfig, resolvedCategory) }],
        });

        const appUrl = Deno.env.get('APP_URL') || 'https://support.noddi.co';
        const conversationUrl = `${appUrl}/c/${conv.id}`;
        criticalBlocks.push({
          type: 'actions',
          elements: [{
            type: 'button',
            text: { type: 'plain_text', text: '👀 View Conversation', emoji: true },
            url: conversationUrl,
          }],
        });

        criticalBlocks.push(buildFeedbackFooterBlock());

        const critToken = convCriticalToken;
        try {
          const criticalResponse = await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${critToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              channel: convCriticalChannelId,
              text: header.fallbackText,
              attachments: [{
                color: header.color,
                blocks: criticalBlocks,
              }],
              unfurl_links: false,
              unfurl_media: false,
            }),
          });

          const critResult = await criticalResponse.json();
          if (!critResult.ok) {
            console.error(`Failed to alert conv ${conv.id}:`, critResult.error);
            continue;
          }

          // Track with rich data for feedback loop
          await supabase.from('notifications').insert({
            user_id: '00000000-0000-0000-0000-000000000000',
            title: 'Critical alert sent',
            message: `Batch critical alert for conversation ${conv.id}`,
            type: 'critical_alert_sent',
            data: {
              conversation_id: conv.id,
              organization_id: orgId,
              trigger: `keyword: ${matchedKeyword}`,
              trigger_source: 'batch_keyword',
              matched_keyword: matchedKeyword,
              ai_category: null,
              ai_severity: null,
              resolved_bucket: bucket,
              resolved_category: resolvedCategory,
              slack_channel_id: convCriticalChannelId,
              slack_message_ts: critResult.ts,
              source: 'batch_review',
            },
          });

          summary.alerted++;
          summary.details.push({ conversation_id: conv.id, subject: conv.subject, keyword: matchedKeyword, customer: customerName });
          console.log(`🚨 Alert sent for conv ${conv.id} (keyword: ${matchedKeyword}) ts=${critResult.ts}`);
        } catch (err) {
          console.error(`Error sending alert for conv ${conv.id}:`, err);
        }
      }
    }

    console.log(`✅ Batch review complete: ${summary.reviewed} reviewed, ${summary.alerted} alerted, ${summary.skipped_dedup} deduped`);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Batch critical review error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
