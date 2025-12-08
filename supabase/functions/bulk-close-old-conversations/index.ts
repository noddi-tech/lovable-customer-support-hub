import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const monthsOld = body.monthsOld || 3;
    const dryRun = body.dryRun !== false; // Default to dry run for safety
    const organizationId = body.organizationId;

    if (!organizationId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'organizationId is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Bulk close old conversations: organizationId=${organizationId}, monthsOld=${monthsOld}, dryRun=${dryRun}`);

    // Get the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsOld);

    // First, find matching conversations for the specific organization
    const { data: conversations, error: findError } = await supabase
      .from('conversations')
      .select('id, subject, received_at, status')
      .eq('organization_id', organizationId)
      .eq('status', 'open')
      .eq('is_archived', false)
      .lt('received_at', cutoffDate.toISOString())
      .order('received_at', { ascending: true });

    if (findError) {
      console.error('Error finding conversations:', findError);
      throw findError;
    }

    const count = conversations?.length || 0;
    console.log(`Found ${count} old open conversations to close`);

    if (dryRun) {
      // Just return what would be closed
      return new Response(JSON.stringify({
        success: true,
        dryRun: true,
        message: `Would close ${count} conversations older than ${monthsOld} months`,
        count,
        oldestDate: conversations?.[0]?.received_at,
        newestDate: conversations?.[count - 1]?.received_at,
        sampleSubjects: conversations?.slice(0, 5).map(c => c.subject)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Actually close the conversations
    if (count > 0) {
      const ids = conversations!.map(c => c.id);
      
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ status: 'closed' })
        .in('id', ids);

      if (updateError) {
        console.error('Error closing conversations:', updateError);
        throw updateError;
      }

      console.log(`Successfully closed ${count} conversations`);
    }

    return new Response(JSON.stringify({
      success: true,
      dryRun: false,
      message: `Closed ${count} conversations older than ${monthsOld} months`,
      count
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in bulk-close-old-conversations:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
