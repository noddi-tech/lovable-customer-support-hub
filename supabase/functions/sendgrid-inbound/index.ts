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

function parseHeaderValue(headersRaw?: string | null, name?: string): string | null {
  if (!headersRaw || !name) return null;
  const regex = new RegExp(`^${name}:\s*(.+)$`, "im");
  const m = headersRaw.match(regex);
  return m ? m[1].trim() : null;
}

function getThreadKey(headersRaw?: string | null): string | null {
  const references = parseHeaderValue(headersRaw, "References");
  const inReply = parseHeaderValue(headersRaw, "In-Reply-To");
  const messageId = parseHeaderValue(headersRaw, "Message-ID") || parseHeaderValue(headersRaw, "Message-Id");
  
  // Check for HelpScout pattern first (reply-{id1}-{id2}-*@helpscout.net)
  const helpScoutPattern = /reply-(\d+)-(\d+)(-\d+)?@helpscout\.net/;
  
  // Check Message-ID for HelpScout
  if (messageId) {
    const match = messageId.match(helpScoutPattern);
    if (match) {
      const helpScoutThreadId = `reply-${match[1]}-${match[2]}`;
      console.log(`[SendGrid-Inbound] Detected HelpScout Message-ID: ${helpScoutThreadId}`);
      return helpScoutThreadId;
    }
  }
  
  // Check In-Reply-To for HelpScout
  if (inReply) {
    const match = inReply.match(helpScoutPattern);
    if (match) {
      const helpScoutThreadId = `reply-${match[1]}-${match[2]}`;
      console.log(`[SendGrid-Inbound] Detected HelpScout In-Reply-To: ${helpScoutThreadId}`);
      return helpScoutThreadId;
    }
  }
  
  // Check References for HelpScout
  if (references) {
    const match = references.match(helpScoutPattern);
    if (match) {
      const helpScoutThreadId = `reply-${match[1]}-${match[2]}`;
      console.log(`[SendGrid-Inbound] Detected HelpScout References: ${helpScoutThreadId}`);
      return helpScoutThreadId;
    }
  }
  
  // PRIORITY 1: First Message-ID from References (thread root)
  const refFirst = references ? (references.match(/<[^>]+>/g)?.[0] || references) : null;
  
  // PRIORITY 2: In-Reply-To (fallback), PRIORITY 3: Message-ID (new thread)
  return (refFirst || inReply || messageId || null)?.replace(/[<>]/g, "") || null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`[SendGrid-Inbound] ${new Date().toISOString()} - Incoming webhook request`);

  try {
    // Authenticate the request using header-based token (improved security)
    const expected = Deno.env.get("SENDGRID_INBOUND_TOKEN");
    if (!expected) {
      console.error(`[SendGrid-Inbound] SENDGRID_INBOUND_TOKEN not configured`);
      return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check for token in Authorization header (preferred) or X-SendGrid-Token header
    const authHeader = req.headers.get('Authorization');
    const tokenHeader = req.headers.get('X-SendGrid-Token');
    const providedToken = authHeader?.replace('Bearer ', '') || tokenHeader;
    
    // Fallback to URL query parameter for backward compatibility (will be deprecated)
    const url = new URL(req.url);
    const queryToken = url.searchParams.get("token");
    
    const finalToken = providedToken || queryToken;
    
    console.log(`[SendGrid-Inbound] Authentication check - Header auth: ${!!providedToken}, Query auth: ${!!queryToken}`);
    
    if (finalToken !== expected) {
      console.log(`[SendGrid-Inbound] Authentication failed - Invalid token`);
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    
    if (queryToken && !providedToken) {
      console.warn(`[SendGrid-Inbound] ⚠️ Using deprecated query parameter authentication. Please migrate to header-based auth (Authorization: Bearer <token> or X-SendGrid-Token: <token>).`);
    } else {
      console.log(`[SendGrid-Inbound] ✅ Authentication successful (header-based)`);
    }

    const form = await req.formData();
    const toRaw = String(form.get("to") || "");
    const fromRaw = String(form.get("from") || "");
    const subject = String(form.get("subject") || "");
    const html = form.get("html") ? String(form.get("html")) : null;
    const text = form.get("text") ? String(form.get("text")) : null;
    const headersRaw = form.get("headers") ? String(form.get("headers")) : null;
    const envelopeStr = form.get("envelope") ? String(form.get("envelope")) : null;

    const headerTo = extractEmail(toRaw);
    const fromEmail = extractEmail(fromRaw);
    
    console.log(`[SendGrid-Inbound] Parsed emails - Header To: ${headerTo}, From: ${fromEmail}`);

    // Use the SMTP envelope recipient when present (Google Group forwarding keeps To: as public address)
    let rcptEmail: string | null = headerTo;
    let envelope: any = null;
    try {
      envelope = envelopeStr ? JSON.parse(envelopeStr) : null;
      const envToCandidate = typeof envelope?.to === 'string' ? envelope.to : (Array.isArray(envelope?.to) ? envelope.to[0] : null);
      const envTo = extractEmail(envToCandidate);
      if (envTo) rcptEmail = envTo;
    } catch {}

    console.log(`[SendGrid-Inbound] Final recipient determination - RCPT: ${rcptEmail}, Header To: ${headerTo}, From: ${fromEmail}`);
    
    if (!rcptEmail || !fromEmail) {
      console.log(`[SendGrid-Inbound] Missing required fields - rcptEmail: ${rcptEmail}, fromEmail: ${fromEmail}`);
      return new Response(JSON.stringify({ error: "Missing to/from", headerTo, rcptEmail }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Lookup inbound route using the actual SMTP recipient (rcptEmail)
    let { data: route, error: routeError } = await supabase
      .from("inbound_routes")
      .select("*, domain:email_domains(*)")
      .eq("address", rcptEmail)
      .maybeSingle();

    let organization_id: string;
    let inbox_id: string | null = null;

    if (route && !routeError) {
      // Found direct inbound route
      console.log(`[SendGrid-Inbound] Found direct inbound route for ${rcptEmail} - Org: ${route.organization_id}, Inbox: ${route.inbox_id}`);
      organization_id = route.organization_id as string;
      inbox_id = route.inbox_id as string | null;
    } else {
      // Try to find organization and inbox via email routing function
      // First get organization (fallback to demo org for now)
      const domain = rcptEmail.split('@')[1];
      const { data: org } = await supabase
        .from("organizations")  
        .select("id")
        .eq("slug", domain === 'noddi.no' || domain === 'inbound.noddi.no' ? 'noddi' : 'demo')
        .single();
      
      if (!org) {
        console.log(`[SendGrid-Inbound] Organization not found for domain: ${domain}`);
        return new Response(JSON.stringify({ error: "Organization not found", rcptEmail, domain }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      
      console.log(`[SendGrid-Inbound] Using fallback routing - Org: ${org.id}, Domain: ${domain}`);
      organization_id = org.id;
      
      // Use the routing function to determine inbox
      const { data: routedInboxId } = await supabase
        .rpc('get_inbox_for_email', { 
          recipient_email: rcptEmail, 
          org_id: organization_id 
        });
      
      console.log(`[SendGrid-Inbound] Routed to inbox: ${routedInboxId}`);
      inbox_id = routedInboxId;
    }

    // Determine the real author (handle Google Groups/List rewrites like "via Hei")
    const replyToRaw = parseHeaderValue(headersRaw, "Reply-To");
    const xOriginalFromRaw = parseHeaderValue(headersRaw, "X-Original-From") || parseHeaderValue(headersRaw, "X-Google-Original-From");
    const senderRawHeader = parseHeaderValue(headersRaw, "Sender");

    const replyToEmail = extractEmail(replyToRaw);
    const xOriginalFromEmail = extractEmail(xOriginalFromRaw);
    const senderHeaderEmail = extractEmail(senderRawHeader);

    let authorRaw = fromRaw;
    let authorEmail = fromEmail;

    const looksLikeGroup = (fromEmail === rcptEmail) || / via /i.test(fromRaw) || (senderHeaderEmail && senderHeaderEmail === rcptEmail);

    if (looksLikeGroup && (replyToEmail || xOriginalFromEmail)) {
      console.log(`[SendGrid-Inbound] Detected group forwarding - Original author: ${replyToEmail || xOriginalFromEmail}`);
      authorEmail = replyToEmail || xOriginalFromEmail!;
      authorRaw = replyToRaw || xOriginalFromRaw || authorEmail;
    }
    
    const displayName = (authorRaw?.replace(/<[^>]+>/g, '').replace(/"/g, '').replace(/\s+via\s+.*/i, '').trim()) || (authorEmail?.split('@')[0] || '');
    
    console.log(`[SendGrid-Inbound] Final author determination - Email: ${authorEmail}, Display: ${displayName}`);

    // Find or create customer using the detected author
    const { data: customerExisting } = await supabase
      .from("customers")
      .select("id")
      .eq("email", authorEmail)
      .eq("organization_id", organization_id)
      .maybeSingle();

    let customer_id = customerExisting?.id as string | null;
    if (!customer_id) {
      console.log(`[SendGrid-Inbound] Creating new customer - Email: ${authorEmail}, Name: ${displayName}`);
      const { data: inserted, error: insErr } = await supabase
        .from("customers")
        .insert({ email: authorEmail, full_name: displayName, organization_id })
        .select("id")
        .single();
      if (insErr) throw insErr;
      customer_id = inserted.id;
      console.log(`[SendGrid-Inbound] Created customer with ID: ${customer_id}`);
    } else {
      console.log(`[SendGrid-Inbound] Found existing customer with ID: ${customer_id}`);
    }

    // Find or create conversation by thread key
    const threadKey = getThreadKey(headersRaw) || `sg_${crypto.randomUUID()}`;

    const { data: existingConv } = await supabase
      .from("conversations")
      .select("id")
      .eq("external_id", threadKey)
      .eq("organization_id", organization_id)
      .maybeSingle();

    let conversation_id = existingConv?.id as string | null;
    if (!conversation_id) {
      console.log(`[SendGrid-Inbound] Creating new conversation - Thread: ${threadKey}, Subject: ${subject}`);
      const { data: convIns, error: convErr } = await supabase
        .from("conversations")
        .insert({
          subject: subject || null,
          channel: "email",
          organization_id,
          inbox_id,
          customer_id,
          external_id: threadKey,
          received_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (convErr) throw convErr;
      conversation_id = convIns.id;
      console.log(`[SendGrid-Inbound] Created conversation with ID: ${conversation_id}`);
    } else {
      console.log(`[SendGrid-Inbound] Found existing conversation with ID: ${conversation_id}`);
      
      // Update existing conversation - reopen and mark as unread when customer replies
      const { error: updateErr } = await supabase
        .from("conversations")
        .update({
          status: "open",
          is_read: false,
          updated_at: new Date().toISOString()
        })
        .eq("id", conversation_id);
      
      if (updateErr) {
        console.error(`[SendGrid-Inbound] Error updating conversation status:`, updateErr);
        // Don't throw - message insertion is more critical
      } else {
        console.log(`[SendGrid-Inbound] Updated conversation to open/unread status`);
      }
    }

    // Insert message
    const contentHtml = html || (text ? `<pre>${text}</pre>` : "");
    const contentType = html ? "html" : (text ? "text" : "html");

    const headersObj = headersRaw ? { raw: headersRaw } : null;
    const emailMessageId = parseHeaderValue(headersRaw, "Message-ID") || parseHeaderValue(headersRaw, "Message-Id");
    
    console.log(`[SendGrid-Inbound] Inserting message - Content type: ${contentType}, Length: ${contentHtml.length}, Message-ID: ${emailMessageId}`);
    
    const { error: msgErr } = await supabase
      .from("messages")
      .insert({
        conversation_id,
        is_internal: false,
        sender_type: "customer",
        content: contentHtml,
        content_type: contentType,
        email_subject: subject || null,
        email_headers: headersObj,
        email_message_id: emailMessageId,
        email_thread_id: threadKey,
        external_id: threadKey,
      });
    if (msgErr) throw msgErr;

    console.log(`[SendGrid-Inbound] Successfully processed email - Conversation: ${conversation_id}, Customer: ${customer_id}`);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error(`[SendGrid-Inbound] Error processing webhook:`, error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
