import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const widgetKey = url.searchParams.get('key');

    if (!widgetKey) {
      return new Response(
        JSON.stringify({ error: 'Widget key is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch widget configuration by widget_key
    const { data: config, error } = await supabase
      .from('widget_configs')
      .select(`
        id,
        widget_key,
        primary_color,
        position,
        greeting_text,
        response_time_text,
        enable_chat,
        enable_contact_form,
        enable_knowledge_search,
        logo_url,
        company_name,
        inbox_id,
        organization_id,
        inboxes!inner (
          name,
          sender_display_name
        ),
        organizations!inner (
          name,
          logo_url,
          primary_color
        )
      `)
      .eq('widget_key', widgetKey)
      .eq('is_active', true)
      .single();

    if (error || !config) {
      console.error('Widget config not found:', error);
      return new Response(
        JSON.stringify({ error: 'Widget not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if any agents are online for this organization
    const { data: onlineCount, error: countError } = await supabase
      .rpc('get_online_agent_count', { org_id: config.organization_id });

    if (countError) {
      console.error('Error fetching online agent count:', countError);
    }

    const agentsOnline = (onlineCount ?? 0) > 0;

    // Return public configuration (no sensitive data)
    const publicConfig = {
      widgetKey: config.widget_key,
      primaryColor: config.primary_color || config.organizations?.primary_color || '#7c3aed',
      position: config.position,
      greetingText: config.greeting_text,
      responseTimeText: config.response_time_text,
      enableChat: config.enable_chat,
      enableContactForm: config.enable_contact_form,
      enableKnowledgeSearch: config.enable_knowledge_search,
      logoUrl: config.logo_url || config.organizations?.logo_url,
      companyName: config.company_name || config.organizations?.name,
      inboxName: config.inboxes?.name,
      agentsOnline,
    };

    return new Response(
      JSON.stringify(publicConfig),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching widget config:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
