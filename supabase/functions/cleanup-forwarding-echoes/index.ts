import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function stripToText(body: string): string | null {
  const text = body
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return text.length > 30 ? text : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // default true

    const startTime = Date.now();
    const MAX_EXECUTION_TIME = 45000;

    console.log(`[cleanup-forwarding-echoes] Starting. dryRun=${dryRun}`);

    let conversationsScanned = 0;
    let echoesFound = 0;
    let echoesDeleted = 0;
    let offset = 0;
    const pageSize = 1000;
    let timedOut = false;

    while (true) {
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        timedOut = true;
        break;
      }

      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .order('created_at')
        .range(offset, offset + pageSize - 1);

      if (convError) throw convError;
      if (!conversations || conversations.length === 0) break;

      for (const conv of conversations) {
        if (Date.now() - startTime > MAX_EXECUTION_TIME) {
          timedOut = true;
          break;
        }

        const { data: messages, error: msgError } = await supabase
          .from('messages')
          .select('id, content, sender_type, is_internal, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at');

        if (msgError) {
          console.error(`[cleanup-forwarding-echoes] Error fetching messages for ${conv.id}:`, msgError);
          continue;
        }
        if (!messages || messages.length < 2) {
          conversationsScanned++;
          continue;
        }

        // Collect ALL non-internal message texts with timestamps
        // so we can detect echoes of any earlier message (agent or customer)
        const allTexts: { text: string; time: number; id: string }[] = [];
        for (const m of messages) {
          if (m.is_internal) continue;
          const text = stripToText(m.content);
          if (text) {
            allTexts.push({ text, time: new Date(m.created_at).getTime(), id: m.id });
          }
        }

        if (allTexts.length === 0) {
          conversationsScanned++;
          continue;
        }

        // Find echoes: non-agent, non-internal messages whose content matches an earlier message
        const echoIds: string[] = [];
        for (const m of messages) {
          if (m.sender_type === 'agent' || m.is_internal) continue;
          const inboundText = stripToText(m.content);
          if (!inboundText) continue;
          const inboundTime = new Date(m.created_at).getTime();

          for (const earlier of allTexts) {
            if (earlier.time >= inboundTime) continue;
            if (earlier.id === m.id) continue;
            const searchKey = earlier.text.substring(0, 80);
            if (inboundText.includes(searchKey)) {
              echoIds.push(m.id);
              console.log(`[cleanup-forwarding-echoes] Echo found: message ${m.id} echoes earlier ${earlier.id} in conversation ${conv.id}`);
              break;
            }
          }
        }

        echoesFound += echoIds.length;

        if (!dryRun && echoIds.length > 0) {
          for (let i = 0; i < echoIds.length; i += 50) {
            const batch = echoIds.slice(i, i + 50);
            const { error: deleteError } = await supabase
              .from('messages')
              .delete()
              .in('id', batch);
            if (deleteError) {
              console.error(`[cleanup-forwarding-echoes] Delete error:`, deleteError);
            } else {
              echoesDeleted += batch.length;
            }
          }
        }

        conversationsScanned++;
      }

      if (timedOut) break;
      if (conversations.length < pageSize) break;
      offset += pageSize;
    }

    const result = {
      success: true,
      dryRun,
      conversationsScanned,
      echoesFound,
      echoesDeleted,
      timedOut,
      message: dryRun
        ? `Dry run: found ${echoesFound} echoes across ${conversationsScanned} conversations (nothing deleted)`
        : `Deleted ${echoesDeleted} echoes across ${conversationsScanned} conversations`,
    };

    console.log('[cleanup-forwarding-echoes] Complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[cleanup-forwarding-echoes] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
