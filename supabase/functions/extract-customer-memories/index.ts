import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXTRACTION_PROMPT = `You are a memory-extraction engine for Noddi, a Norwegian mobile tire-change and car-service company. Given a customer-support conversation transcript and any EXISTING memories we already have for this customer, extract NEW or meaningfully UPDATED facts.

Return a JSON array (no markdown). Each element:
{
  "memory_type": "vehicle" | "preference" | "fact" | "issue" | "sentiment",
  "memory_text": "<concise human-readable statement>",
  "structured_data": { ... },   // machine-readable, schema depends on type
  "confidence": 0.5-1.0
}

Memory type guidelines:
- **vehicle**: car make/model/year, license plate, tire brand/size. structured_data: {make, model, year, plate, tire_brand, tire_size}
- **preference**: scheduling preferences, communication style, service preferences. structured_data: {preference_key, preference_value}
- **fact**: address, number of cars, membership status, name. structured_data: {fact_key, fact_value}
- **issue**: recurring problems, complaints, unresolved items. structured_data: {issue_key, status, severity}
- **sentiment**: overall satisfaction signals. structured_data: {sentiment: "positive"|"neutral"|"negative", trigger}

Rules:
1. Only extract information the CUSTOMER revealed (not the agent's suggestions).
2. Skip anything already captured in EXISTING memories unless meaningfully updated.
3. If nothing new is found, return an empty array: []
4. Keep memory_text concise (max 100 chars).
5. Prefer Norwegian context (plate formats, city names, etc.).

Respond with ONLY valid JSON, no markdown fences.`;

const SUMMARY_PROMPT = `You are writing a brief customer profile for a Noddi support agent. Given the customer's memory entries below, write a 1-2 sentence profile that highlights the most useful information for handling their next support interaction.

Focus on: vehicles they own, service preferences, any recurring issues, and overall sentiment.
Write in English. Be concise and actionable.`;

// ─── Helpers ─────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^\d+]/g, '');
}

function normalizeEmail(email: string): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

function buildTranscript(messages: Array<{ role: string; content: string }>): string {
  return messages
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n')
    .slice(0, 6000);
}

async function callGpt(openaiKey: string, systemPrompt: string, userContent: string, maxTokens = 1000): Promise<string> {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`OpenAI API error ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

async function generateEmbedding(openaiKey: string, text: string): Promise<number[] | null> {
  const resp = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000),
    }),
  });

  if (!resp.ok) {
    console.error('[generateEmbedding] OpenAI error:', resp.status);
    return null;
  }

  const data = await resp.json();
  return data?.data?.[0]?.embedding ?? null;
}

// ─── Main handler ────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Missing configuration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { conversationId, organizationId } = await req.json();

    if (!conversationId || !organizationId) {
      return new Response(JSON.stringify({ error: 'Missing conversationId or organizationId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── Step 1: Resolve customer identifier ──────────────────

    const { data: conversation, error: convError } = await supabase
      .from('widget_ai_conversations')
      .select('visitor_phone, visitor_email')
      .eq('id', conversationId)
      .eq('organization_id', organizationId)
      .single();

    if (convError || !conversation) {
      return new Response(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let customerIdentifier: string;
    let identifierType: 'phone' | 'email';

    if (conversation.visitor_phone) {
      customerIdentifier = normalizePhone(conversation.visitor_phone);
      identifierType = 'phone';
    } else if (conversation.visitor_email) {
      customerIdentifier = normalizeEmail(conversation.visitor_email);
      identifierType = 'email';
    } else {
      return new Response(JSON.stringify({
        memoriesExtracted: 0,
        memoriesUpdated: 0,
        summaryGenerated: false,
        reason: 'anonymous_user',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[extract-memories] Customer: ${identifierType}=${customerIdentifier}`);

    // ── Step 2: Fetch transcript + existing memories (parallel) ──

    const [messagesResult, memoriesResult] = await Promise.all([
      supabase
        .from('widget_ai_messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true }),
      supabase
        .from('customer_memories')
        .select('id, memory_type, memory_text, structured_data, confidence, embedding')
        .eq('organization_id', organizationId)
        .eq('customer_identifier', customerIdentifier)
        .eq('is_active', true),
    ]);

    if (messagesResult.error) {
      console.error('[extract-memories] Failed to fetch messages:', messagesResult.error);
      return new Response(JSON.stringify({ error: 'Failed to fetch messages' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const messages = messagesResult.data || [];
    if (messages.length < 2) {
      return new Response(JSON.stringify({
        memoriesExtracted: 0,
        memoriesUpdated: 0,
        summaryGenerated: false,
        reason: 'conversation_too_short',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const existingMemories = memoriesResult.data || [];
    const transcript = buildTranscript(messages);

    const existingMemoriesForPrompt = existingMemories.map((m) => ({
      memory_type: m.memory_type,
      memory_text: m.memory_text,
    }));

    // ── Step 3: GPT extraction ───────────────────────────────

    const userContent = `EXISTING MEMORIES:\n${JSON.stringify(existingMemoriesForPrompt)}\n\nCONVERSATION TRANSCRIPT:\n${transcript}`;
    const rawResponse = await callGpt(OPENAI_API_KEY, EXTRACTION_PROMPT, userContent);

    let extracted: Array<{
      memory_type: string;
      memory_text: string;
      structured_data: Record<string, unknown>;
      confidence: number;
    }>;

    try {
      extracted = JSON.parse(rawResponse);
      if (!Array.isArray(extracted)) throw new Error('Not an array');
    } catch {
      console.error('[extract-memories] GPT returned invalid JSON:', rawResponse.slice(0, 500));
      return new Response(JSON.stringify({
        memoriesExtracted: 0,
        memoriesUpdated: 0,
        summaryGenerated: false,
        reason: 'extraction_parse_error',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (extracted.length === 0) {
      console.log('[extract-memories] No new memories found.');
      // Still regenerate summary in case conversation count changed
      // Fall through to step 6
    }

    // ── Step 4 & 5: Dedup + save ─────────────────────────────

    let memoriesExtracted = 0;
    let memoriesUpdated = 0;

    for (const mem of extracted) {
      // Validate memory_type
      if (!['vehicle', 'preference', 'fact', 'issue', 'sentiment'].includes(mem.memory_type)) {
        console.warn(`[extract-memories] Skipping invalid memory_type: ${mem.memory_type}`);
        continue;
      }

      // Clamp confidence
      const confidence = Math.max(0.5, Math.min(1.0, mem.confidence ?? 0.8));

      // Generate embedding
      const embedding = await generateEmbedding(OPENAI_API_KEY, mem.memory_text);
      if (!embedding) {
        console.warn(`[extract-memories] Embedding failed for: ${mem.memory_text}`);
        continue;
      }

      // Check for duplicate via cosine similarity
      let isDuplicate = false;
      let duplicateId: string | null = null;
      let duplicateConfidence = 0;

      if (existingMemories.length > 0) {
        // Use pgvector <=> operator via raw SQL for cosine distance
        const { data: similar } = await supabase.rpc('find_similar_memory', {
          query_embedding: embedding,
          target_org_id: organizationId,
          target_identifier: customerIdentifier,
          similarity_threshold: 0.92,
        }).maybeSingle();

        // If RPC doesn't exist, fall back to manual check
        if (!similar) {
          // Fallback: do cosine similarity in-app against existing memories with embeddings
          for (const existing of existingMemories) {
            if (!existing.embedding) continue;
            const sim = cosineSimilarity(embedding, existing.embedding as unknown as number[]);
            if (sim > 0.92) {
              isDuplicate = true;
              duplicateId = existing.id;
              duplicateConfidence = existing.confidence as number;
              break;
            }
          }
        } else {
          isDuplicate = true;
          duplicateId = similar.id;
          duplicateConfidence = similar.confidence;
        }
      }

      if (isDuplicate && duplicateId) {
        // Bump confidence
        const newConfidence = Math.min(1.0, duplicateConfidence + 0.1);
        await supabase
          .from('customer_memories')
          .update({
            confidence: newConfidence,
            structured_data: mem.structured_data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', duplicateId);

        memoriesUpdated++;
        console.log(`[extract-memories] Updated existing memory ${duplicateId}, confidence: ${newConfidence}`);
      } else {
        // Insert new memory
        const { error: insertError } = await supabase
          .from('customer_memories')
          .insert({
            organization_id: organizationId,
            customer_identifier: customerIdentifier,
            identifier_type: identifierType,
            memory_type: mem.memory_type,
            memory_text: mem.memory_text,
            structured_data: mem.structured_data,
            confidence,
            source_conversation_id: conversationId,
            embedding,
            is_active: true,
          });

        if (insertError) {
          console.error('[extract-memories] Insert error:', insertError);
          continue;
        }

        memoriesExtracted++;
        console.log(`[extract-memories] New memory: [${mem.memory_type}] ${mem.memory_text}`);
      }
    }

    // ── Step 6: Regenerate customer summary ──────────────────

    let summaryGenerated = false;

    // Fetch all active memories (including newly added)
    const { data: allMemories } = await supabase
      .from('customer_memories')
      .select('memory_type, memory_text, confidence, created_at')
      .eq('organization_id', organizationId)
      .eq('customer_identifier', customerIdentifier)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (allMemories && allMemories.length > 0) {
      // Generate summary text
      const memoriesForSummary = allMemories.map((m) =>
        `[${m.memory_type}] ${m.memory_text} (confidence: ${m.confidence})`
      ).join('\n');

      const summaryText = await callGpt(
        OPENAI_API_KEY,
        SUMMARY_PROMPT,
        memoriesForSummary,
        200,
      );

      // Count total conversations
      const identifierColumn = identifierType === 'phone' ? 'visitor_phone' : 'visitor_email';
      const { count: totalConversations } = await supabase
        .from('widget_ai_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq(identifierColumn, conversation[identifierColumn === 'visitor_phone' ? 'visitor_phone' : 'visitor_email']);

      // Determine sentiment trend from recent sentiment memories
      const sentimentMemories = allMemories
        .filter((m) => m.memory_type === 'sentiment')
        .slice(0, 3);

      let sentimentTrend: string | null = null;
      if (sentimentMemories.length >= 2) {
        const sentiments = sentimentMemories.map((m) => {
          try {
            const sd = typeof m.memory_text === 'string' ? m.memory_text : '';
            if (sd.toLowerCase().includes('positive') || sd.toLowerCase().includes('happy') || sd.toLowerCase().includes('satisfied')) return 1;
            if (sd.toLowerCase().includes('negative') || sd.toLowerCase().includes('frustrated') || sd.toLowerCase().includes('unhappy')) return -1;
            return 0;
          } catch { return 0; }
        });
        const avg = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
        // Most recent vs oldest in window
        const trend = sentiments[0] - sentiments[sentiments.length - 1];
        if (trend > 0) sentimentTrend = 'improving';
        else if (trend < 0) sentimentTrend = 'declining';
        else sentimentTrend = 'stable';
      }

      // Get first_seen_at
      const { data: firstConv } = await supabase
        .from('widget_ai_conversations')
        .select('created_at')
        .eq('organization_id', organizationId)
        .eq(identifierColumn, conversation[identifierColumn === 'visitor_phone' ? 'visitor_phone' : 'visitor_email'])
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      // Upsert summary
      const { error: upsertError } = await supabase
        .from('customer_summaries')
        .upsert(
          {
            organization_id: organizationId,
            customer_identifier: customerIdentifier,
            identifier_type: identifierType,
            summary_text: summaryText,
            total_conversations: totalConversations ?? 0,
            first_seen_at: firstConv?.created_at ?? new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
            sentiment_trend: sentimentTrend,
          },
          { onConflict: 'organization_id,customer_identifier,identifier_type' },
        );

      if (upsertError) {
        console.error('[extract-memories] Summary upsert error:', upsertError);
      } else {
        summaryGenerated = true;
        console.log(`[extract-memories] Summary generated for ${customerIdentifier}`);
      }
    }

    console.log(`[extract-memories] Done: extracted=${memoriesExtracted}, updated=${memoriesUpdated}, summary=${summaryGenerated}`);

    return new Response(JSON.stringify({
      memoriesExtracted,
      memoriesUpdated,
      summaryGenerated,
      customerIdentifier,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[extract-memories] Fatal error:', err);
    return new Response(JSON.stringify({
      error: 'Memory extraction failed',
      detail: err instanceof Error ? err.message : String(err),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ─── Cosine similarity (fallback, in-app) ────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
