import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SlackNotificationRequest {
  organization_id: string;
  event_type: 'new_conversation' | 'customer_reply' | 'assignment' | 'mention' | 'sla_warning' | 'conversation_closed';
  conversation_id?: string;
  customer_name?: string;
  customer_email?: string;
  subject?: string;
  preview_text?: string;
  assigned_to_name?: string;
  assigned_to_email?: string;
  mentioned_user_name?: string;
  inbox_name?: string;
}

const EVENT_EMOJIS: Record<string, string> = {
  new_conversation: '🆕',
  customer_reply: '💬',
  assignment: '👤',
  mention: '📣',
  sla_warning: '⚠️',
  conversation_closed: '✅',
};

const EVENT_COLORS: Record<string, string> = {
  new_conversation: '#22c55e', // green
  customer_reply: '#3b82f6', // blue
  assignment: '#8b5cf6', // purple
  mention: '#f59e0b', // amber
  sla_warning: '#ef4444', // red
  conversation_closed: '#6b7280', // gray
};

const EVENT_TITLES: Record<string, string> = {
  new_conversation: 'New Conversation',
  customer_reply: 'Customer Reply',
  assignment: 'Assigned to You',
  mention: 'You Were Mentioned',
  sla_warning: 'SLA Warning',
  conversation_closed: 'Conversation Closed',
};

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
      customer_name,
      customer_email,
      subject,
      preview_text,
      assigned_to_name,
      mentioned_user_name,
      inbox_name,
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
    const emoji = EVENT_EMOJIS[event_type] || '📨';
    const color = EVENT_COLORS[event_type] || '#3b82f6';
    const title = EVENT_TITLES[event_type] || 'Notification';

    const blocks: any[] = [];
    const attachmentBlocks: any[] = [];

    // Header section
    attachmentBlocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${emoji} *${title}*${inbox_name ? ` in ${inbox_name}` : ''}`,
      },
    });

    // Customer info
    if (customer_name || customer_email) {
      attachmentBlocks.push({
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*From:*\n${customer_name || 'Unknown'}${customer_email ? ` (${customer_email})` : ''}`,
          },
          ...(subject ? [{
            type: 'mrkdwn',
            text: `*Subject:*\n${subject}`,
          }] : []),
        ],
      });
    }

    // Message preview
    if (preview_text && config.include_message_preview !== false) {
      const truncatedPreview = preview_text.length > 200 
        ? preview_text.substring(0, 200) + '...' 
        : preview_text;
      
      attachmentBlocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `> ${truncatedPreview}`,
        },
      });
    }

    // Assignment or mention info
    if (event_type === 'assignment' && assigned_to_name) {
      attachmentBlocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `👤 Assigned to *${assigned_to_name}*`,
          },
        ],
      });
    }

    if (event_type === 'mention' && mentioned_user_name) {
      attachmentBlocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `📣 *${mentioned_user_name}* was mentioned`,
          },
        ],
      });
    }

    // Action button
    if (conversation_id) {
      // Get the app URL from environment or construct from Supabase URL
      const appUrl = Deno.env.get('APP_URL') || 'https://support.noddi.co';
      
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
            url: `${appUrl}/conversations/${conversation_id}`,
            style: 'primary',
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
        blocks: blocks,
        attachments: [
          {
            color: color,
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
