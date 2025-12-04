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
          const customerName = (conv.customer as any)?.full_name || 'Unknown';
          const inboxName = (conv.inbox as any)?.name || 'Inbox';

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
        breachesSent
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
