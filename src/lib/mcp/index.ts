import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchConversationsTool from "./tools/search-conversations";
import getConversationTool from "./tools/get-conversation";
import listMyConversationsTool from "./tools/list-my-conversations";
import addInternalNoteTool from "./tools/add-internal-note";

// The OAuth issuer MUST be the direct Supabase host, built from the project ref.
// Vite inlines VITE_SUPABASE_PROJECT_ID as a literal at build time, so this stays
// import-safe (no runtime env read at module scope). The fallback only keeps the
// issuer well-formed during the throwaway manifest-extract eval.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "lovable-customer-support-hub",
  title: "lovable-customer-support-hub",
  version: "0.1.0",
  instructions:
    "Tools for the customer support hub. Use `search_conversations` to find support threads, " +
    "`get_conversation` to read a full thread including internal notes, " +
    "`list_my_conversations` for the signed-in agent's own queue, and " +
    "`add_internal_note` to leave an agent-only note on a thread. " +
    "All data is scoped to the signed-in agent's organization.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    searchConversationsTool,
    getConversationTool,
    listMyConversationsTool,
    addInternalNoteTool,
  ],
});
