import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useCaseQueueCounts } from "@/hooks/useCases"
import { supabase } from "@/integrations/supabase/client"

export interface SidebarNavCounts {
  text: number
  chat: number
  cases: number
}

/**
 * Counts used for the small number overlays on the sidebar nav icons.
 * - text: open text conversations (same source as the inbox list "All inboxes" count)
 * - chat: active live chat conversations (widget channel, open/pending)
 * - cases: cases in an open state
 */
export const useSidebarNavCounts = (): SidebarNavCounts => {
  const { user, loading, profile } = useAuth()
  const queryClient = useQueryClient()
  const organizationId = profile?.organization_id

  // Reuse the exact same query the Cases page uses, so the badge always matches "All open"
  const { data: caseCounts } = useCaseQueueCounts()

  const { data } = useQuery({
    queryKey: ["sidebar-nav-counts", organizationId],
    enabled: !!user && !loading,
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: false,
    // Keep the last known counts while refetching / when the org id resolves,
    // so the badges don't flash off and back on.
    placeholderData: (previous: SidebarNavCounts | undefined) => previous as never,
    queryFn: async (): Promise<SidebarNavCounts> => {
      const [allCountsRes, chatRes, aiChatRes] = await Promise.all([
        // Same RPC the inbox list uses, so the badge matches "All inboxes"
        (supabase.rpc as any)("get_all_counts"),
        (() => {
          let q = (supabase.from("conversations") as any)
            .select("id", { count: "exact", head: true })
            .eq("channel", "widget")
            .in("status", ["open", "pending"])
            .is("deleted_at", null)
          if (organizationId) q = q.eq("organization_id", organizationId)
          return q
        })(),
        (() => {
          // AI chats that are live (bot handling, escalated, or human-assigned)
          let q = (supabase.from("widget_ai_conversations") as any)
            .select("id", { count: "exact", head: true })
            .in("status", ["active", "escalated", "assigned"])
          if (organizationId) q = q.eq("organization_id", organizationId)
          return q
        })(),
      ])

      const row = allCountsRes?.data?.[0]
      const textOpen = Number(row?.conversations_open) || 0
      const chatActive = (chatRes?.count ?? 0) + (aiChatRes?.count ?? 0)

      return {
        // Inbox badge must match the "All inboxes" open count exactly (live chats included)
        text: textOpen,
        chat: chatActive,
        cases: 0, // filled in from useCaseQueueCounts below
      }
    },
  })

  // Keep the badges fresh when conversations or chat sessions change
  useEffect(() => {
    if (!user || loading) return

    let timer: ReturnType<typeof setTimeout> | undefined
    const invalidate = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ["sidebar-nav-counts"] })
      }, 2000)
    }

    // Unique topic per mount: Supabase caches channels by topic name, so a
    // shared name collides when the hook mounts in >1 component (or under
    // StrictMode double-mount), yielding "cannot add postgres_changes
    // callbacks ... after subscribe()".
    const channel = supabase
      .channel(`sidebar-nav-counts-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, invalidate)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "widget_chat_sessions" },
        invalidate,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "widget_ai_conversations" },
        invalidate,
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "cases" }, () => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          void queryClient.invalidateQueries({ queryKey: ["case-queue-counts"] })
        }, 2000)
      })
      .subscribe()

    return () => {
      if (timer) clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  }, [user, loading, queryClient])

  return {
    text: data?.text ?? 0,
    chat: data?.chat ?? 0,
    cases: caseCounts?.open ?? 0,
  }
}
