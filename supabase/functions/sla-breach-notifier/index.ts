import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * SLA Breach Notifier - Scheduled Edge Function
 * Runs every 15 minutes to check for:
 * 1. Upcoming SLA breaches (within 2 hours) - sends warning
 * 2. Current SLA breaches - sends urgent notification
 * 
 * Prevents duplicate notifications by tracking in notification data
 */

// Helper function to send Slack notification (non-blocking)
async function sendSlackNotification(payload: {
  organization_id: string;
  event_type: 'sla_warning';
  conversation_id: string;
  customer_name?: string;
  customer_email?: string;
  subject?: string;
  inbox_name?: string;
}) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    await fetch(`${supabaseUrl}/functions/v1/send-slack-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`
      },
      body: JSON.stringify(payload)
    });
    console.log(`📱 Slack notification sent for ${payload.event_type}`);
  } catch (error) {
    // Non-blocking - just log the error
    console.log('Slack notification failed (non-blocking):', error);
  }
}

Deno.serve(async (req: Request) => {
  console.log('🚨 SLA Breach Notifier started at:', new Date().toISOString());
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Find conversations approaching SLA breach (within 2 hours)
    const { data: approachingBreach, error: approachingError } = await supabase
      .from('conversations')
      .select(`
        id,
        subject,
        sla_breach_at,
        assigned_to_id,
        organization_id,
        customer:customers(full_name, email),
        inbox:inboxes(name)
      `)
      .is('first_response_at', null)
      .in('status', ['open', 'pending'])
      .gt('sla_breach_at', now.toISOString())
      .lte('sla_breach_at', twoHoursFromNow.toISOString());

    if (approachingError) {
      console.error('Error fetching approaching breaches:', approachingError);
    }

    // Find conversations that have breached SLA
    const { data: breached, error: breachedError } = await supabase
      .from('conversations')
      .select(`
        id,
        subject,
        sla_breach_at,
        assigned_to_id,
        organization_id,
        customer:customers(full_name, email),
        inbox:inboxes(name)
      `)
      .is('first_response_at', null)
      .in('status', ['open', 'pending'])
      .lt('sla_breach_at', now.toISOString());

    if (breachedError) {
      console.error('Error fetching breached conversations:', breachedError);
    }

    let warningsSent = 0;
    let breachesSent = 0;
    let slackNotificationsSent = 0;

    // Process approaching breaches (warnings)
    if (approachingBreach && approachingBreach.length > 0) {
      console.log(`📢 Found ${approachingBreach.length} conversations approaching SLA breach`);
      
      for (const conv of approachingBreach) {
        if (!conv.assigned_to_id) continue;

        // Check if warning already sent for this conversation
        const { data: existingNotif } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', conv.assigned_to_id)
          .eq('type', 'sla_warning')
          .contains('data', { conversation_id: conv.id })
          .gte('created_at', new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString())
          .maybeSingle();

        if (existingNotif) {
          console.log(`⏭️ Warning already sent for conversation ${conv.id}`);
          continue;
        }

        const timeUntilBreach = Math.round((new Date(conv.sla_breach_at).getTime() - now.getTime()) / (60 * 1000));
        const customerName = (conv.customer as any)?.full_name || 'Unknown';
        const customerEmail = (conv.customer as any)?.email;
        const inboxName = (conv.inbox as any)?.name || 'Inbox';

        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: conv.assigned_to_id,
            title: `⚠️ SLA Warning: ${timeUntilBreach} minutes remaining`,
            message: `"${conv.subject || 'No subject'}" from ${customerName} in ${inboxName} will breach SLA soon`,
            type: 'sla_warning',
            data: {
              conversation_id: conv.id,
              customer_name: customerName,
              inbox_name: inboxName,
              sla_breach_at: conv.sla_breach_at,
              urgency: 'high'
            }
          });

        if (notifError) {
          console.error(`Error creating warning for ${conv.id}:`, notifError);
        } else {
          warningsSent++;
          console.log(`✅ Warning sent for conversation ${conv.id}`);
          
          // Send Slack notification (non-blocking)
          sendSlackNotification({
            organization_id: conv.organization_id,
            event_type: 'sla_warning',
            conversation_id: conv.id,
            customer_name: customerName,
            customer_email: customerEmail,
            subject: conv.subject,
            inbox_name: inboxName
          });
          slackNotificationsSent++;
        }
      }
    }

    // Process breached conversations (urgent)
    if (breached && breached.length > 0) {
      console.log(`🚨 Found ${breached.length} conversations with breached SLA`);
      
      for (const conv of breached) {
        // If no assignee, notify all admins in the organization
        let userIdsToNotify: string[] = [];
        
        if (conv.assigned_to_id) {
          userIdsToNotify.push(conv.assigned_to_id);
        }

        // Also notify managers/admins for breached SLAs
        const { data: admins } = await supabase
          .from('organization_memberships')
          .select('user_id')
          .eq('organization_id', conv.organization_id)
          .in('role', ['admin', 'super_admin'])
          .eq('status', 'active');

        if (admins) {
          for (const admin of admins) {
            if (admin.user_id && !userIdsToNotify.includes(admin.user_id)) {
              userIdsToNotify.push(admin.user_id);
            }
          }
        }

        const customerName = (conv.customer as any)?.full_name || 'Unknown';
        const customerEmail = (conv.customer as any)?.email;
        const inboxName = (conv.inbox as any)?.name || 'Inbox';
        let slackSentForThisConversation = false;

        for (const userId of userIdsToNotify) {
          // Check if breach notification already sent today for this conversation
          const { data: existingNotif } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', userId)
            .eq('type', 'sla_breach')
            .contains('data', { conversation_id: conv.id })
            .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
            .maybeSingle();

          if (existingNotif) {
            console.log(`⏭️ Breach notification already sent for conversation ${conv.id} to user ${userId}`);
            continue;
          }

          const breachDuration = Math.round((now.getTime() - new Date(conv.sla_breach_at).getTime()) / (60 * 1000));

          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: userId,
              title: `🚨 SLA Breached: ${breachDuration} minutes overdue`,
              message: `"${conv.subject || 'No subject'}" from ${customerName} in ${inboxName} has breached SLA`,
              type: 'sla_breach',
              data: {
                conversation_id: conv.id,
                customer_name: customerName,
                inbox_name: inboxName,
                sla_breach_at: conv.sla_breach_at,
                breach_duration_minutes: breachDuration,
                urgency: 'urgent'
              }
            });

          if (notifError) {
            console.error(`Error creating breach notification for ${conv.id}:`, notifError);
          } else {
            breachesSent++;
            console.log(`✅ Breach notification sent for conversation ${conv.id} to user ${userId}`);
            
            // Send Slack notification only once per conversation (not per user)
            if (!slackSentForThisConversation) {
              sendSlackNotification({
                organization_id: conv.organization_id,
                event_type: 'sla_warning', // Using sla_warning event type for Slack
                conversation_id: conv.id,
                customer_name: customerName,
                customer_email: customerEmail,
                subject: conv.subject,
                inbox_name: inboxName
              });
              slackNotificationsSent++;
              slackSentForThisConversation = true;
            }
          }
        }
      }
    }

    const result = {
      success: true,
      timestamp: now.toISOString(),
      stats: {
        approachingBreachCount: approachingBreach?.length || 0,
        breachedCount: breached?.length || 0,
        warningsSent,
        breachesSent,
        slackNotificationsSent
      }
    };

    console.log('✅ SLA Breach Notifier completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ SLA Breach Notifier error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : String(error) 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});