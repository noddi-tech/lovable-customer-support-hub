import { supabase } from '@/integrations/supabase/client';
import { sanitizeStorageFilename } from '@/utils/storageKey';

export interface CreateConversationInput {
  customerEmail: string;
  customerName: string;
  subject: string;
  initialMessage: string;
  inboxId: string;
  priority: string;
  organizationId?: string | null;
  senderProfileUserId?: string | null;
  /** Optional files to attach to the first outgoing message. */
  files?: File[];
}

export interface CreateConversationResult {
  conversationId: string;
  emailSent: boolean;
  emailError?: string;
}

/**
 * Creates (or reuses) the customer, creates the conversation, inserts the first
 * agent message and triggers the outbound email. Shared by every compose
 * surface so behaviour stays identical across single and bulk sends.
 */
export async function createConversationAndSend(
  input: CreateConversationInput,
): Promise<CreateConversationResult> {
  const email = input.customerEmail.trim().toLowerCase();

  // 1. Customer
  let customerId: string;
  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingCustomer) {
    customerId = existingCustomer.id;
  } else {
    const { data: newCustomer, error: customerError } = await supabase
      .from('customers')
      .insert({
        email,
        full_name: input.customerName,
        organization_id: input.organizationId,
      })
      .select('id')
      .single();
    if (customerError) throw customerError;
    customerId = newCustomer.id;
  }

  // 2. Resolve a sending identity for the inbox
  let emailAccountId: string | null = null;
  let canSendEmail = false;
  try {
    const { data: emailAccounts, error: emailError } = await supabase
      .from('email_accounts')
      .select('id')
      .eq('inbox_id', input.inboxId)
      .limit(1);

    if (!emailError && emailAccounts && emailAccounts.length > 0) {
      emailAccountId = emailAccounts[0].id;
      canSendEmail = true;
    } else {
      const { data: inboundRoutes } = await supabase
        .from('inbound_routes')
        .select('id, group_email')
        .eq('inbox_id', input.inboxId)
        .eq('is_active', true)
        .limit(1);
      if (inboundRoutes?.length && inboundRoutes[0].group_email) {
        canSendEmail = true;
      }
    }
  } catch (error) {
    console.warn('Error resolving sending identity for inbox:', error);
  }

  // 3. Conversation
  const { data: conversation, error: conversationError } = await supabase
    .from('conversations')
    .insert({
      subject: input.subject,
      customer_id: customerId,
      inbox_id: input.inboxId,
      priority: input.priority,
      status: 'open',
      channel: 'email',
      organization_id: input.organizationId,
      email_account_id: emailAccountId,
    })
    .select('id')
    .single();

  if (conversationError) throw conversationError;

  // 4. First message + send
  let emailSent = false;
  let emailErrorMessage: string | undefined;

  // 4a. Upload attachments (abort the send if any upload fails)
  let attachmentsMeta: Array<Record<string, unknown>> | null = null;
  if (input.files && input.files.length > 0) {
    const orgId = input.organizationId;
    if (!orgId) throw new Error('No organization ID for file upload');

    const uploaded: { meta: Record<string, unknown>; storagePath: string }[] = [];
    for (const file of input.files) {
      const uniqueName = `${crypto.randomUUID()}_${sanitizeStorageFilename(file.name)}`;
      const storagePath = `${orgId}/${conversation.id}/${uniqueName}`;
      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(storagePath, file);

      if (uploadError) {
        if (uploaded.length > 0) {
          await supabase.storage
            .from('message-attachments')
            .remove(uploaded.map((u) => u.storagePath));
        }
        throw new Error(`Couldn't upload ${file.name} — email not sent`);
      }

      uploaded.push({
        storagePath,
        meta: {
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          storageKey: storagePath,
          isInline: false,
        },
      });
    }
    attachmentsMeta = uploaded.map((u) => u.meta);
  }

  if (input.initialMessage.trim() || attachmentsMeta) {
    const { data: newMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        content: input.initialMessage,
        sender_type: 'agent',
        sender_id: input.senderProfileUserId,
        content_type: 'text',
        is_internal: false,
        email_status: 'pending',
        email_subject: input.subject,
        ...(attachmentsMeta ? { attachments: attachmentsMeta } : {}),
      })
      .select('id')
      .single();

    if (messageError) throw messageError;

    if (canSendEmail && newMessage) {
      const { error: sendError } = await supabase.functions.invoke('send-reply-email', {
        body: { messageId: newMessage.id },
      });

      if (sendError) {
        emailErrorMessage = sendError.message || 'Failed to send email';
        await supabase.from('messages').update({ email_status: 'failed' }).eq('id', newMessage.id);
      } else {
        emailSent = true;
      }
    } else {
      emailErrorMessage = 'No email account or inbound route connected to this inbox';
    }
  }

  return { conversationId: conversation.id, emailSent, emailError: emailErrorMessage };
}
