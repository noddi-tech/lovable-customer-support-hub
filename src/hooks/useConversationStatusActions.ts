import { useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"
import { logger } from "@/utils/logger"

export type QuickConversationStatus = "open" | "pending" | "closed"

const STATUS_LABEL: Record<QuickConversationStatus, string> = {
  open: "Reopened",
  pending: "Set to pending",
  closed: "Closed",
}

/**
 * Shared quick-status actions used by right-click context menus in the
 * conversation list and the live chat list.
 */
export function useConversationStatusActions() {
  const queryClient = useQueryClient()

  const setStatus = useCallback(
    async (conversationId: string, status: QuickConversationStatus) => {
      try {
        const { error } = await supabase
          .from("conversations")
          .update({ status })
          .eq("id", conversationId)

        if (error) throw error

        toast.success(STATUS_LABEL[status])
        queryClient.invalidateQueries({ queryKey: ["conversations"] })
        queryClient.invalidateQueries({ queryKey: ["chat-conversations"] })
        queryClient.invalidateQueries({ queryKey: ["conversation-counts"] })
      } catch (error) {
        logger.error("Failed to change conversation status", error, "useConversationStatusActions")
        toast.error("Failed to change status")
      }
    },
    [queryClient],
  )

  return { setStatus }
}
