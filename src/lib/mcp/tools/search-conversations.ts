import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_conversations",
  title: "Search conversations",
  description:
    "Search support conversations by subject text, status, or channel. Returns the most recently updated matches with customer name and preview text.",
  inputSchema: {
    query: z
      .string()
      .trim()
      .optional()
      .describe("Text to match against the conversation subject. Omit to list recent conversations."),
    status: z
      .string()
      .trim()
      .optional()
      .describe("Filter by status, e.g. 'open', 'pending', 'closed'."),
    channel: z
      .string()
      .trim()
      .optional()
      .describe("Filter by channel, e.g. 'email', 'widget'."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, status, channel, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }

    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("conversations")
      .select(
        "id, subject, status, priority, channel, preview_text, is_read, updated_at, customer:customers(full_name, email)",
      )
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(limit ?? 20);

    if (query) q = q.ilike("subject", `%${query}%`);
    if (status) q = q.eq("status", status);
    if (channel) q = q.eq("channel", channel);

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
