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

/** Extract ALL Message-IDs from References, In-Reply-To and Message-ID headers.
 *  Returns an array of cleaned IDs (no angle brackets) for multi-ID conversation lookup.
 *  Also returns a HelpScout thread key if detected (takes priority). */
function extractAllThreadIds(headersRaw?: string | null): { helpScoutKey: string | null; allIds: string[] } {
  const references = parseHeaderValue(headersRaw, "References");
  const inReply = parseHeaderValue(headersRaw, "In-Reply-To");
  const messageId = parseHeaderValue(headersRaw, "Message-ID") || parseHeaderValue(headersRaw, "Message-Id");

  const cleanId = (id: string) => id?.replace(/[<>]/g, '').trim();

  // Check for HelpScout pattern first
  const helpScoutPattern = /reply-(\d+)-(\d+)(-\d+)?@helpscout\.net/;
  for (const header of [messageId, inReply, references]) {
    if (header) {
      const match = header.match(helpScoutPattern);
      if (match) {
        const helpScoutThreadId = `reply-${match[1]}-${match[2]}`;
        console.log(`[SendGrid-Inbound] Detected HelpScout thread: ${helpScoutThreadId}`);
        return { helpScoutKey: helpScoutThreadId, allIds: [helpScoutThreadId] };
      }
    }
  }

  // Collect ALL Message-IDs from all headers
  const allIds: string[] = [];
  const seen = new Set<string>();
  const addId = (id: string) => {
    const cleaned = cleanId(id);
    if (cleaned && !seen.has(cleaned)) {
      seen.add(cleaned);
      allIds.push(cleaned);
    }
  };

  // References can contain multiple Message-IDs
  if (references) {
    const refIds = references.match(/<[^>]+>/g);
    if (refIds) refIds.forEach(addId);
    else addId(references); // Single ID without angle brackets
  }
  if (inReply) addId(inReply);
  if (messageId) addId(messageId);

  return { helpScoutKey: null, allIds };
}

// Helper to log email ingestion events
async function logIngestion(
  supabase: any,
  data: {
    source: string;
    status: string;
    from_email?: string | null;
    to_email?: string | null;
    subject?: string | null;
    external_id?: string | null;
    conversation_id?: string | null;
    error_message?: string | null;
    metadata?: any;
  }
) {
  try {
    await supabase.from("email_ingestion_logs").insert({
      source: data.source,
      status: data.status,
      from_email: data.from_email || null,
      to_email: data.to_email || null,
      subject: data.subject || null,
      external_id: data.external_id || null,
      conversation_id: data.conversation_id || null,
      error_message: data.error_message || null,
      metadata: data.metadata || {},
    });
  } catch (e) {
    console.error("[SendGrid-Inbound] Failed to log ingestion:", e);
  }
}

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  const timestamp = new Date().toISOString();
  
  // Create supabase client early for logging
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  
  // VERBOSE ENTRY LOGGING - Log ALL requests for debugging
  console.log(`[SendGrid-Inbound][${requestId}] ========== REQUEST RECEIVED ==========`);
  console.log(`[SendGrid-Inbound][${requestId}] Timestamp: ${timestamp}`);
  console.log(`[SendGrid-Inbound][${requestId}] Method: ${req.method}`);
  console.log(`[SendGrid-Inbound][${requestId}] URL: ${req.url}`);
  console.log(`[SendGrid-Inbound][${requestId}] Headers: ${JSON.stringify(Object.fromEntries(req.headers.entries()))}`);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log(`[SendGrid-Inbound][${requestId}] Responding to OPTIONS preflight`);
    return new Response(null, { headers: corsHeaders });
  }

  // DIAGNOSTIC ENDPOINT - GET requests return health/config info
  if (req.method === "GET") {
    const diagnosticInfo = {
      status: "alive",
      timestamp,
      requestId,
      environment: {
        hasInboundToken: !!Deno.env.get("SENDGRID_INBOUND_TOKEN"),
        hasSendGridApiKey: !!Deno.env.get("SENDGRID_API_KEY"),
        hasSupabaseUrl: !!Deno.env.get("SUPABASE_URL"),
        hasServiceKey: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      },
      expectedWebhookUrl: `https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/sendgrid-inbound`,
      instructions: "POST requests from SendGrid Inbound Parse will be processed. Ensure SendGrid webhook URL matches expectedWebhookUrl with ?token=YOUR_TOKEN appended.",
    };
    
    console.log(`[SendGrid-Inbound][${requestId}] GET diagnostic request - returning config info`);
    return new Response(JSON.stringify(diagnosticInfo, null, 2), { 
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  console.log(`[SendGrid-Inbound][${requestId}] Processing ${req.method} webhook request`);

  // Log that we received a request (before auth check)
  await logIngestion(supabase, {
    source: "sendgrid",
    status: "received",
    metadata: { requestId, method: req.method, timestamp },
  });

  try {
    // Authenticate the request using header-based token (improved security)
    const expected = Deno.env.get("SENDGRID_INBOUND_TOKEN");
    if (!expected) {
      console.error(`[SendGrid-Inbound] SENDGRID_INBOUND_TOKEN not configured`);
      await logIngestion(supabase, {
        source: "sendgrid",
        status: "failed",
        error_message: "SENDGRID_INBOUND_TOKEN not configured on server",
        metadata: { requestId },
      });
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
      console.log(`[SendGrid-Inbound] Authentication failed - Invalid token. Expected length: ${expected.length}, Got length: ${finalToken?.length || 0}`);
      await logIngestion(supabase, {
        source: "sendgrid",
        status: "auth_failed",
        error_message: `Token mismatch. Expected length: ${expected.length}, Got: ${finalToken?.length || 0}`,
        metadata: { requestId, hasQueryToken: !!queryToken, hasHeaderToken: !!providedToken },
      });
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
    
    console.log(`[SendGrid-Inbound] Parsed emails - Header To: ${headerTo}, From: ${fromEmail}, Subject: ${subject}`);

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
      await logIngestion(supabase, {
        source: "sendgrid",
        status: "failed",
        from_email: fromEmail,
        to_email: rcptEmail,
        subject,
        error_message: `Missing to/from. rcptEmail: ${rcptEmail}, fromEmail: ${fromEmail}`,
        metadata: { requestId },
      });
      return new Response(JSON.stringify({ error: "Missing to/from", headerTo, rcptEmail }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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
        await logIngestion(supabase, {
          source: "sendgrid",
          status: "failed",
          from_email: fromEmail,
          to_email: rcptEmail,
          subject,
          error_message: `Organization not found for domain: ${domain}`,
          metadata: { requestId, domain },
        });
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

    // Detect group/forwarded emails: also match when From matches the route's public group_email
    // or when From has the same local part as rcptEmail but on the base domain (e.g. dekkfix.no vs inbound.dekkfix.no)
    const routeGroupEmail = route?.group_email?.toLowerCase()?.trim();
    const fromMatchesRoute = !!(routeGroupEmail && fromEmail.toLowerCase() === routeGroupEmail);
    const fromLocalPart = fromEmail.split('@')[0]?.toLowerCase();
    const rcptLocalPart = rcptEmail.split('@')[0]?.toLowerCase();
    const fromDomain = fromEmail.split('@')[1]?.toLowerCase();
    const rcptDomain = rcptEmail.split('@')[1]?.toLowerCase();
    const fromMatchesRcptBase = fromLocalPart === rcptLocalPart && rcptDomain?.endsWith(fromDomain);

    const looksLikeGroup = (fromEmail === rcptEmail) || fromMatchesRoute || fromMatchesRcptBase || / via /i.test(fromRaw) || (senderHeaderEmail && senderHeaderEmail === rcptEmail);

    if (looksLikeGroup && (replyToEmail || xOriginalFromEmail)) {
      console.log(`[SendGrid-Inbound] Detected group forwarding - Original author: ${replyToEmail || xOriginalFromEmail}`);
      authorEmail = replyToEmail || xOriginalFromEmail!;
      authorRaw = replyToRaw || xOriginalFromRaw || authorEmail;
    }
    
    const displayName = (authorRaw?.replace(/<[^>]+>/g, '').replace(/"/g, '').replace(/\s+via\s+.*/i, '').trim()) || (authorEmail?.split('@')[0] || '');
    
    console.log(`[SendGrid-Inbound] Final author determination - Email: ${authorEmail}, Display: ${displayName}`);

    // Find or create customer using the detected author (case-insensitive email match)
    const normalizedEmail = authorEmail.toLowerCase().trim();
    const { data: customerExisting } = await supabase
      .from("customers")
      .select("id")
      .eq("organization_id", organization_id)
      .ilike("email", normalizedEmail)
      .maybeSingle();

    let customer_id = customerExisting?.id as string | null;
    if (!customer_id) {
      console.log(`[SendGrid-Inbound] Creating new customer - Email: ${normalizedEmail}, Name: ${displayName}`);
      const { data: inserted, error: insErr } = await supabase
        .from("customers")
        .insert({ email: normalizedEmail, full_name: displayName, organization_id })
        .select("id")
        .single();
      if (insErr) {
        // Handle race condition: another request may have created the customer
        if (insErr.code === '23505') {
          const { data: raceCustomer } = await supabase
            .from("customers")
            .select("id")
            .eq("organization_id", organization_id)
            .ilike("email", normalizedEmail)
            .single();
          customer_id = raceCustomer?.id ?? null;
          console.log(`[SendGrid-Inbound] Race condition resolved, using customer: ${customer_id}`);
        } else {
          throw insErr;
        }
      } else {
        customer_id = inserted.id;
        console.log(`[SendGrid-Inbound] Created customer with ID: ${customer_id}`);
      }
    } else {
      console.log(`[SendGrid-Inbound] Found existing customer with ID: ${customer_id}`);
    }

    // Find or create conversation using multi-ID thread lookup
    const { helpScoutKey, allIds } = extractAllThreadIds(headersRaw);
    let threadKey: string;
    let conversation_id: string | null = null;
    let isNewConversation = true;

    if (helpScoutKey) {
      // HelpScout: use dedicated key as before
      threadKey = helpScoutKey;
      const { data: hsConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("external_id", threadKey)
        .eq("organization_id", organization_id)
        .maybeSingle();
      conversation_id = hsConv?.id ?? null;
    } else if (allIds.length > 0) {
      threadKey = allIds[0]; // Default thread key for new conversations

      // STEP 1: Check conversations.external_id for ANY of the reference IDs
      console.log(`[SendGrid-Inbound] Multi-ID lookup with ${allIds.length} IDs:`, allIds);
      const { data: convByExtId } = await supabase
        .from("conversations")
        .select("id, created_at")
        .in("external_id", allIds)
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (convByExtId && convByExtId.length > 0) {
        conversation_id = convByExtId[0].id;
        console.log(`[SendGrid-Inbound] Found conversation by external_id: ${conversation_id}`);
      } else {
        // STEP 2: Check messages.email_message_id for ANY of the reference IDs
        const { data: msgMatch } = await supabase
          .from("messages")
          .select("conversation_id, conversation:conversations!inner(organization_id)")
          .in("email_message_id", allIds)
          .limit(5);

        const orgMatch = msgMatch?.find((m: any) => m.conversation?.organization_id === organization_id);
        if (orgMatch) {
          conversation_id = orgMatch.conversation_id;
          console.log(`[SendGrid-Inbound] Found conversation by message email_message_id: ${conversation_id}`);
        }
      }
    } else {
      threadKey = `sg_${crypto.randomUUID()}`;
    }

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
      isNewConversation = false;
      console.log(`[SendGrid-Inbound] Found existing conversation with ID: ${conversation_id}`);
      
      // Update existing conversation - reopen, mark as unread, and update received_at to move to top
      const { error: updateErr } = await supabase
        .from("conversations")
        .update({
          status: "open",
          is_read: false,
          received_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", conversation_id);
      
      if (updateErr) {
        console.error(`[SendGrid-Inbound] Error updating conversation status:`, updateErr);
      } else {
        console.log(`[SendGrid-Inbound] Updated conversation to open/unread status`);
      }
    }

    // Extract and upload attachments
    const attachmentInfoRaw = form.get("attachment-info");
    const attachments: Array<{
      filename: string;
      mimeType: string;
      size: number;
      contentId?: string;
      isInline: boolean;
      storageKey: string | null;
    }> = [];

    if (attachmentInfoRaw) {
      try {
        const attachmentMeta = JSON.parse(String(attachmentInfoRaw));
        console.log(`[SendGrid-Inbound] Found attachment-info with ${Object.keys(attachmentMeta).length} attachments`);
        
        for (const [key, info] of Object.entries(attachmentMeta)) {
          const file = form.get(key) as File | null;
          if (file && typeof info === 'object') {
            const attachmentData = info as Record<string, unknown>;
            const filename = (attachmentData.filename as string) || file.name || 'attachment';
            const mimeType = (attachmentData.type as string) || file.type || 'application/octet-stream';
            const contentId = (attachmentData['content-id'] as string)?.replace(/[<>]/g, '');
            const isInline = mimeType.startsWith('image/') && !!contentId;
            
            // Upload to Supabase Storage with retry logic
            const storagePath = `${organization_id}/${conversation_id}/${crypto.randomUUID()}_${filename}`;
            const MAX_RETRIES = 3;
            let uploadAttempt = 0;
            let uploadSuccess = false;
            let lastError: unknown = null;
            
            const arrayBuffer = await file.arrayBuffer();
            
            while (uploadAttempt < MAX_RETRIES && !uploadSuccess) {
              uploadAttempt++;
              try {
                const { error: uploadError } = await supabase.storage
                  .from('message-attachments')
                  .upload(storagePath, arrayBuffer, {
                    contentType: mimeType,
                    upsert: false,
                  });
                
                if (uploadError) {
                  lastError = uploadError;
                  console.warn(`[SendGrid-Inbound] Upload attempt ${uploadAttempt}/${MAX_RETRIES} failed for ${filename}:`, uploadError);
                  if (uploadAttempt < MAX_RETRIES) {
                    await new Promise(r => setTimeout(r, 500 * uploadAttempt)); // Exponential backoff
                  }
                } else {
                  uploadSuccess = true;
                  console.log(`[SendGrid-Inbound] Uploaded attachment (attempt ${uploadAttempt}): ${storagePath}`);
                }
              } catch (err) {
                lastError = err;
                console.warn(`[SendGrid-Inbound] Upload exception attempt ${uploadAttempt}/${MAX_RETRIES} for ${filename}:`, err);
                if (uploadAttempt < MAX_RETRIES) {
                  await new Promise(r => setTimeout(r, 500 * uploadAttempt));
                }
              }
            }
            
            attachments.push({
              filename,
              mimeType,
              size: file.size,
              contentId,
              isInline,
              storageKey: uploadSuccess ? storagePath : null,
            });
            
            if (!uploadSuccess) {
              console.error(`[SendGrid-Inbound] All ${MAX_RETRIES} upload attempts failed for ${filename}:`, lastError);
              // Log failed upload for monitoring
              await logIngestion(supabase, {
                source: "sendgrid",
                status: "attachment_upload_failed",
                from_email: authorEmail,
                to_email: rcptEmail,
                subject,
                error_message: `Failed to upload ${filename} after ${MAX_RETRIES} attempts: ${String(lastError)}`,
              });
            }
          }
        }
        console.log(`[SendGrid-Inbound] Processed ${attachments.length} attachments`);
      } catch (e) {
        console.error('[SendGrid-Inbound] Failed to parse attachment-info:', e);
      }
    }

    // Insert message
    const contentHtml = html || (text ? `<pre>${text}</pre>` : "");
    const contentType = html ? "html" : (text ? "text" : "html");

    const headersObj = headersRaw ? { raw: headersRaw } : null;
    const emailMessageId = parseHeaderValue(headersRaw, "Message-ID") || parseHeaderValue(headersRaw, "Message-Id");
    
    // --- LOOP DETECTION: skip bounce-backs of our own sent messages ---
    if (emailMessageId) {
      const cleanedMessageId = emailMessageId.replace(/[<>]/g, '').trim();
      const { data: existingMsg } = await supabase
        .from("messages")
        .select("id")
        .eq("email_message_id", cleanedMessageId)
        .maybeSingle();

      if (!existingMsg) {
        // Also check with angle brackets in case stored differently
        const { data: existingMsg2 } = await supabase
          .from("messages")
          .select("id")
          .eq("email_message_id", emailMessageId)
          .maybeSingle();
        
        if (existingMsg2) {
          console.log(`[SendGrid-Inbound] LOOP DETECTED: Message-ID ${emailMessageId} already exists (msg ${existingMsg2.id}). Skipping bounce-back.`);
          await logIngestion(supabase, {
            source: "sendgrid",
            status: "skipped_duplicate",
            from_email: authorEmail,
            to_email: rcptEmail,
            subject,
            external_id: emailMessageId,
            conversation_id,
            metadata: { requestId, reason: "bounce_back_loop_detected", existingMessageId: existingMsg2.id },
          });
          return new Response(JSON.stringify({ ok: true, skipped: "duplicate_message_id" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } else {
        console.log(`[SendGrid-Inbound] LOOP DETECTED: Message-ID ${emailMessageId} already exists (msg ${existingMsg.id}). Skipping bounce-back.`);
        await logIngestion(supabase, {
          source: "sendgrid",
          status: "skipped_duplicate",
          from_email: authorEmail,
          to_email: rcptEmail,
          subject,
          external_id: emailMessageId,
          conversation_id,
          metadata: { requestId, reason: "bounce_back_loop_detected", existingMessageId: existingMsg.id },
        });
        return new Response(JSON.stringify({ ok: true, skipped: "duplicate_message_id" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }
    // --- END LOOP DETECTION ---

    console.log(`[SendGrid-Inbound] Inserting message - Content type: ${contentType}, Length: ${contentHtml.length}, Message-ID: ${emailMessageId}, Attachments: ${attachments.length}`);
    
    const { data: insertedMessage, error: msgErr } = await supabase
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
        external_id: emailMessageId || `sg_${crypto.randomUUID()}`,
        attachments: attachments.length > 0 ? attachments : null,
      })
      .select('id')
      .single();
    if (msgErr) throw msgErr;

    // Log successful processing
    await logIngestion(supabase, {
      source: "sendgrid",
      status: "processed",
      from_email: authorEmail,
      to_email: rcptEmail,
      subject,
      external_id: threadKey,
      conversation_id,
      metadata: { requestId, messageId: insertedMessage?.id, customerId: customer_id },
    });

    // Create notification for new email (handled by database trigger for customer replies)
    // For new conversations, we create an explicit notification here
    if (isNewConversation) {
      // Get agents to notify (inbox members or org admins)
      const { data: agentsToNotify } = await supabase
        .from('organization_memberships')
        .select('user_id')
        .eq('organization_id', organization_id)
        .eq('status', 'active')
        .in('role', ['agent', 'admin', 'super_admin'])
        .limit(5);

      if (agentsToNotify && agentsToNotify.length > 0) {
        const notifications = agentsToNotify.map(agent => ({
          user_id: agent.user_id,
          title: `New Email: ${subject || 'No subject'}`,
          message: `New email from ${displayName || authorEmail}`,
          type: 'new_email',
          data: {
            conversation_id,
            message_id: insertedMessage?.id,
            customer_name: displayName,
            customer_email: authorEmail,
            subject: subject,
            inbox_id,
            urgency: 'normal'
          }
        }));

        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notifError) {
          console.error(`[SendGrid-Inbound] Error creating notifications:`, notifError);
        } else {
          console.log(`[SendGrid-Inbound] Created ${notifications.length} notifications for new email`);
        }
      }
    }

    console.log(`[SendGrid-Inbound] Successfully processed email - Conversation: ${conversation_id}, Customer: ${customer_id}`);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error(`[SendGrid-Inbound] Error processing webhook:`, error);
    await logIngestion(supabase, {
      source: "sendgrid",
      status: "failed",
      error_message: error instanceof Error ? error.message : String(error),
      metadata: { requestId },
    });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
