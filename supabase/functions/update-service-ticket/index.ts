import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateServiceTicketRequest {
  ticketId: string;
  updates: {
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    noddi_user_id?: number;
    noddi_booking_id?: number;
    noddi_booking_type?: string;
    noddi_user_group_id?: number;
    title?: string;
    description?: string;
    priority?: string;
    category?: string;
    service_type?: string;
    assigned_to_id?: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('organization_id, full_name')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { ticketId, updates }: UpdateServiceTicketRequest = await req.json();

    console.log('Updating ticket:', ticketId, 'with updates:', updates);

    // Verify ticket belongs to user's organization
    const { data: existingTicket, error: ticketError } = await supabaseClient
      .from('service_tickets')
      .select('organization_id, assigned_to_id')
      .eq('id', ticketId)
      .single();

    if (ticketError || !existingTicket) {
      console.error('Ticket fetch error:', ticketError);
      return new Response(
        JSON.stringify({ error: 'Ticket not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingTicket.organization_id !== profile.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the ticket
    const { data: updatedTicket, error: updateError } = await supabaseClient
      .from('service_tickets')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId)
      .select(`
        *,
        assigned_to:profiles!assigned_to_id(user_id, full_name, avatar_url),
        created_by:profiles!created_by_id(user_id, full_name, avatar_url)
      `)
      .single();

    if (updateError) {
      console.error('Ticket update error:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log activity for customer linking
    if (updates.customer_name || updates.customer_email || updates.noddi_user_id) {
      const { error: eventError } = await supabaseClient
        .from('service_ticket_events')
        .insert({
          ticket_id: ticketId,
          event_type: 'field_changed',
          old_value: null,
          new_value: 'Customer linked',
          triggered_by_id: user.id,
          triggered_by_source: 'manual',
        });

      if (eventError) {
        console.error('Failed to log event:', eventError);
      }
    }

    // Send notification if ticket is assigned
    if (existingTicket.assigned_to_id && existingTicket.assigned_to_id !== user.id) {
      const { error: notifError } = await supabaseClient
        .from('notifications')
        .insert({
          user_id: existingTicket.assigned_to_id,
          title: 'Ticket Updated',
          message: `${profile.full_name} updated ticket details`,
          type: 'ticket_update',
          data: { ticket_id: ticketId },
        });

      if (notifError) {
        console.error('Failed to send notification:', notifError);
      }
    }

    console.log('Ticket updated successfully:', updatedTicket.ticket_number);

    return new Response(
      JSON.stringify({ ticket: updatedTicket }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
