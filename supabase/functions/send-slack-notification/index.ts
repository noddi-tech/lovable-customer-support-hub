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
 * Aggressively strips ALL HTML including namespaced tags, footers, and whitespace
 */
function cleanPreviewText(text: string | undefined, maxLength: number = 180): string {
  if (!text) return '';
  
  let result = text;
  
  // FIRST: Remove entire document structure wrapper tags (including namespaced attributes)
  result = result.replace(/<html[^>]*>/gi, '');
  result = result.replace(/<\/html>/gi, '');
  result = result.replace(/<body[^>]*>/gi, '');
  result = result.replace(/<\/body>/gi, '');
  
  // Remove DOCTYPE declarations
  result = result.replace(/<!DOCTYPE[^>]*>/gi, '');
  
  // Remove XML declarations and processing instructions
  result = result.replace(/<\?xml[^>]*\?>/gi, '');
  result = result.replace(/<\?[^>]*\?>/gi, '');
  
  // Remove namespaced tags (o:p, v:shape, etc.)
  result = result.replace(/<[a-z]+:[^>]*>[\s\S]*?<\/[a-z]+:[^>]*>/gi, '');
  result = result.replace(/<[a-z]+:[^>]*\/>/gi, '');
  result = result.replace(/<[a-z]+:[^>]*>/gi, '');
  result = result.replace(/<\/[a-z]+:[^>]*>/gi, '');
  
  // Remove HEAD section entirely (including all content)
  result = result.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
  
  // Remove STYLE, SCRIPT, TITLE sections
  result = result.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  result = result.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  result = result.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '');
  
  // Remove HTML comments (including conditional comments)
  result = result.replace(/<!--[\s\S]*?-->/g, '');
  result = result.replace(/<!\[if[^>]*\]>[\s\S]*?<!\[endif\]>/gi, '');
  
  // Convert common block tags to newlines for readability
  result = result.replace(/<\/?(p|div|br|tr|li|td|th|h[1-6])[^>]*>/gi, '\n');
  
  // AGGRESSIVE: Strip ALL remaining HTML tags (including malformed and namespaced)
  result = result.replace(/<[^>]+>/g, ' ');
  result = result.replace(/<[^>]*$/g, ''); // Remove incomplete tags at end
  result = result.replace(/^[^<]*>/g, ''); // Remove incomplete tags at start
  
  // Remove any leftover angle brackets
  result = result.replace(/[<>]/g, ' ');
  
  // Decode HTML entities
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
    .replace(/&[a-z]+;/gi, ' '); // Remove remaining entities
  
  // Remove Google Group / mailing list footers
  result = result.replace(/To unsubscribe from this group[\s\S]*?@[^\s.]+\.[^\s]+/gi, '');
  result = result.replace(/You received this message because you are subscribed[\s\S]*/gi, '');
  result = result.replace(/--\s*\nYou received this message[\s\S]*/gi, '');
  result = result.replace(/Unsubscribe from this group[\s\S]*/gi, '');
  
  // Remove common email signature delimiters and content after them
  result = result.replace(/\n--\s*\n[\s\S]*/g, '');
  
  // Clean excessive whitespace
  result = result.replace(/[\r\n\t]+/g, ' ');
  result = result.replace(/\s+/g, ' ');
  result = result.trim();
  
  // Truncate to max length
  if (result.length > maxLength) {
    result = result.substring(0, maxLength).trim() + '...';
  }
  
  return result;
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

    // Check if we have a channel configured
    const channelId = integration.default_channel_id;
    if (!channelId) {
      console.log('No default channel configured for organization:', organization_id);
      return new Response(
        JSON.stringify({ skipped: true, reason: 'No channel configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the Slack message using Block Kit
    // Determine emoji based on channel or event type
    const channelLabel = CHANNEL_LABELS[channel || 'email'] || 'Email';
    const emoji = CHANNEL_EMOJIS[channel || 'email'] || EVENT_EMOJIS[event_type] || '📨';
    
    // Build dynamic title based on event type and channel
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

    // Build fallback text for native push notifications (Mac/iPhone)
    // This appears in system notifications but NOT in the Slack channel
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

    // Customer info with subject - always show both
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

    // Message preview - always show if available, use 180 chars
    if (preview_text && config.include_message_preview !== false) {
      const cleanedPreview = cleanPreviewText(preview_text, 180);
      
      if (cleanedPreview) {
        // Escape Slack markdown special characters in preview
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

    // Mention info - use real Slack <@ID> tags when available
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
        elements: [
          {
            type: 'mrkdwn',
            text: mentionText,
          },
        ],
      });
    }

    // Action button
    if (conversation_id) {
      // Get the app URL from environment or construct from Supabase URL
      const appUrl = Deno.env.get('APP_URL') || 'https://support.noddi.co';
      
      // Construct URL with query params (inbox + conversation)
      const conversationUrl = inbox_id 
        ? `${appUrl}/?inbox=${inbox_id}&c=${conversation_id}`
        : `${appUrl}/?c=${conversation_id}`;
      
      attachmentBlocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '👀 View Conversation',
              emoji: true,
            },
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
        'Authorization': `Bearer ${integration.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        text: fallbackText, // Required for native push notifications on Mac/iPhone
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

    if (!slackResult.ok) {
      console.error('Slack API error:', slackResult.error);
      return new Response(
        JSON.stringify({ error: slackResult.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Slack notification sent for ${event_type} to channel ${channelId}`);

    // === Critical Triage Detection ===
    const criticalConfig = config;
    const criticalChannelId = integration.critical_channel_id;
    
    if (criticalConfig.critical_alerts_enabled && criticalChannelId && criticalChannelId !== channelId) {
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
      const isPriorityUrgent = false; // Could be extended with conversation priority lookup

      if (matchedKeyword || isPriorityUrgent) {
        const criticalBlocks = [
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
            } as any);
          }
        }

        if (matchedKeyword) {
          criticalBlocks.push({
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Triggered by keyword: \`${matchedKeyword}\``,
              },
            ],
          } as any);
        }

        if (conversation_id) {
          const appUrl = Deno.env.get('APP_URL') || 'https://support.noddi.co';
          const conversationUrl = inbox_id
            ? `${appUrl}/?inbox=${inbox_id}&c=${conversation_id}`
            : `${appUrl}/?c=${conversation_id}`;
          criticalBlocks.push({
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: '👀 View Conversation', emoji: true },
                url: conversationUrl,
              },
            ],
          } as any);
        }

        try {
          // Use secondary workspace token if available, otherwise fall back to primary
          const criticalToken = integration.secondary_access_token || integration.access_token;
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
            console.log(`Critical alert sent to ${criticalChannelId} (keyword: ${matchedKeyword})`);
          }
        } catch (critErr) {
          console.error('Failed to send critical alert:', critErr);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, ts: slackResult.ts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending Slack notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
