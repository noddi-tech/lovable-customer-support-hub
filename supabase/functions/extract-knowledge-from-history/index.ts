import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to strip HTML tags
function stripHtml(html: string): string {
  if (!html) return '';
  
  // Remove style, script, head blocks
  let text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<img[^>]*>/gi, '');
  
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');
  
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

// Quality filters
function shouldSkipEntry(customerContext: string, agentResponse: string): { skip: boolean; reason?: string } {
  const cleanCustomer = stripHtml(customerContext);
  const cleanAgent = stripHtml(agentResponse);
  
  // Skip if agent response is too short
  if (cleanAgent.length < 50) {
    return { skip: true, reason: 'Agent response too short' };
  }
  
  // Skip if customer context is too short
  if (cleanCustomer.length < 10) {
    return { skip: true, reason: 'Customer context too short' };
  }
  
  // Skip phone-only notes (Norwegian patterns)
  const phonePatterns = [
    /^snakket med kunde/i,
    /^ringte kunde/i,
    /^telefon(samtale)?:?\s*$/i,
    /^called customer/i,
  ];
  
  for (const pattern of phonePatterns) {
    if (pattern.test(cleanAgent)) {
      return { skip: true, reason: 'Phone note only' };
    }
  }
  
  // Skip if response is just acknowledgment
  const ackPatterns = [
    /^(ok|okay|done|takk|thanks|thank you|noted|got it)\.?$/i,
    /^(dette er ordnet|this is done|ferdig)\.?$/i,
  ];
  
  for (const pattern of ackPatterns) {
    if (pattern.test(cleanAgent)) {
      return { skip: true, reason: 'Acknowledgment only' };
    }
  }
  
  return { skip: false };
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
      return new Response(JSON.stringify({ error: 'Missing Supabase configuration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { organizationId, jobId, batchSize = 50, offset = 0 } = await req.json();

    if (!organizationId) {
      return new Response(JSON.stringify({ error: 'Missing organizationId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no jobId provided, create a new extraction job
    let currentJobId = jobId;
    if (!currentJobId) {
      // Count total closed conversations
      const { count: totalConversations } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'closed');

      const { data: newJob, error: jobError } = await supabase
        .from('knowledge_extraction_jobs')
        .insert({
          organization_id: organizationId,
          status: 'running',
          total_conversations: totalConversations || 0,
          total_processed: 0,
          entries_created: 0,
          entries_skipped: 0,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jobError) {
        console.error('Failed to create job:', jobError);
        return new Response(JSON.stringify({ error: 'Failed to create extraction job' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      currentJobId = newJob.id;
    }

    // Query for Q&A pairs from closed conversations
    // Get conversations with their first customer message and first agent response
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, subject')
      .eq('organization_id', organizationId)
      .eq('status', 'closed')
      .order('created_at', { ascending: true })
      .range(offset, offset + batchSize - 1);

    if (convError) {
      console.error('Failed to fetch conversations:', convError);
      return new Response(JSON.stringify({ error: 'Failed to fetch conversations' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!conversations || conversations.length === 0) {
      // No more conversations to process - mark job as completed
      await supabase
        .from('knowledge_extraction_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', currentJobId);

      return new Response(JSON.stringify({ 
        status: 'completed',
        jobId: currentJobId,
        message: 'Extraction completed'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let entriesCreated = 0;
    let entriesSkipped = 0;
    const pendingEntries: any[] = [];

    // Process each conversation
    for (const conv of conversations) {
      // Get the first customer message
      const { data: customerMessages } = await supabase
        .from('messages')
        .select('id, content, created_at')
        .eq('conversation_id', conv.id)
        .eq('sender_type', 'customer')
        .eq('is_internal', false)
        .order('created_at', { ascending: true })
        .limit(1);

      if (!customerMessages || customerMessages.length === 0) {
        entriesSkipped++;
        continue;
      }

      const customerMsg = customerMessages[0];

      // Get the first substantial agent response after the customer message
      const { data: agentMessages } = await supabase
        .from('messages')
        .select('id, content, created_at')
        .eq('conversation_id', conv.id)
        .eq('sender_type', 'agent')
        .eq('is_internal', false)
        .gt('created_at', customerMsg.created_at)
        .order('created_at', { ascending: true })
        .limit(1);

      if (!agentMessages || agentMessages.length === 0) {
        entriesSkipped++;
        continue;
      }

      const agentMsg = agentMessages[0];

      // Build customer context (include subject if available)
      let customerContext = '';
      if (conv.subject) {
        customerContext = `Subject: ${stripHtml(conv.subject)}\n\n`;
      }
      customerContext += stripHtml(customerMsg.content);

      const agentResponse = stripHtml(agentMsg.content);

      // Apply quality filters
      const { skip, reason } = shouldSkipEntry(customerContext, agentResponse);
      if (skip) {
        entriesSkipped++;
        continue;
      }

      // Add to pending entries batch
      pendingEntries.push({
        organization_id: organizationId,
        customer_context: customerContext,
        agent_response: agentResponse,
        source_conversation_id: conv.id,
        source_message_id: agentMsg.id,
        extraction_job_id: currentJobId,
        review_status: 'pending',
      });

      entriesCreated++;
    }

    // Insert pending entries in batch
    if (pendingEntries.length > 0) {
      const { error: insertError } = await supabase
        .from('knowledge_pending_entries')
        .insert(pendingEntries);

      if (insertError) {
        console.error('Failed to insert pending entries:', insertError);
      }
    }

    // Update job progress
    const { data: currentJob } = await supabase
      .from('knowledge_extraction_jobs')
      .select('total_processed, entries_created, entries_skipped')
      .eq('id', currentJobId)
      .single();

    await supabase
      .from('knowledge_extraction_jobs')
      .update({
        total_processed: (currentJob?.total_processed || 0) + conversations.length,
        entries_created: (currentJob?.entries_created || 0) + entriesCreated,
        entries_skipped: (currentJob?.entries_skipped || 0) + entriesSkipped,
      })
      .eq('id', currentJobId);

    // Return progress info
    const hasMore = conversations.length === batchSize;

    return new Response(JSON.stringify({
      status: hasMore ? 'in_progress' : 'completed',
      jobId: currentJobId,
      processed: conversations.length,
      entriesCreated,
      entriesSkipped,
      nextOffset: hasMore ? offset + batchSize : null,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('extract-knowledge-from-history error:', err);
    return new Response(JSON.stringify({ 
      error: 'Extraction failed', 
      detail: err instanceof Error ? err.message : String(err) 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
