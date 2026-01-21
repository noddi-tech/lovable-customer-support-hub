import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface WidgetSubmission {
  widgetKey: string;
  name: string;
  email: string;
  message: string;
  subject?: string;
  pageUrl?: string;
  visitorId?: string;
  browserInfo?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body: WidgetSubmission = await req.json();
    const { widgetKey, name, email, message, subject, pageUrl, visitorId, browserInfo } = body;

    // Validate required fields
    if (!widgetKey || !email || !message) {
      return new Response(
        JSON.stringify({ error: 'Widget key, email, and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch widget configuration
    const { data: widgetConfig, error: configError } = await supabase
      .from('widget_configs')
      .select('id, inbox_id, organization_id')
      .eq('widget_key', widgetKey)
      .eq('is_active', true)
      .single();

    if (configError || !widgetConfig) {
      console.error('Widget config not found:', configError);
      return new Response(
        JSON.stringify({ error: 'Widget not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { inbox_id, organization_id } = widgetConfig;

    // Find or create customer
    let customerId: string;
    
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('organization_id', organization_id)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      
      // Update customer name if provided
      if (name) {
        await supabase
          .from('customers')
          .update({ full_name: name, updated_at: new Date().toISOString() })
          .eq('id', customerId);
      }
    } else {
      // Create new customer
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          email: email.toLowerCase(),
          full_name: name || null,
          organization_id,
        })
        .select('id')
        .single();

      if (customerError || !newCustomer) {
        console.error('Error creating customer:', customerError);
        return new Response(
          JSON.stringify({ error: 'Failed to create customer' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      customerId = newCustomer.id;
    }

    // Create conversation
    const conversationSubject = subject || `Contact form submission from ${name || email}`;
    
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        organization_id,
        inbox_id,
        customer_id: customerId,
        channel: 'widget',
        subject: conversationSubject,
        preview_text: message.substring(0, 200),
        status: 'open',
        priority: 'normal',
        is_read: false,
        received_at: new Date().toISOString(),
        metadata: {
          source: 'widget',
          page_url: pageUrl,
          browser_info: browserInfo,
        },
      })
      .select('id')
      .single();

    if (conversationError || !conversation) {
      console.error('Error creating conversation:', conversationError);
      return new Response(
        JSON.stringify({ error: 'Failed to create conversation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create message
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        content: message,
        sender_type: 'customer',
        content_type: 'text',
        email_subject: conversationSubject,
      });

    if (messageError) {
      console.error('Error creating message:', messageError);
      return new Response(
        JSON.stringify({ error: 'Failed to create message' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create or update widget session
    if (visitorId) {
      await supabase
        .from('widget_sessions')
        .upsert({
          widget_config_id: widgetConfig.id,
          visitor_id: visitorId,
          visitor_email: email.toLowerCase(),
          visitor_name: name || null,
          page_url: pageUrl,
          browser_info: browserInfo,
          conversation_id: conversation.id,
        }, {
          onConflict: 'visitor_id',
          ignoreDuplicates: false,
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        conversationId: conversation.id,
        message: 'Your message has been received. We will get back to you soon!',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing widget submission:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
