import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { buildCustomerMemoryPrompt, type CustomerMemory } from '../_shared/prompt-builder.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_INSTRUCTIONS = `You are Noddi Customer Assistant drafting an email reply for an agent.
Tone: trygg, kunnskapsrik, med humør og punch (Noddi TOV).
Task: Write ONE complete, ready-to-send email reply.
- Mirror the customer's language (Norwegian if they wrote Norwegian).
- Never invent order data; if unsure, write a polite clarifying question.
- Keep the reply concise but complete.
- Do NOT include subject line or email headers — just the body text.
- Sign off with a friendly closing (e.g. "Vennlig hilsen, Noddi-teamet" or "Best regards, The Noddi team").
Output ONLY the email body text — no JSON, no markdown, no wrapping.`;

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[generate-email-draft] Missing required env vars');
      return new Response(JSON.stringify({ error: 'Missing configuration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { conversationId, messageId, organizationId } = await req.json();

    if (!conversationId || !organizationId) {
      return new Response(JSON.stringify({ error: 'Missing conversationId or organizationId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Load conversation thread (last 10 messages)
    const { data: messages, error: msgErr } = await supabase
      .from('messages')
      .select('content, sender_type, content_type, created_at')
      .eq('conversation_id', conversationId)
      .eq('is_internal', false)
      .neq('sender_type', 'ai_draft')
      .order('created_at', { ascending: false })
      .limit(10);

    if (msgErr) {
      console.error('[generate-email-draft] Failed to load messages:', msgErr);
      throw msgErr;
    }

    if (!messages || messages.length === 0) {
      console.warn('[generate-email-draft] No messages found for conversation:', conversationId);
      return new Response(JSON.stringify({ skipped: true, reason: 'no_messages' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build thread context (oldest first)
    const threadContext = messages.reverse().map(m => {
      const role = m.sender_type === 'customer' ? 'Customer' : 'Agent';
      const text = m.content_type === 'html' ? stripHtml(m.content) : m.content;
      return `${role}: ${text.slice(0, 2000)}`;
    }).join('\n\n---\n\n');

    // The latest customer message for embedding search
    const latestCustomerMsg = messages.filter(m => m.sender_type === 'customer').pop();
    const customerText = latestCustomerMsg
      ? (latestCustomerMsg.content_type === 'html'
        ? stripHtml(latestCustomerMsg.content)
        : latestCustomerMsg.content)
      : '';

    // Step 2: Resolve customer identity and fetch memory profile
    let customerMemoryContext = '';
    try {
      const { data: conv } = await supabase
        .from('conversations')
        .select('customer_id, customer:customers(phone, email)')
        .eq('id', conversationId)
        .single();

      const customer = conv?.customer as { phone?: string; email?: string } | null;
      const identifier = customer?.phone?.replace(/[^\d+]/g, '') || customer?.email?.trim().toLowerCase();
      const identifierType = customer?.phone ? 'phone' : 'email';

      if (identifier) {
        const { data: summary } = await supabase
          .from('customer_summaries')
          .select('summary_text')
          .eq('organization_id', organizationId)
          .eq('customer_identifier', identifier)
          .eq('identifier_type', identifierType)
          .single();

        if (summary?.summary_text) {
          const { data: memories } = await supabase
            .from('customer_memories')
            .select('memory_type, memory_text, confidence')
            .eq('organization_id', organizationId)
            .eq('customer_identifier', identifier)
            .eq('is_active', true)
            .order('confidence', { ascending: false })
            .order('updated_at', { ascending: false })
            .limit(10);

          customerMemoryContext = '\n\n' + buildCustomerMemoryPrompt(
            summary.summary_text,
            (memories || []) as CustomerMemory[],
          ) + '\n';

          console.log(`[generate-email-draft] Injected customer memory for ${identifierType}=${identifier}`);
        }
      }
    } catch (e) {
      console.warn('[generate-email-draft] Customer memory lookup failed:', e);
    }

    // Step 3: Search knowledge base for similar responses
    let knowledgeContext = '';
    if (customerText) {
      try {
        const embeddingResp = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: customerText.slice(0, 8000),
          }),
        });

        const embeddingData = await embeddingResp.json();
        const embedding = embeddingData?.data?.[0]?.embedding;

        if (embedding) {
          const { data: similarResponses } = await supabase.rpc(
            'find_similar_responses',
            {
              query_embedding: embedding,
              org_id: organizationId,
              match_threshold: 0.75,
              match_count: 5,
            }
          );

          if (similarResponses && similarResponses.length > 0) {
            knowledgeContext = '\n\nPROVEN RESPONSES FROM KNOWLEDGE BASE:\n';
            similarResponses.forEach((item: any, idx: number) => {
              knowledgeContext += `\n${idx + 1}. Customer asked: "${item.customer_context}"\n`;
              knowledgeContext += `   Agent replied: "${item.agent_response}"\n`;
              knowledgeContext += `   (Quality: ${item.quality_score}, Used ${item.usage_count}x`;
              if (item.was_refined) {
                knowledgeContext += `, Refined by agent`;
              }
              knowledgeContext += `)\n`;
            });
            knowledgeContext += '\nUse these proven responses as inspiration. Prioritize refined ones.\n';
            console.log(`[generate-email-draft] Found ${similarResponses.length} knowledge matches`);
          }
        }
      } catch (e) {
        console.warn('[generate-email-draft] Knowledge search failed:', e);
      }
    }

    // Step 4: Generate draft with GPT
    const systemPrompt = SYSTEM_INSTRUCTIONS + customerMemoryContext + knowledgeContext;
    const userPrompt = `EMAIL THREAD:\n${threadContext}\n\n---\nWrite a reply to the customer's latest message.`;

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        max_tokens: 1000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error('[generate-email-draft] OpenAI error:', data);
      return new Response(JSON.stringify({ error: 'OpenAI request failed', detail: data }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const draftContent = data?.choices?.[0]?.message?.content?.trim();
    if (!draftContent) {
      console.warn('[generate-email-draft] Empty draft generated');
      return new Response(JSON.stringify({ skipped: true, reason: 'empty_draft' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 5: Insert draft message
    const { data: draftMessage, error: insertErr } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        content: draftContent,
        sender_type: 'ai_draft',
        is_internal: true,
        metadata: {
          source_message_id: messageId,
          model: 'gpt-4o-mini',
          generated_at: new Date().toISOString(),
          knowledge_matches: knowledgeContext ? true : false,
          has_customer_memory: customerMemoryContext ? true : false,
        },
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('[generate-email-draft] Failed to insert draft:', insertErr);
      throw insertErr;
    }

    console.log(`[generate-email-draft] Draft created: ${draftMessage?.id} for conversation: ${conversationId}`);

    return new Response(JSON.stringify({ ok: true, draftId: draftMessage?.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[generate-email-draft] Error:', err);
    return new Response(JSON.stringify({
      error: 'Failed to generate draft',
      detail: err instanceof Error ? err.message : String(err),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
