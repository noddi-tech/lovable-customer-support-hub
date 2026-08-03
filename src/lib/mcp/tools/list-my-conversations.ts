import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, resolveProfileId } from "../supabase";

export default defineTool({
  name: "list_my_conversations",
  title: "List my assigned conversations",
  description:
    "List conversations currently assigned to the signed-in agent, newest activity first. Useful for answering 'what's on my plate'.",
  inputSchema: {
    status: z
      .string()
      .trim()
      .optional()
      .describe("Filter by status, e.g. 'open'. Omit for all statuses."),
    include_archived: z
      .boolean()
      .optional()
      .describe("Include archived conversations (default false)."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, include_archived, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }

    // assigned_to_id is a ProfileId, never the auth user id.
    const profileId = await resolveProfileId(ctx);
    if (!profileId) {
      return {
        content: [{ type: "text", text: "No profile found for the signed-in user." }],
        isError: true,
      };
    }

    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("conversations")
      .select(
        "id, subject, status, priority, channel, preview_text, is_read, updated_at, customer:customers(full_name, email)",
      )
      .eq("assigned_to_id", profileId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(limit ?? 20);

    if (status) q = q.eq("status", status);
    if (!include_archived) q = q.eq("is_archived", false);

    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    const rows = (data ?? []).map((c) => {
      const customer = Array.isArray(c.customer) ? c.customer[0] : c.customer;
      return {
        id: c.id,
        subject: c.subject,
        status: c.status,
        priority: c.priority,
        channel: c.channel,
        is_read: c.is_read,
        updated_at: c.updated_at,
        customer_name: customer?.full_name ?? null,
        customer_email: customer?.email ?? null,
        preview: c.preview_text,
      };
    });

    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { conversations: rows, count: rows.length },
    };
  },
});
