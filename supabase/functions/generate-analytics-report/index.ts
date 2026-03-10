import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function stripHtml(text: string): string {
  if (!text) return '';
  let result = text;
  result = result.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  result = result.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  result = result.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
  result = result.replace(/<[^>]+>/g, ' ');
  result = result.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&');
  result = result.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

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

    // Fetch knowledge entries stats
    const { data: knowledgeStats } = await supabase
      .from('knowledge_entries')
      .select('quality_score, usage_count, acceptance_count')
      .eq('organization_id', organizationId);

    // Fetch response tracking stats
    const { data: trackingStats } = await supabase
      .from('response_tracking')
      .select('response_source, feedback_rating, created_at')
      .eq('organization_id', organizationId)
      .gte('created_at', startDate);

    // Fetch outcome stats
    const { data: outcomeStats } = await supabase
      .from('response_outcomes')
      .select('conversation_resolved, customer_satisfaction_score, reply_time_seconds')
      .eq('organization_id', organizationId)
      .gte('created_at', startDate);

    // === NEW: Message volume metrics ===
    const { data: allMessages } = await supabase
      .from('messages')
      .select('sender_type, created_at, conversation_id')
      .gte('created_at', startDate)
      .order('created_at', { ascending: false })
      .limit(1000);

    // Filter messages by org (join through conversations)
    const { data: orgConversations } = await supabase
      .from('conversations')
      .select('id, channel, status, created_at')
      .eq('organization_id', organizationId)
      .gte('created_at', startDate)
      .limit(1000);

    const orgConvIds = new Set((orgConversations || []).map(c => c.id));
    const orgMessages = (allMessages || []).filter(m => orgConvIds.has(m.conversation_id));

    const messagesReceived = orgMessages.filter(m => m.sender_type === 'customer').length;
    const messagesSent = orgMessages.filter(m => m.sender_type === 'agent').length;

    // Messages by day for charts
    const messagesByDay: Record<string, { received: number; sent: number }> = {};
    for (const m of orgMessages) {
      const day = m.created_at.substring(0, 10);
      if (!messagesByDay[day]) messagesByDay[day] = { received: 0, sent: 0 };
      if (m.sender_type === 'customer') messagesByDay[day].received++;
      else if (m.sender_type === 'agent') messagesByDay[day].sent++;
    }

    // Conversations by channel
    const convByChannel: Record<string, number> = {};
    for (const c of orgConversations || []) {
      convByChannel[c.channel] = (convByChannel[c.channel] || 0) + 1;
    }

    // Conversations by status
    const convByStatus: Record<string, number> = {};
    for (const c of orgConversations || []) {
      convByStatus[c.status] = (convByStatus[c.status] || 0) + 1;
    }

    // Fetch calls
    const { data: callsData } = await supabase
      .from('calls')
      .select('id, status, duration_seconds, direction')
      .eq('organization_id', organizationId)
      .gte('created_at', startDate)
      .limit(1000);

    const totalCalls = callsData?.length || 0;
    const avgCallDuration = totalCalls > 0
      ? (callsData || []).reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / totalCalls
      : 0;

    // === AI Content Insights ===
    let aiInsights: any = null;
    if (OPENAI_API_KEY) {
      try {
        // Fetch recent customer messages for theme extraction
        const customerMessages = orgMessages
          .filter(m => m.sender_type === 'customer')
          .slice(0, 60);

        if (customerMessages.length > 0) {
          // Get message content
          const msgIds = customerMessages.map(m => m.conversation_id);
          const uniqueConvIds = [...new Set(msgIds)].slice(0, 40);
          
          const { data: msgContent } = await supabase
            .from('messages')
            .select('content, conversation_id')
            .in('conversation_id', uniqueConvIds)
            .eq('sender_type', 'customer')
            .gte('created_at', startDate)
            .order('created_at', { ascending: false })
            .limit(60);

          if (msgContent && msgContent.length > 0) {
            const messagesText = msgContent
              .map((m, i) => `[${i + 1}] ${stripHtml(m.content).substring(0, 200)}`)
              .join('\n');

            const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                  {
                    role: 'system',
                    content: `Analyze customer support messages and return JSON with:
- "themes": array of { "topic": string, "count": number, "sentiment": "positive"|"neutral"|"negative" } (top 5 themes)
- "commonQuestions": array of strings (top 5 most common customer questions)
- "sentimentBreakdown": { "positive": number, "neutral": number, "negative": number } (percentages, must sum to 100)
- "summary": string (2-3 sentence overview)

Return ONLY valid JSON, no markdown.`,
                  },
                  {
                    role: 'user',
                    content: `Analyze these ${msgContent.length} customer messages:\n\n${messagesText}`,
                  },
                ],
                max_tokens: 600,
                temperature: 0.2,
              }),
            });

            if (aiResponse.ok) {
              const aiResult = await aiResponse.json();
              const content = aiResult.choices?.[0]?.message?.content;
              if (content) {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  aiInsights = JSON.parse(jsonMatch[0]);
                }
              }
            }
          }
        }
      } catch (aiErr) {
        console.error('AI insights generation failed:', aiErr);
      }
    }

    // Calculate existing aggregated metrics
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
      message_volume: {
        total_received: messagesReceived,
        total_sent: messagesSent,
        by_day: messagesByDay,
      },
      conversations: {
        total: orgConversations?.length || 0,
        by_channel: convByChannel,
        by_status: convByStatus,
      },
      calls: {
        total: totalCalls,
        avg_duration_seconds: Math.round(avgCallDuration),
      },
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
      ai_insights: aiInsights,
    };

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
