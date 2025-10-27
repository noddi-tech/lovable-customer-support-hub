import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  ticketId: string;
  eventType: 'created' | 'status_changed' | 'assigned' | 'commented' | 'overdue';
  recipientUserId?: string;
  recipientEmail?: string;
  additionalData?: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: NotificationRequest = await req.json();
    const { ticketId, eventType, recipientUserId, recipientEmail, additionalData } = body;

    // Fetch ticket details
    const { data: ticket, error: ticketError } = await supabaseClient
      .from('service_tickets')
      .select(`
        *,
        customer:customers(full_name, email),
        assigned_to:profiles!service_tickets_assigned_to_id_fkey(full_name, email)
      `)
      .eq('id', ticketId)
      .single();

    if (ticketError) throw ticketError;

    // Determine recipient
    let recipientData: { userId?: string; email?: string; name?: string } = {};
    
    if (recipientUserId) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('email, full_name')
        .eq('user_id', recipientUserId)
        .single();
      
      recipientData = {
        userId: recipientUserId,
        email: profile?.email || recipientEmail,
        name: profile?.full_name,
      };
    } else if (recipientEmail) {
      recipientData = { email: recipientEmail };
    } else if (ticket.assigned_to_id) {
      recipientData = {
        userId: ticket.assigned_to_id,
        email: ticket.assigned_to?.email,
        name: ticket.assigned_to?.full_name,
      };
    }

    // Check notification preferences
    if (recipientData.userId) {
      const { data: prefs } = await supabaseClient
        .from('notification_preferences')
        .select('*')
        .eq('user_id', recipientData.userId)
        .single();

      if (prefs && !prefs.email_enabled) {
        console.log('Email notifications disabled for user');
        return new Response(JSON.stringify({ message: 'Notifications disabled' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if it's quiet hours
      if (prefs?.quiet_hours_start && prefs?.quiet_hours_end) {
        const now = new Date();
        const currentHour = now.getHours();
        const startHour = parseInt(prefs.quiet_hours_start.split(':')[0]);
        const endHour = parseInt(prefs.quiet_hours_end.split(':')[0]);
        
        if (currentHour >= startHour || currentHour < endHour) {
          console.log('Within quiet hours, skipping notification');
          return new Response(JSON.stringify({ message: 'Quiet hours active' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Build email content based on event type
    let subject = '';
    let body = '';

    switch (eventType) {
      case 'created':
        subject = `New Service Ticket: ${ticket.ticket_number}`;
        body = `A new service ticket has been created:\n\nTitle: ${ticket.title}\nPriority: ${ticket.priority}\nStatus: ${ticket.status}\n\nDescription:\n${ticket.description}`;
        break;
      
      case 'status_changed':
        subject = `Ticket Status Updated: ${ticket.ticket_number}`;
        body = `Ticket ${ticket.ticket_number} status has changed to: ${ticket.status}\n\nTitle: ${ticket.title}`;
        break;
      
      case 'assigned':
        subject = `Ticket Assigned to You: ${ticket.ticket_number}`;
        body = `You have been assigned to ticket ${ticket.ticket_number}\n\nTitle: ${ticket.title}\nPriority: ${ticket.priority}\n\nDescription:\n${ticket.description}`;
        break;
      
      case 'commented':
        subject = `New Comment on Ticket: ${ticket.ticket_number}`;
        body = `A new comment was added to ticket ${ticket.ticket_number}\n\nTitle: ${ticket.title}`;
        break;
      
      case 'overdue':
        subject = `⚠️ Ticket Overdue: ${ticket.ticket_number}`;
        body = `Ticket ${ticket.ticket_number} is now overdue!\n\nTitle: ${ticket.title}\nDue Date: ${ticket.due_date}\nPriority: ${ticket.priority}`;
        break;
    }

    // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
    console.log('Would send email notification:', {
      to: recipientData.email,
      subject,
      body,
      ticketId,
      eventType,
    });

    // Create in-app notification
    if (recipientData.userId) {
      await supabaseClient.from('notifications').insert({
        user_id: recipientData.userId,
        type: 'service_ticket',
        title: subject,
        message: body.substring(0, 200),
        data: {
          ticketId,
          eventType,
          ...additionalData,
        },
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Notification sent',
        recipient: recipientData.email,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Notification error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
