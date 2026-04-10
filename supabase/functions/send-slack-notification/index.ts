import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SlackNotificationRequest {
  organization_id: string;
  event_type: 'new_conversation' | 'customer_reply' | 'assignment' | 'mention' | 'sla_warning' | 'conversation_closed';
  conversation_id?: string;
  inbox_id?: string;
  customer_name?: string;
  customer_email?: string;
  subject?: string;
  preview_text?: string;
  assigned_to_name?: string;
  assigned_to_email?: string;
  mentioned_user_name?: string;
  mentioned_slack_ids?: string[];
  mentioner_slack_id?: string;
  inbox_name?: string;
  channel?: 'email' | 'widget' | 'chat' | 'facebook' | 'instagram' | 'whatsapp';
}

// Unified notification color (brand blue)
const NOTIFICATION_COLOR = '#3b82f6';

// Emojis by channel type
const CHANNEL_EMOJIS: Record<string, string> = {
  email: '📧',
  widget: '💬',
  chat: '💬',
  facebook: '📘',
  instagram: '📸',
  whatsapp: '📱',
};

// Channel labels for display
const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  widget: 'Widget',
  chat: 'Chat',
  facebook: 'Facebook',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
};

// Fallback emojis for non-channel events
const EVENT_EMOJIS: Record<string, string> = {
  mention: '📣',
  sla_warning: '⚠️',
};

/**
 * Clean and extract readable preview text from email content
 */
function cleanPreviewText(text: string | undefined, maxLength: number = 180): string {
  if (!text) return '';
  
  let result = text;
  
  result = result.replace(/<html[^>]*>/gi, '');
  result = result.replace(/<\/html>/gi, '');
  result = result.replace(/<body[^>]*>/gi, '');
  result = result.replace(/<\/body>/gi, '');
  result = result.replace(/<!DOCTYPE[^>]*>/gi, '');
  result = result.replace(/<\?xml[^>]*\?>/gi, '');
  result = result.replace(/<\?[^>]*\?>/gi, '');
  result = result.replace(/<[a-z]+:[^>]*>[\s\S]*?<\/[a-z]+:[^>]*>/gi, '');
  result = result.replace(/<[a-z]+:[^>]*\/>/gi, '');
  result = result.replace(/<[a-z]+:[^>]*>/gi, '');
  result = result.replace(/<\/[a-z]+:[^>]*>/gi, '');
  result = result.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
  result = result.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  result = result.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  result = result.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '');
  result = result.replace(/<!--[\s\S]*?-->/g, '');
  result = result.replace(/<!\[if[^>]*\]>[\s\S]*?<!\[endif\]>/gi, '');
  result = result.replace(/<\/?(p|div|br|tr|li|td|th|h[1-6])[^>]*>/gi, '\n');
  result = result.replace(/<[^>]+>/g, ' ');
  result = result.replace(/<[^>]*$/g, '');
  result = result.replace(/^[^<]*>/g, '');
  result = result.replace(/[<>]/g, ' ');
  result = result
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)))
    .replace(/&[a-z]+;/gi, ' ');
  result = result.replace(/To unsubscribe from this group[\s\S]*?@[^\s.]+\.[^\s]+/gi, '');
  result = result.replace(/You received this message because you are subscribed[\s\S]*/gi, '');
  result = result.replace(/--\s*\nYou received this message[\s\S]*/gi, '');
  result = result.replace(/Unsubscribe from this group[\s\S]*/gi, '');
  result = result.replace(/\n--\s*\n[\s\S]*/g, '');
  result = result.replace(/[\r\n\t]+/g, ' ');
  result = result.replace(/\s+/g, ' ');
  result = result.trim();
  
  if (result.length > maxLength) {
    result = result.substring(0, maxLength).trim() + '...';
  }
  
  return result;
}

/**
 * AI-powered critical triage: analyze message context for urgency
 */
async function aiCriticalTriage(
  supabase: any,
  conversationId: string,
  openaiApiKey: string
): Promise<{ critical: boolean; category: string; reason: string; severity: number } | null> {
  try {
    // Fetch last 5 messages for context
    const { data: recentMessages, error } = await supabase
      .from('messages')
      .select('content, sender_type, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error || !recentMessages || recentMessages.length === 0) return null;

    const messageContext = recentMessages.reverse().map((m: any) => {
      const role = m.sender_type === 'customer' ? 'Customer' : 'Agent';
      const content = cleanPreviewText(m.content, 300);
      return `${role}: ${content}`;
    }).join('\n');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a customer support triage system. Analyze the conversation and determine if it's critical/urgent.

Categories: billing_issue, service_failure, safety_concern, frustrated_customer, escalation_request, legal_threat, data_issue, none.

Return ONLY valid JSON (no markdown): { "critical": boolean, "category": string, "reason": string, "severity": number (1-5) }

A message is critical (severity >= 3) if the customer:
- Reports a payment/billing failure
- Reports a service not working or broken feature
- Expresses significant frustration (waiting long, no response)
- Mentions safety concerns or damage
- Threatens legal action or regulatory complaints
- Reports data loss or privacy issues
- Explicitly asks for escalation or manager

Be conservative: only flag truly critical issues. Normal questions and feature requests are NOT critical.`,
          },
          {
            role: 'user',
            content: `Analyze this conversation:\n\n${messageContext}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error('AI triage API error:', response.status);
      return null;
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) return null;

    // Parse JSON from response (handle potential markdown wrapping)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('AI triage failed:', err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SlackNotificationRequest = await req.json();
    const {
      organization_id,
      event_type,
      conversation_id,
      inbox_id,
      customer_name,
      customer_email,
      subject,
      preview_text,
      assigned_to_name,
      mentioned_user_name,
      mentioned_slack_ids,
      mentioner_slack_id,
      inbox_name,
      channel,
    } = body;

    if (!organization_id || !event_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Slack integration for this organization
    const { data: integration, error: integrationError } = await supabase
      .from('slack_integrations')
      .select('*')
      .eq('organization_id', organization_id)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      console.log('No active Slack integration for organization:', organization_id);
      return new Response(
        JSON.stringify({ skipped: true, reason: 'No active Slack integration' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this event type is enabled
    const config = integration.configuration || {};
    const enabledEvents = config.enabled_events || [];
    
    if (!enabledEvents.includes(event_type)) {
      console.log(`Event type ${event_type} not enabled for organization:`, organization_id);
      return new Response(
        JSON.stringify({ skipped: true, reason: 'Event type not enabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Per-inbox routing lookup
    let channelId = integration.default_channel_id;
    let accessToken = integration.access_token;

    if (inbox_id) {
      const { data: routing } = await supabase
        .from('inbox_slack_routing')
        .select('*')
        .eq('inbox_id', inbox_id)
        .eq('is_active', true)
        .maybeSingle();

      if (routing) {
        channelId = routing.channel_id;
        if (routing.use_secondary_workspace && integration.secondary_access_token) {
          accessToken = integration.secondary_access_token;
        }
        console.log(`Per-inbox routing: inbox ${inbox_id} → channel ${routing.channel_id} (secondary: ${routing.use_secondary_workspace})`);
      }
    }

    if (!channelId) {
      console.log('No channel configured for organization:', organization_id);
      return new Response(
        JSON.stringify({ skipped: true, reason: 'No channel configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the Slack message using Block Kit
    const channelLabel = CHANNEL_LABELS[channel || 'email'] || 'Email';
    const emoji = CHANNEL_EMOJIS[channel || 'email'] || EVENT_EMOJIS[event_type] || '📨';
    
    let title: string;
    switch (event_type) {
      case 'new_conversation':
        title = `New ${channelLabel} Conversation`;
        break;
      case 'customer_reply':
        title = `${channelLabel} Reply`;
        break;
      case 'assignment':
        title = assigned_to_name ? `Assigned to ${assigned_to_name}` : 'Assignment Changed';
        break;
      case 'conversation_closed':
        title = 'Conversation Closed';
        break;
      case 'mention':
        title = 'You Were Mentioned';
        break;
      case 'sla_warning':
        title = 'SLA Warning';
        break;
      default:
        title = 'Notification';
    }

    // Build fallback text for native push notifications
    let fallbackText = title;
    if (customer_name) {
      fallbackText += ` from ${customer_name}`;
    }
    if (preview_text) {
      const cleanedPreview = cleanPreviewText(preview_text, 100);
      if (cleanedPreview) {
        fallbackText += `: ${cleanedPreview}`;
      }
    }

    const blocks: any[] = [];
    const attachmentBlocks: any[] = [];

    // Header section with source indicator
    attachmentBlocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${emoji} *${title}*${inbox_name ? ` in ${inbox_name}` : ''}`,
      },
    });

    // Customer info with subject
    attachmentBlocks.push({
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*From:*\n${customer_name || 'Unknown'}${customer_email ? ` (${customer_email})` : ''}`,
        },
        {
          type: 'mrkdwn',
          text: `*Subject:*\n${subject || 'No subject'}`,
        },
      ],
    });

    // Message preview
    if (preview_text && config.include_message_preview !== false) {
      const cleanedPreview = cleanPreviewText(preview_text, 180);
      
      if (cleanedPreview) {
        const escapedPreview = cleanedPreview
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        
        attachmentBlocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `> ${escapedPreview}`,
          },
        });
      }
    }

    // Mention info
    if (event_type === 'mention') {
      let mentionText: string;
      if (mentioned_slack_ids && mentioned_slack_ids.length > 0) {
        const tags = mentioned_slack_ids.map(id => `<@${id}>`).join(' ');
        mentionText = mentioned_slack_ids.length === 1
          ? `📣 ${tags} was mentioned`
          : `📣 ${tags} were mentioned`;
      } else if (mentioned_user_name) {
        mentionText = `📣 *${mentioned_user_name}* was mentioned`;
      } else {
        mentionText = '📣 Someone was mentioned';
      }

      attachmentBlocks.push({
        type: 'context',
        elements: [{ type: 'mrkdwn', text: mentionText }],
      });
    }

    // Action button
    if (conversation_id) {
      const appUrl = Deno.env.get('APP_URL') || 'https://support.noddi.co';
      // Use canonical short link format — auto-detects channel and redirects correctly
      const conversationUrl = `${appUrl}/c/${conversation_id}`;
      
      attachmentBlocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '👀 View Conversation', emoji: true },
            url: conversationUrl,
          },
        ],
      });
    }

    // Timestamp context
    attachmentBlocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `⏰ ${new Date().toLocaleString('en-US', { 
            timeZone: 'Europe/Oslo',
            dateStyle: 'short',
            timeStyle: 'short',
          })}`,
        },
      ],
    });

    // Send to Slack
    const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        text: fallbackText,
        blocks: blocks,
        attachments: [
          {
            color: NOTIFICATION_COLOR,
            blocks: attachmentBlocks,
          },
        ],
        unfurl_links: false,
        unfurl_media: false,
      }),
    });

    const slackResult = await slackResponse.json();

    let mainNotificationSuccess = true;
    if (!slackResult.ok) {
      console.error('Slack API error:', slackResult.error);
      mainNotificationSuccess = false;
    } else {
      console.log(`Slack notification sent for ${event_type} to channel ${channelId}`);
    }

    // === Critical Triage Detection (runs independently of main notification) ===
    // Critical alerts use per-inbox routing if available, else org-level critical channel
    let criticalChannelId = integration.critical_channel_id;
    let criticalToken = integration.secondary_access_token || integration.access_token;

    // Override critical routing with per-inbox critical_channel if configured
    if (inbox_id) {
      const { data: critRouting } = await supabase
        .from('inbox_slack_routing')
        .select('*')
        .eq('inbox_id', inbox_id)
        .eq('is_active', true)
        .maybeSingle();

      if (critRouting) {
        // Use dedicated critical channel if set, otherwise fall back to notification channel
        if (critRouting.critical_channel_id) {
          criticalChannelId = critRouting.critical_channel_id;
          criticalToken = critRouting.critical_use_secondary && integration.secondary_access_token
            ? integration.secondary_access_token
            : integration.access_token;
        } else if (critRouting.channel_id && critRouting.channel_id !== '_placeholder') {
          criticalChannelId = critRouting.channel_id;
          criticalToken = critRouting.use_secondary_workspace && integration.secondary_access_token
            ? integration.secondary_access_token
            : integration.access_token;
        }
      }
    }
    
    if (!config.critical_alerts_enabled) {
      console.log('🔇 Critical alerts disabled in config');
    } else if (!criticalChannelId) {
      console.log('🔇 No critical channel configured');
    } else if (event_type === 'mention') {
      console.log('🔇 Skipping critical triage for mention event (handled separately)');
    }

    if (config.critical_alerts_enabled && criticalChannelId && event_type !== 'mention') {
      // Dedup: skip critical alert if one was already sent for this conversation in the last 24h
      let alreadyAlerted = false;
      if (conversation_id) {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: existingAlert } = await supabase
          .from('notifications')
          .select('id')
          .eq('type', 'critical_alert_sent')
          .contains('data', { conversation_id })
          .gte('created_at', twentyFourHoursAgo)
          .limit(1)
          .maybeSingle();
        if (existingAlert) {
          console.log(`⏭️ Critical alert already sent for conversation ${conversation_id} in last 24h, skipping`);
          alreadyAlerted = true;
        }
      }
      const CRITICAL_KEYWORDS = [
        // English
        'booking', "can't book", 'cannot book', 'payment failed', 'payment error',
        'error', 'not working', 'broken', 'down', 'outage', 'can\'t access',
        'unable to', 'fails', 'failure', 'critical', 'urgent',
        // Norwegian
        'kan ikke bestille', 'bestilling feilet', 'bestilling feiler',
        'betaling feilet', 'betaling feiler', 'betalingsfeil',
        'fungerer ikke', 'virker ikke', 'funker ikke',
        'feil', 'feilmelding', 'feiler',
        'nedetid', 'ødelagt', 'nede',
        'får ikke til', 'klarer ikke', 'ikke tilgjengelig',
        'kritisk', 'haster', 'akutt',
        'kan ikke logge inn', 'innlogging feiler',
        'appen krasjer', 'krasjer', 'tom side', 'blank side',
      ];

      const textToCheck = [subject, preview_text, customer_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchedKeyword = CRITICAL_KEYWORDS.find(kw => textToCheck.includes(kw));
      
      // AI triage: if no keyword match, use AI for context-aware detection
      let aiTriageResult: { critical: boolean; category: string; reason: string; severity: number } | null = null;
      
      if (!matchedKeyword && openaiApiKey && conversation_id && 
          (event_type === 'new_conversation' || event_type === 'customer_reply')) {
        aiTriageResult = await aiCriticalTriage(supabase, conversation_id, openaiApiKey);
      }

      const shouldAlert = !alreadyAlerted && (matchedKeyword || (aiTriageResult?.critical && (aiTriageResult?.severity || 0) >= 3));

      if (shouldAlert) {
        const criticalBlocks: any[] = [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `🚨 *CRITICAL ALERT* — ${title}`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*From:*\n${customer_name || 'Unknown'}${customer_email ? ` (${customer_email})` : ''}`,
              },
              {
                type: 'mrkdwn',
                text: `*Subject:*\n${subject || 'No subject'}`,
              },
            ],
          },
        ];

        if (preview_text) {
          const cleanedPreview = cleanPreviewText(preview_text, 180);
          if (cleanedPreview) {
            criticalBlocks.push({
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `> ${cleanedPreview.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}`,
              },
            });
          }
        }

        // Show trigger reason
        if (matchedKeyword) {
          criticalBlocks.push({
            type: 'context',
            elements: [
              { type: 'mrkdwn', text: `🔑 Triggered by keyword: \`${matchedKeyword}\`` },
            ],
          });
        } else if (aiTriageResult) {
          criticalBlocks.push({
            type: 'context',
            elements: [
              { 
                type: 'mrkdwn', 
                text: `🤖 AI detected: *${aiTriageResult.category.replace(/_/g, ' ')}* (severity ${aiTriageResult.severity}/5)\n${aiTriageResult.reason}` 
              },
            ],
          });
        }

        if (conversation_id) {
          const appUrl = Deno.env.get('APP_URL') || 'https://support.noddi.co';
          const conversationUrl = `${appUrl}/c/${conversation_id}`;
          criticalBlocks.push({
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: '👀 View Conversation', emoji: true },
                url: conversationUrl,
              },
            ],
          });
        }

        try {
          const criticalResponse = await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${criticalToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              channel: criticalChannelId,
              text: `🚨 CRITICAL: ${title} from ${customer_name || 'Unknown'} — ${subject || 'No subject'} <!channel>`,
              attachments: [
                {
                  color: '#dc2626',
                  blocks: criticalBlocks,
                },
              ],
              unfurl_links: false,
              unfurl_media: false,
            }),
          });
          const critResult = await criticalResponse.json();
          if (!critResult.ok) {
            console.error('Critical alert Slack error:', critResult.error);
          } else {
            const triggerSource = matchedKeyword ? `keyword: ${matchedKeyword}` : `AI: ${aiTriageResult?.category}`;
            console.log(`Critical alert sent to ${criticalChannelId} (${triggerSource})`);
            
            // Track this alert to prevent duplicates for 24h
            if (conversation_id) {
              await supabase.from('notifications').insert({
                user_id: '00000000-0000-0000-0000-000000000000',
                title: 'Critical alert sent',
                message: `Critical alert for conversation ${conversation_id}`,
                type: 'critical_alert_sent',
                data: { conversation_id, trigger: triggerSource },
              }).then(({ error }) => {
                if (error) console.error('Failed to track critical alert:', error);
              });
            }
          }
        } catch (critErr) {
          console.error('Failed to send critical alert:', critErr);
        }
      }
    }

    if (!mainNotificationSuccess) {
      return new Response(
        JSON.stringify({ error: slackResult.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, ts: slackResult.ts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending Slack notification:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
