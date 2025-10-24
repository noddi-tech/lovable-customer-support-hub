import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CallNotificationPayload {
  callId: string;
  eventType: 'call_started' | 'call_missed' | 'call_ended' | 'voicemail_received';
  customerPhone: string;
  customerName?: string;
  assignedToId?: string;
  organizationId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: CallNotificationPayload = await req.json();
    const { callId, eventType, customerPhone, customerName, assignedToId, organizationId } = payload;

    // Determine notification title and message based on event type
    let title = '';
    let message = '';
    let notificationType: 'info' | 'warning' | 'success' = 'info';

    switch (eventType) {
      case 'call_started':
        title = 'Incoming Call';
        message = `Call from ${customerName || customerPhone}`;
        break;
      case 'call_missed':
        title = 'Missed Call';
        message = `You missed a call from ${customerName || customerPhone}`;
        notificationType = 'warning';
        break;
      case 'call_ended':
        title = 'Call Ended';
        message = `Call with ${customerName || customerPhone} has ended`;
        notificationType = 'success';
        break;
      case 'voicemail_received':
        title = 'New Voicemail';
        message = `Voicemail from ${customerName || customerPhone}`;
        notificationType = 'info';
        break;
    }

    // Determine who to notify
    let targetUserId = assignedToId;
    
    // If not assigned, notify all agents in the organization
    if (!targetUserId) {
      const { data: agents } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (agents && agents.length > 0) {
        // Create notification for all agents
        const notifications = agents.map(agent => ({
          user_id: agent.user_id,
          title,
          message,
          type: notificationType,
          data: {
            call_id: callId,
            event_type: eventType,
            customer_phone: customerPhone,
            customer_name: customerName,
          },
        }));

        const { error: insertError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (insertError) throw insertError;
      }
    } else {
      // Create notification for assigned user only
      const { error: insertError } = await supabase
        .from('notifications')
        .insert({
          user_id: targetUserId,
          title,
          message,
          type: notificationType,
          data: {
            call_id: callId,
            event_type: eventType,
            customer_phone: customerPhone,
            customer_name: customerName,
          },
        });

      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notification created' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error creating call notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
