import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"

export interface ChatCsat {
  rating: number
  comment?: string
  resolved?: boolean | null
  rated_at?: string
}

/**
 * Post-chat survey answers (rating / "was your problem solved" / comment)
 * captured by the widget and stored on the chat session metadata.
 */
export const useChatCsat = (conversationId?: string) => {
  return useQuery({
    queryKey: ["chat-csat", conversationId],
    enabled: !!conversationId,
    refetchInterval: 15000,
    queryFn: async (): Promise<ChatCsat | null> => {
      const { data, error } = await supabase
        .from("widget_chat_sessions")
        .select("metadata, updated_at")
        .eq("conversation_id", conversationId)
        .order("updated_at", { ascending: false })
        .limit(1)

      if (error) return null

      const metadata = (data?.[0]?.metadata ?? null) as Record<string, any> | null
      const csat = metadata?.csat
      if (!csat || typeof csat.rating !== "number") return null

      return {
        rating: csat.rating,
        comment: typeof csat.comment === "string" ? csat.comment : undefined,
        resolved: typeof csat.resolved === "boolean" ? csat.resolved : null,
        rated_at: typeof csat.rated_at === "string" ? csat.rated_at : undefined,
      }
    },
  })
}
