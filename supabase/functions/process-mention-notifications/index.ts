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
  organization_id?: string;
}

interface RequestBody {
  mentionedUserIds: string[];
  mentionerUserId: string;
  mentionerName: string;
  content: string;
  context: MentionContext;
}

// Helper function to send Slack notification (non-blocking)
async function sendSlackNotification(payload: {
  organization_id: string;
  event_type: 'mention';
  conversation_id?: string;
  mentioned_user_name: string;
  preview_text?: string;
}) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    await fetch(`${supabaseUrl}/functions/v1/send-slack-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`
      },
      body: JSON.stringify(payload)
    });
    console.log(`📱 Slack mention notification sent`);
  } catch (error) {
    // Non-blocking - just log the error
    console.log('Slack notification failed (non-blocking):', error);
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
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
    
    if (!organizationId && context.conversation_id) {
      const { data: conv } = await supabase
        .from('conversations')
        .select('organization_id')
        .eq('id', context.conversation_id)
        .single();
      organizationId = conv?.organization_id;
    }
    
    if (!organizationId && context.ticket_id) {
      const { data: ticket } = await supabase
        .from('service_tickets')
        .select('organization_id')
        .eq('id', context.ticket_id)
        .single();
      organizationId = ticket?.organization_id;
    }

    // Get context-specific title and link info
    const getContextInfo = () => {
      switch (context.type) {
        case 'internal_note':
          return {
            title: 'You were mentioned in a note',
            linkType: 'conversation',
          };
        case 'ticket_comment':
          return {
            title: 'You were mentioned in a ticket comment',
            linkType: 'ticket',
          };
        case 'customer_note':
          return {
            title: 'You were mentioned in a customer note',
            linkType: 'customer',
          };
        case 'call_note':
          return {
            title: 'You were mentioned in a call note',
            linkType: 'call',
          };
        default:
          return {
            title: 'You were mentioned',
            linkType: 'general',
          };
      }
    };

    const contextInfo = getContextInfo();
    
    // Truncate content for notification message
    const truncatedContent = content.length > 150 
      ? content.slice(0, 150) + '...' 
      : content;

    // Track if Slack notification was sent (only send once per mention event)
    let slackNotificationSent = false;

    // Process each mentioned user
    const notificationPromises = mentionedUserIds
      .filter(userId => userId !== mentionerUserId) // Don't notify if you mention yourself
      .map(async (userId) => {
        try {
          // Check user's notification preferences
          const { data: preferences } = await supabase
            .from('notification_preferences')
            .select('app_on_mention, email_on_mention')
            .eq('user_id', userId)
            .single();

          // Default to true if no preferences found
          const appEnabled = preferences?.app_on_mention ?? true;
          const emailEnabled = preferences?.email_on_mention ?? false;

          // Get mentioned user's name for Slack notification
          const { data: mentionedUser } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', userId)
            .single();

          // Create in-app notification if enabled
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
                  original_content: content,
                },
              });

            if (notifError) {
              console.error(`Failed to create notification for user ${userId}:`, notifError);
            } else {
              console.log(`Created in-app notification for user ${userId}`);
              
              // Send Slack notification (only once per mention event, not per user)
              if (!slackNotificationSent && organizationId) {
                sendSlackNotification({
                  organization_id: organizationId,
                  event_type: 'mention',
                  conversation_id: context.conversation_id,
                  mentioned_user_name: mentionedUser?.full_name || 'Someone',
                  preview_text: truncatedContent
                });
                slackNotificationSent = true;
              }
            }
          }

          // TODO: Implement email notifications when email service is set up
          if (emailEnabled) {
            console.log(`Email notification enabled for user ${userId} - email sending not implemented yet`);
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
        slackNotificationSent
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