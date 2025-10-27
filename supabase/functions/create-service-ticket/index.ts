import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Error tracking wrapper
async function logSystemEvent(
  orgId: string,
  eventType: string,
  severity: 'info' | 'warn' | 'error' | 'critical',
  eventData: any = {}
) {
  try {
    await supabase.from('system_events_log').insert({
      organization_id: orgId,
      event_type: eventType,
      event_source: 'edge_function',
      event_data: eventData,
      severity,
    });
  } catch (err) {
    console.error('Failed to log system event:', err);
  }
}

interface CreateTicketRequest {
  title: string;
  description: string;
  customerId?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  category?: 'tire_issue' | 'service_complaint' | 'follow_up' | 'warranty' | 'safety_concern' | 'other';
  conversationId?: string;
  callId?: string;
  noddiBookingId?: number;
  noddiUserGroupId?: number;
  noddiBookingType?: string;
  assignedToId?: string;
  scheduledFor?: string;
  tags?: string[];
  dueDate?: string;
  serviceType?: 'on_site_visit' | 'workshop_appointment' | 'remote_support' | 'callback';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authenticated user
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
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's organization
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

    // Parse request body
    const body: CreateTicketRequest = await req.json();

    // Validate required fields
    if (!body.title || !body.description) {
      return new Response(
        JSON.stringify({ error: 'Title and description are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate due date if not provided (default: 7 days for normal, 24h for urgent)
    let dueDate = body.dueDate;
    if (!dueDate) {
      const hours = body.priority === 'urgent' ? 24 : body.priority === 'high' ? 48 : 168;
      dueDate = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    }

    // Create ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('service_tickets')
      .insert({
        organization_id: profile.organization_id,
        title: body.title,
        description: body.description,
        customer_id: body.customerId,
        priority: body.priority || 'normal',
        category: body.category,
        conversation_id: body.conversationId,
        call_id: body.callId,
        noddi_booking_id: body.noddiBookingId,
        noddi_user_group_id: body.noddiUserGroupId,
        noddi_booking_type: body.noddiBookingType,
        assigned_to_id: body.assignedToId,
        scheduled_for: body.scheduledFor,
        service_type: body.serviceType,
        tags: body.tags || [],
        due_date: dueDate,
        created_by_id: user.id,
      })
      .select('*, customer:customers(*)')
      .single();

    if (ticketError) {
      await logSystemEvent(
        profile.organization_id,
        'ticket_creation_failed',
        'error',
        { error: ticketError.message, user_id: user.id }
      );
      throw ticketError;
    }

    // Create initial event
    await supabase.from('service_ticket_events').insert({
      ticket_id: ticket.id,
      event_type: 'created',
      new_value: 'open',
      triggered_by_id: user.id,
      triggered_by_source: 'manual',
    });

    // Send notification to assigned user if specified
    if (body.assignedToId && body.assignedToId !== user.id) {
      await supabase.from('notifications').insert({
        user_id: body.assignedToId,
        title: 'New Service Ticket Assigned',
        message: `${ticket.ticket_number}: ${body.title}`,
        type: 'service_ticket',
        data: {
          ticket_id: ticket.id,
          ticket_number: ticket.ticket_number,
          status: 'open',
          priority: body.priority || 'normal',
          customer_name: ticket.customer?.full_name || 'Unknown',
        },
      });
    }

    // Queue Slack notification
    await supabase.from('webhook_retry_queue').insert({
      webhook_type: 'slack_ticket_created',
      payload: {
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number,
        title: body.title,
        priority: body.priority || 'normal',
        customer_name: ticket.customer?.full_name || 'Unknown',
        created_by: profile.full_name,
      },
    });

    await logSystemEvent(
      profile.organization_id,
      'ticket_created',
      'info',
      {
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number,
        user_id: user.id,
      }
    );

    return new Response(
      JSON.stringify({ ticket }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in create-service-ticket:', error);

    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
