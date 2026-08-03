import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "add_internal_note",
  title: "Add internal note",
  description:
    "Add an internal note to a conversation. Notes are visible to agents only and are never emailed to the customer.",
  inputSchema: {
    conversation_id: z.string().uuid().describe("The conversation to attach the note to."),
    note: z.string().trim().min(1).describe("The note text. Plain text."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ conversation_id, note }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }

    const supabase = supabaseForUser(ctx);

    // Confirm the caller can actually see this conversation before writing.
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id")
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

    // messages.sender_id stores the auth user id (not the ProfileId).
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id,
        sender_id: ctx.getUserId(),
        sender_type: "agent",
        is_internal: true,
        content: note,
        content_type: "text",
      })
      .select("id, created_at")
      .maybeSingle();

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    return {
      content: [{ type: "text", text: `Internal note added (id ${data?.id}).` }],
      structuredContent: { message_id: data?.id, created_at: data?.created_at },
    };
  },
});
