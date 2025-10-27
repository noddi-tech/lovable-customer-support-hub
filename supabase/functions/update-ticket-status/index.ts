import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

async function logSystemEvent(
  eventType: string,
  severity: 'debug' | 'info' | 'warn' | 'error' | 'critical',
  message: string,
  context: any = {}
) {
  try {
    await supabase.from('system_events_log').insert({
      event_type: eventType,
      severity,
      component: 'edge_function',
      function_name: 'update-ticket-status',
      message,
      context,
    });
  } catch (err) {
    console.error('Failed to log system event:', err);
  }
}

interface UpdateStatusRequest {
  ticketId: string;
  newStatus: 'open' | 'acknowledged' | 'scheduled' | 'in_progress' | 'awaiting_parts' | 'completed' | 'verified' | 'closed' | 'cancelled';
  comment?: string;
  notifyCustomer?: boolean;
  assignedToId?: string;
  scheduledFor?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      await logSystemEvent('auth_failed', 'warn', 'Authentication failed', { error: authError?.message });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, full_name')
      .eq('user_id', user.id)
      .single();

    if (!profile?.organization_id) {
      return new Response(
        JSON.stringify({ error: 'User organization not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: UpdateStatusRequest = await req.json();

    if (!body.ticketId || !body.newStatus) {
      return new Response(
        JSON.stringify({ error: 'ticketId and newStatus are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current ticket
    const { data: currentTicket, error: fetchError } = await supabase
      .from('service_tickets')
      .select('*, customer:customers(*), assigned_to:profiles!service_tickets_assigned_to_id_fkey(*)')
      .eq('id', body.ticketId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (fetchError || !currentTicket) {
      await logSystemEvent('ticket_not_found', 'warn', `Ticket ${body.ticketId} not found`, {
        ticket_id: body.ticketId,
        user_id: user.id,
      });
      return new Response(
        JSON.stringify({ error: 'Ticket not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update ticket
    const updateData: any = {
      status: body.newStatus,
    };

    if (body.assignedToId) {
      updateData.assigned_to_id = body.assignedToId;
    }

    if (body.scheduledFor) {
      updateData.scheduled_for = body.scheduledFor;
    }

    const { data: updatedTicket, error: updateError } = await supabase
      .from('service_tickets')
      .update(updateData)
      .eq('id', body.ticketId)
      .select(`
        *,
        customer:customers(*),
        assigned_to:profiles!service_tickets_assigned_to_id_fkey(user_id, full_name, avatar_url)
      `)
      .single();

    if (updateError) {
      await logSystemEvent('ticket_update_failed', 'error', 'Failed to update ticket status', {
        error: updateError.message,
        ticket_id: body.ticketId,
        user_id: user.id,
      });
      throw updateError;
    }

    // Create event with comment
    await supabase.from('service_ticket_events').insert({
      ticket_id: body.ticketId,
      event_type: 'status_changed',
      old_value: currentTicket.status,
      new_value: body.newStatus,
      comment: body.comment,
      triggered_by_id: user.id,
      triggered_by_source: 'manual',
    });

    // Notify assigned user
    if (updatedTicket.assigned_to_id && updatedTicket.assigned_to_id !== user.id) {
      const statusMessages: Record<string, string> = {
        acknowledged: 'has been acknowledged',
        scheduled: 'has been scheduled',
        in_progress: 'is now in progress',
        awaiting_parts: 'is awaiting parts',
        completed: 'has been completed',
        verified: 'has been verified',
        closed: 'has been closed',
        cancelled: 'has been cancelled',
      };

      await supabase.from('notifications').insert({
        user_id: updatedTicket.assigned_to_id,
        title: 'Service Ticket Updated',
        message: `${updatedTicket.ticket_number} ${statusMessages[body.newStatus] || 'status updated'}`,
        type: 'service_ticket',
        data: {
          ticket_id: updatedTicket.id,
          ticket_number: updatedTicket.ticket_number,
          status: body.newStatus,
          old_status: currentTicket.status,
          updated_by: profile.full_name,
        },
      });
    }

    // Queue Slack notification
    await supabase.from('webhook_retry_queue').insert({
      webhook_type: 'slack_ticket_status_changed',
      payload: {
        ticket_id: updatedTicket.id,
        ticket_number: updatedTicket.ticket_number,
        title: updatedTicket.title,
        old_status: currentTicket.status,
        new_status: body.newStatus,
        updated_by: profile.full_name,
        comment: body.comment,
      },
    });

    await logSystemEvent('ticket_status_updated', 'info', `Ticket ${updatedTicket.ticket_number} status changed`, {
      ticket_id: updatedTicket.id,
      old_status: currentTicket.status,
      new_status: body.newStatus,
      user_id: user.id,
    });

    return new Response(
      JSON.stringify({ ticket: updatedTicket }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    await logSystemEvent('unexpected_error', 'critical', 'Unexpected error in update-ticket-status', {
      error: error.message,
      stack: error.stack,
    });

    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
