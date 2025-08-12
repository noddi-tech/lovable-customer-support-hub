import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractEmail(value?: string | null): string | null {
  if (!value) return null;
  const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0].toLowerCase() : null;
}

function cleanDisplayName(raw?: string | null): string {
  if (!raw) return "";
  return raw
    .replace(/<[^>]+>/g, "")
    .replace(/"/g, "")
    .replace(/\s+via\s+.*/i, "")
    .trim();
}

type HeaderArray = Array<{ name: string; value: string }>; // Gmail style

type MessageRecord = {
  id: string;
  conversation_id: string;
  email_headers: any;
  is_internal: boolean;
  sender_type: string;
  created_at: string;
  email_subject: string | null;
};

function getHeaderFromArray(arr: HeaderArray | undefined | null, name: string): string | null {
  if (!arr) return null;
  const h = arr.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return h ? h.value : null;
}

function parseHeaderFromRaw(raw: string | null | undefined, name: string): string | null {
  if (!raw) return null;
  const regex = new RegExp(`^${name}:\s*(.+)$`, "im");
  const m = raw.match(regex);
  return m ? m[1].trim() : null;
}

function resolveHeader(headers: any, name: string): string | null {
  if (!headers) return null;
  // Array form
  if (Array.isArray(headers)) {
    return getHeaderFromArray(headers as HeaderArray, name);
  }
  // Raw string form { raw: string }
  const raw = typeof headers?.raw === "string" ? headers.raw : null;
  return parseHeaderFromRaw(raw, name);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const body = await req.json().catch(() => ({}));
    const limitConversations: number = Math.min(Math.max(Number(body?.limitConversations) || 300, 1), 2000);
    const sinceDays: number = Math.min(Math.max(Number(body?.sinceDays) || 365, 1), 3650);
    const dryRun: boolean = Boolean(body?.dryRun) || false;
    const onlyConversationId: string | null = body?.conversation_id || null;

    // Resolve organization for current user
    const { data: orgIdData, error: orgErr } = await supabase.rpc("get_user_organization_id");
    if (orgErr || !orgIdData) {
      return new Response(JSON.stringify({ error: "Failed to resolve organization", details: orgErr?.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const orgId = orgIdData as string;

    // Load inbound route addresses for heuristics
    const { data: routes } = await supabase
      .from("inbound_routes")
      .select("address")
      .eq("organization_id", orgId);
    const inboundAddresses = new Set((routes || []).map((r: any) => String(r.address).toLowerCase()));

    // Build conversations filter
    const sinceIso = new Date(Date.now() - sinceDays * 24 * 3600 * 1000).toISOString();
    let convQuery = supabase
      .from("conversations")
      .select("id, customer_id, subject, channel, updated_at")
      .eq("channel", "email")
      .gte("updated_at", sinceIso)
      .eq("organization_id", orgId)
      .order("updated_at", { ascending: true })
      .limit(limitConversations);

    if (onlyConversationId) {
      convQuery = supabase
        .from("conversations")
        .select("id, customer_id, subject, channel, updated_at")
        .eq("id", onlyConversationId)
        .eq("organization_id", orgId)
        .limit(1);
    }

    const { data: conversations, error: convErr } = await convQuery;
    if (convErr) throw convErr;

    if (!conversations || conversations.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0, updated: 0, skipped: 0 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const convIds = conversations.map((c: any) => c.id);

    // Fetch all candidate messages for these conversations
    const { data: msgs, error: msgFetchErr } = await supabase
      .from("messages")
      .select("id, conversation_id, email_headers, is_internal, sender_type, created_at, email_subject")
      .in("conversation_id", convIds)
      .eq("is_internal", false)
      .eq("sender_type", "customer")
      .order("created_at", { ascending: true });

    if (msgFetchErr) throw msgFetchErr;

    const earliestByConv = new Map<string, MessageRecord>();
    for (const m of (msgs || []) as MessageRecord[]) {
      if (!earliestByConv.has(m.conversation_id)) {
        earliestByConv.set(m.conversation_id, m);
      }
    }

    let processed = 0;
    let updated = 0;
    let skipped = 0;

    for (const conv of conversations) {
      processed++;
      const msg = earliestByConv.get(conv.id);
      if (!msg) {
        skipped++;
        continue;
      }

      const headers = msg.email_headers;
      const fromRaw = resolveHeader(headers, "From");
      const replyToRaw = resolveHeader(headers, "Reply-To");
      const xOriginalFromRaw = resolveHeader(headers, "X-Original-From") || resolveHeader(headers, "X-Google-Original-From");
      const senderRaw = resolveHeader(headers, "Sender");
      const toRaw = resolveHeader(headers, "To");
      const deliveredToRaw = resolveHeader(headers, "Delivered-To");

      const fromEmail = extractEmail(fromRaw);
      const replyToEmail = extractEmail(replyToRaw);
      const xOriginalFromEmail = extractEmail(xOriginalFromRaw);
      const senderHeaderEmail = extractEmail(senderRaw);
      const toEmail = extractEmail(toRaw);
      const deliveredToEmail = extractEmail(deliveredToRaw);

      // Determine the rcpt email as one of our inbound addresses if present
      let rcptEmail: string | null = null;
      if (deliveredToEmail && inboundAddresses.has(deliveredToEmail)) rcptEmail = deliveredToEmail;
      else if (toEmail && inboundAddresses.has(toEmail)) rcptEmail = toEmail;

      // Heuristic: group forwarding if From equals rcpt or shows "via", or Sender equals rcpt
      const looksLikeGroup = (!!rcptEmail && fromEmail === rcptEmail) || /\svia\s/i.test(fromRaw || "") || (!!rcptEmail && senderHeaderEmail === rcptEmail);

      let authorEmail = fromEmail;
      let authorRaw = fromRaw || "";
      if (looksLikeGroup && (replyToEmail || xOriginalFromEmail)) {
        authorEmail = replyToEmail || xOriginalFromEmail || fromEmail;
        authorRaw = replyToRaw || xOriginalFromRaw || authorRaw;
      }

      authorEmail = authorEmail || fromEmail; // fallback
      if (!authorEmail) {
        skipped++;
        continue;
      }

      const displayName = cleanDisplayName(authorRaw) || authorEmail.split("@")[0];

      // Find or create customer
      const { data: existingCust } = await supabase
        .from("customers")
        .select("id, full_name")
        .eq("organization_id", orgId)
        .eq("email", authorEmail)
        .maybeSingle();

      let customerId: string | null = existingCust?.id || null;

      if (!customerId && !dryRun) {
        const { data: ins, error: insErr } = await supabase
          .from("customers")
          .insert({ email: authorEmail, full_name: displayName, organization_id: orgId })
          .select("id")
          .single();
        if (insErr) throw insErr;
        customerId = ins.id;
      }

      // Optionally update the customer's name if it's empty or contains "via"
      if (!dryRun && customerId && existingCust && (!existingCust.full_name || /\svia\s/i.test(existingCust.full_name))) {
        await supabase
          .from("customers")
          .update({ full_name: displayName })
          .eq("id", customerId)
          .eq("organization_id", orgId);
      }

      // Update conversation link
      if (customerId && conv.customer_id !== customerId) {
        if (!dryRun) {
          const { error: updErr } = await supabase
            .from("conversations")
            .update({ customer_id: customerId })
            .eq("id", conv.id)
            .eq("organization_id", orgId);
          if (updErr) throw updErr;
        }
        updated++;
      } else {
        skipped++;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, processed, updated, skipped }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("backfill-sender-fix error", error);
    return new Response(JSON.stringify({ error: String(error?.message || error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
