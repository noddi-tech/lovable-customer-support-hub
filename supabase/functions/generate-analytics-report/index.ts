import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Missing configuration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { organizationId, periodDays = 30 } = await req.json();
    
    if (!organizationId) {
      return new Response(JSON.stringify({ error: 'Missing organizationId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

    // Fetch system health metrics
    const { data: healthData, error: healthError } = await supabase
      .from('knowledge_system_health')
      .select('*');

    if (healthError) {
      console.error('Error fetching health data:', healthError);
    }

    // Fetch knowledge entries stats
    const { data: knowledgeStats, error: knowledgeError } = await supabase
      .from('knowledge_entries')
      .select('quality_score, usage_count, acceptance_count')
      .eq('organization_id', organizationId);

    if (knowledgeError) {
      console.error('Error fetching knowledge stats:', knowledgeError);
    }

    // Fetch response tracking stats for the period
    const { data: trackingStats, error: trackingError } = await supabase
      .from('response_tracking')
      .select('response_source, feedback_rating, created_at')
      .eq('organization_id', organizationId)
      .gte('created_at', startDate);

    if (trackingError) {
      console.error('Error fetching tracking stats:', trackingError);
    }

    // Fetch outcome stats for the period
    const { data: outcomeStats, error: outcomeError } = await supabase
      .from('response_outcomes')
      .select('conversation_resolved, customer_satisfaction_score, reply_time_seconds')
      .eq('organization_id', organizationId)
      .gte('created_at', startDate);

    if (outcomeError) {
      console.error('Error fetching outcome stats:', outcomeError);
    }

    // Calculate aggregated metrics
    const totalKnowledgeEntries = knowledgeStats?.length || 0;
    const avgQualityScore = knowledgeStats?.reduce((sum, e) => sum + e.quality_score, 0) / totalKnowledgeEntries || 0;
    const totalUsage = knowledgeStats?.reduce((sum, e) => sum + e.usage_count, 0) || 0;
    const totalAcceptance = knowledgeStats?.reduce((sum, e) => sum + e.acceptance_count, 0) || 0;

    const trackingBySource = (trackingStats || []).reduce((acc: any, t: any) => {
      acc[t.response_source] = (acc[t.response_source] || 0) + 1;
      return acc;
    }, {});

    const avgFeedback = (trackingStats || [])
      .filter((t: any) => t.feedback_rating)
      .reduce((sum: number, t: any) => sum + t.feedback_rating, 0) / 
      ((trackingStats || []).filter((t: any) => t.feedback_rating).length || 1);

    const resolvedCount = (outcomeStats || []).filter((o: any) => o.conversation_resolved).length;
    const avgSatisfaction = (outcomeStats || [])
      .reduce((sum: number, o: any) => sum + (o.customer_satisfaction_score || 0), 0) / 
      ((outcomeStats || []).length || 1);
    const avgReplyTime = (outcomeStats || [])
      .reduce((sum: number, o: any) => sum + (o.reply_time_seconds || 0), 0) / 
      ((outcomeStats || []).length || 1);

    const report = {
      generated_at: new Date().toISOString(),
      period_days: periodDays,
      organization_id: organizationId,
      system_health: healthData,
      knowledge_base: {
        total_entries: totalKnowledgeEntries,
        avg_quality_score: avgQualityScore.toFixed(2),
        total_usage: totalUsage,
        total_acceptance: totalAcceptance,
        acceptance_rate: totalUsage > 0 ? ((totalAcceptance / totalUsage) * 100).toFixed(2) + '%' : '0%',
      },
      response_tracking: {
        total_responses: trackingStats?.length || 0,
        by_source: trackingBySource,
        avg_feedback_rating: avgFeedback.toFixed(2),
      },
      outcomes: {
        total_outcomes: outcomeStats?.length || 0,
        resolved_count: resolvedCount,
        resolution_rate: outcomeStats?.length ? ((resolvedCount / outcomeStats.length) * 100).toFixed(2) + '%' : '0%',
        avg_satisfaction: avgSatisfaction.toFixed(2),
        avg_reply_time_minutes: (avgReplyTime / 60).toFixed(2),
      },
    };

    console.log('Analytics report generated:', JSON.stringify(report, null, 2));

    return new Response(JSON.stringify(report), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('generate-analytics-report error', err);
    return new Response(JSON.stringify({ 
      error: 'Failed to generate analytics report', 
      detail: err instanceof Error ? err.message : String(err) 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
