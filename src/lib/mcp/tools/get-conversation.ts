import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_conversation",
  title: "Get conversation with messages",
  description:
    "Fetch one conversation by id together with its messages in chronological order, including internal notes. Use this to read the full history of a support thread.",
  inputSchema: {
    conversation_id: z.string().uuid().describe("The conversation id."),
    message_limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Max messages to return, newest-biased (default 30)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ conversation_id, message_limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }

    const supabase = supabaseForUser(ctx);

    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select(
        "id, subject, status, priority, channel, created_at, updated_at, customer:customers(full_name, email, phone)",
      )
      .eq("id", conversation_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (convError) {
      return { content: [{ type: "text", text: convError.message }], isError: true };
    }
    if (!conversation) {
      return {
        content: [{ type: "text", text: `No conversation found with id ${conversation_id}` }],
        isError: true,
      };
    }

    const { data: messages, error: msgError } = await supabase
      .from("messages")
      .select("id, sender_type, is_internal, content, content_type, email_status, created_at")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: false })
      .limit(message_limit ?? 30);

    if (msgError) {
      return { content: [{ type: "text", text: msgError.message }], isError: true };
    }

    const customer = Array.isArray(conversation.customer)
      ? conversation.customer[0]
      : conversation.customer;

    const result = {
      id: conversation.id,
      subject: conversation.subject,
      status: conversation.status,
      priority: conversation.priority,
      channel: conversation.channel,
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
      customer: customer
        ? { name: customer.full_name, email: customer.email, phone: customer.phone }
        : null,
      // Reversed back into chronological (oldest first) reading order.
      messages: (messages ?? []).slice().reverse().map((m) => ({
        id: m.id,
        from: m.sender_type,
        is_internal_note: m.is_internal,
        content: m.content,
        content_type: m.content_type,
        email_status: m.email_status,
        created_at: m.created_at,
      })),
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: { conversation: result },
    };
  },
});
