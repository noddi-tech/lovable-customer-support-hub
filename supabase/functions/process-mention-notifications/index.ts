import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MentionContext {
  type: 'internal_note' | 'ticket_comment' | 'customer_note' | 'call_note';
  conversation_id?: string;
  ticket_id?: string;
  customer_id?: string;
  call_id?: string;
  message_id?: string;
  organization_id?: string;
}

interface RequestBody {
  mentionedUserIds: string[];
  mentionerUserId: string;
  mentionerName: string;
  content: string;
  context: MentionContext;
}

// Helper: resolve Slack user ID by email
async function resolveSlackUserId(accessToken: string, email: string): Promise<string | null> {
  try {
    const res = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (data.ok && data.user?.id) {
      return data.user.id;
    }
    console.log(`Slack user not found for ${email}: ${data.error || 'no user'}`);
    return null;
  } catch (e) {
    console.log(`Slack lookup failed for ${email}:`, e);
    return null;
  }
}

// Helper: send personal Slack DM to a mentioned user
async function sendSlackDM(params: {
  accessToken: string;
  slackUserId: string;
  userEmail: string;
  mentionerName: string;
  mentionerSlackId?: string | null;
  previewText: string;
  contextType: string;
  conversationUrl?: string;
  subject?: string;
  customerName?: string;
}) {
  try {
    // Step 1: Open a DM channel with the user
    const openRes = await fetch('https://slack.com/api/conversations.open', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ users: params.slackUserId }),
    });
    const openData = await openRes.json();
    if (!openData.ok) {
      console.log(`Failed to open DM channel for ${params.userEmail}: ${openData.error}`);
      return;
    }
    const dmChannelId = openData.channel?.id;
    if (!dmChannelId) {
      console.log(`No DM channel ID returned for ${params.userEmail}`);
      return;
    }

    const contextLabel = params.contextType === 'internal_note' ? 'a note' 
      : params.contextType === 'ticket_comment' ? 'a ticket comment'
      : params.contextType === 'customer_note' ? 'a customer note'
      : params.contextType === 'call_note' ? 'a call note' : 'a message';

    // Use <@ID> for mentioner if available, otherwise plain name
    const mentionerDisplay = params.mentionerSlackId 
      ? `<@${params.mentionerSlackId}>` 
      : `*${params.mentionerName}*`;

    const blocks: any[] = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `📣 ${mentionerDisplay} mentioned you in ${contextLabel}`,
        },
      },
    ];

    // Add context line with subject and customer if available
    const contextParts: string[] = [];
    if (params.subject) {
      contextParts.push(`*Subject:* ${params.subject}`);
    }
    if (params.customerName) {
      contextParts.push(`*Customer:* ${params.customerName}`);
    }
    if (contextParts.length > 0) {
      blocks.push({
        type: 'context',
        elements: [{
          type: 'mrkdwn',
          text: contextParts.join('  |  '),
        }],
      });
    }

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `> ${params.previewText}`,
      },
    });

    if (params.conversationUrl) {
      blocks.push({
        type: 'actions',
        elements: [{
          type: 'button',
          text: { type: 'plain_text', text: '👀 View', emoji: true },
          url: params.conversationUrl,
        }],
      });
    }

    const fallbackMentioner = params.mentionerSlackId ? `<@${params.mentionerSlackId}>` : params.mentionerName;

    // Step 2: Post message to the DM channel
    const dmRes = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: dmChannelId,
        text: `${fallbackMentioner} mentioned you: ${params.previewText}`,
        blocks,
        unfurl_links: false,
      }),
    });
    
    const dmData = await dmRes.json();
    if (dmData.ok) {
      console.log(`✉️ Slack DM sent to ${params.userEmail}`);
    } else {
      console.log(`Slack DM failed for ${params.userEmail}: ${dmData.error}`);
    }
  } catch (error) {
    console.log('Slack DM failed (non-blocking):', error);
  }
}

// Helper: send email notification for a mention
async function sendMentionEmail(params: {
  supabaseUrl: string;
  serviceKey: string;
  toEmail: string;
  mentionerName: string;
  previewText: string;
  contextType: string;
  linkUrl?: string;
}) {
  try {
    const contextLabel = params.contextType === 'internal_note' ? 'a note'
      : params.contextType === 'ticket_comment' ? 'a ticket comment'
      : params.contextType === 'customer_note' ? 'a customer note'
      : params.contextType === 'call_note' ? 'a call note' : 'a message';

    const subject = `${params.mentionerName} mentioned you in ${contextLabel}`;
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 500px;">
        <p><strong>${params.mentionerName}</strong> mentioned you in ${contextLabel}:</p>
        <blockquote style="border-left: 3px solid #3b82f6; margin: 16px 0; padding: 8px 16px; color: #374151;">
          ${params.previewText}
        </blockquote>
        ${params.linkUrl ? `<p><a href="${params.linkUrl}" style="display:inline-block;padding:8px 20px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:6px;">View in App</a></p>` : ''}
      </div>
    `;

    await fetch(`${params.supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${params.serviceKey}`,
      },
      body: JSON.stringify({
        to: params.toEmail,
        subject,
        html: htmlBody,
      }),
    });
    console.log(`📧 Mention email sent to ${params.toEmail}`);
  } catch (error) {
    console.log('Email notification failed (non-blocking):', error);
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: RequestBody = await req.json();
    const { mentionedUserIds, mentionerUserId, mentionerName, content, context } = body;

    console.log(`Processing mentions for ${mentionedUserIds.length} users from ${mentionerName}`);

    // Get organization_id from context or fetch it
    let organizationId = context.organization_id;
    let conversationSubject: string | undefined;
    let conversationCustomerId: string | undefined;
    
    if (context.conversation_id) {
      const { data: conv } = await supabase
        .from('conversations')
        .select('organization_id, subject, customer_id')
        .eq('id', context.conversation_id)
        .single();
      if (!organizationId) organizationId = conv?.organization_id;
      conversationSubject = conv?.subject || undefined;
      conversationCustomerId = conv?.customer_id || undefined;
    }
    
    if (!organizationId && context.ticket_id) {
      const { data: ticket } = await supabase
        .from('service_tickets')
        .select('organization_id')
        .eq('id', context.ticket_id)
        .single();
      organizationId = ticket?.organization_id;
    }

    // Fetch customer name if we have a customer_id
    let customerName: string | undefined;
    const customerId = conversationCustomerId || context.customer_id;
    if (customerId) {
      const { data: customer } = await supabase
        .from('customers')
        .select('full_name, email')
        .eq('id', customerId)
        .single();
      customerName = customer?.full_name || customer?.email || undefined;
    }

    // Get Slack integration for DMs
    let slackAccessToken: string | null = null;
    if (organizationId) {
      const { data: slackIntegration } = await supabase
        .from('slack_integrations')
        .select('access_token')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single();
      slackAccessToken = slackIntegration?.access_token || null;
    }

    const getContextInfo = () => {
      switch (context.type) {
        case 'internal_note':
          return { title: 'You were mentioned in a note', linkType: 'conversation' };
        case 'ticket_comment':
          return { title: 'You were mentioned in a ticket comment', linkType: 'ticket' };
        case 'customer_note':
          return { title: 'You were mentioned in a customer note', linkType: 'customer' };
        case 'call_note':
          return { title: 'You were mentioned in a call note', linkType: 'call' };
        default:
          return { title: 'You were mentioned', linkType: 'general' };
      }
    };

    const contextInfo = getContextInfo();
    const truncatedContent = content.length > 150 ? content.slice(0, 150) + '...' : content;
    
    // Build a link URL for notifications
    const appUrl = Deno.env.get('APP_URL') || 'https://support.noddi.co';
    let linkUrl: string | undefined;
    if (context.conversation_id) {
      linkUrl = `${appUrl}/c/${context.conversation_id}`;
    } else if (context.ticket_id) {
      linkUrl = `${appUrl}/service-tickets?ticket=${context.ticket_id}`;
    }

    // Batch-resolve all Slack user IDs upfront (mentioned users + mentioner)
    const slackIdMap = new Map<string, string>(); // email -> slackUserId
    let mentionerSlackId: string | null = null;

    if (slackAccessToken) {
      const allUserIds = [...new Set([...mentionedUserIds.filter(id => id !== mentionerUserId), mentionerUserId])];
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('user_id', allUserIds);

      if (allProfiles) {
        const lookupPromises = allProfiles
          .filter(p => p.email)
          .map(async (p) => {
            const slackId = await resolveSlackUserId(slackAccessToken!, p.email!);
            if (slackId) {
              slackIdMap.set(p.email!, slackId);
              if (p.user_id === mentionerUserId) {
                mentionerSlackId = slackId;
              }
            }
          });
        await Promise.all(lookupPromises);
      }
      console.log(`Resolved ${slackIdMap.size} Slack IDs (mentioner: ${mentionerSlackId || 'not found'})`);
    }

    // Process each mentioned user
    const notificationPromises = mentionedUserIds
      .filter(userId => userId !== mentionerUserId)
      .map(async (userId) => {
        try {
          // Get preferences and profile in parallel
          const [prefsResult, profileResult] = await Promise.all([
            supabase
              .from('notification_preferences')
              .select('app_on_mention, email_on_mention')
              .eq('user_id', userId)
              .single(),
            supabase
              .from('profiles')
              .select('full_name, email')
              .eq('user_id', userId)
              .single(),
          ]);

          const preferences = prefsResult.data;
          const profile = profileResult.data;
          const appEnabled = preferences?.app_on_mention ?? true;
          const emailEnabled = preferences?.email_on_mention ?? true;

          // 1. Create in-app notification
          if (appEnabled) {
            const { error: notifError } = await supabase
              .from('notifications')
              .insert({
                user_id: userId,
                type: 'mention',
                title: contextInfo.title,
                message: `${mentionerName} mentioned you: "${truncatedContent}"`,
                is_read: false,
                data: {
                  mentioned_by_id: mentionerUserId,
                  mentioned_by_name: mentionerName,
                  context_type: context.type,
                  conversation_id: context.conversation_id,
                  ticket_id: context.ticket_id,
                  customer_id: context.customer_id,
                  call_id: context.call_id,
                  message_id: context.message_id,
                  original_content: content,
                },
              });

            if (notifError) {
              console.error(`Failed to create notification for user ${userId}:`, notifError);
            } else {
              console.log(`✅ In-app notification for user ${userId}`);
            }
          }

          // 2. Send personal Slack DM with context
          const userSlackId = profile?.email ? slackIdMap.get(profile.email) : null;
          if (slackAccessToken && userSlackId && profile?.email) {
            await sendSlackDM({
              accessToken: slackAccessToken,
              slackUserId: userSlackId,
              userEmail: profile.email,
              mentionerName,
              mentionerSlackId,
              previewText: truncatedContent,
              contextType: context.type,
              conversationUrl: linkUrl,
              subject: conversationSubject,
              customerName,
            });
          }

          // 3. Send email notification if opted in
          if (emailEnabled && profile?.email) {
            sendMentionEmail({
              supabaseUrl,
              serviceKey: supabaseServiceKey,
              toEmail: profile.email,
              mentionerName,
              previewText: truncatedContent,
              contextType: context.type,
              linkUrl,
            });
          }
        } catch (err) {
          console.error(`Error processing mention for user ${userId}:`, err);
        }
      });

    await Promise.all(notificationPromises);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: mentionedUserIds.filter(id => id !== mentionerUserId).length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in process-mention-notifications:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
