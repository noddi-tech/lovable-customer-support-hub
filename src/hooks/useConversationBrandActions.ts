import { useEntityBrandActions } from "@/hooks/useEntityBrandActions"

const INVALIDATE_KEYS = ["conversations", "chat-conversations", "conversation"]

/**
 * Lets agents categorise incoming email / text conversations by brand.
 *
 * The brand name (matching the Noddi backend brand catalog) is stored on
 * `conversations.metadata.brand`, the same field the widget uses, so every
 * brand badge in the app resolves logo + theme color the same way.
 */
export function useConversationBrandActions() {
  return useEntityBrandActions({
    table: "conversations",
    invalidateKeys: INVALIDATE_KEYS,
    context: "useConversationBrandActions",
  })
}
