import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { jobId, action, errorMessage } = await req.json();

    if (!jobId || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: jobId, action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let updateData: any = {
      updated_at: new Date().toISOString()
    };

    switch (action) {
      case 'mark_error':
        updateData.status = 'error';
        updateData.completed_at = new Date().toISOString();
        if (errorMessage) {
          updateData.errors = [{
            message: errorMessage,
            timestamp: new Date().toISOString()
          }];
        }
        break;
      
      case 'mark_completed':
        updateData.status = 'completed';
        updateData.completed_at = new Date().toISOString();
        break;
      
      case 'reset':
        updateData.status = 'pending';
        updateData.started_at = null;
        updateData.completed_at = null;
        updateData.conversations_imported = 0;
        updateData.messages_imported = 0;
        updateData.customers_imported = 0;
        updateData.errors = null;
        break;
      
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const { data, error } = await supabase
      .from('import_jobs')
      .update(updateData)
      .eq('id', jobId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update import job:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully updated job ${jobId} to ${action}`);

    return new Response(
      JSON.stringify({ success: true, job: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in manage-import-job:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
