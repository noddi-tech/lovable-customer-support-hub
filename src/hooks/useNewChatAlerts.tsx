import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useRef, useState } from "react"
import { useAgentAvailability } from "@/hooks/useAgentAvailability"
import { useAuth } from "@/hooks/useAuth"
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications"
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences"
import { useNotificationSound } from "@/hooks/useNotificationSound"
import { supabase } from "@/integrations/supabase/client"

export interface NewChatAlert {
  sessionId: string
  visitorName: string
  startedAt: string
}

/**
 * While the agent is online for live chat, watch for brand new customer chat
 * sessions and surface them loudly: a browser notification (even when the tab
 * is in the background) plus an in-app banner the agent must acknowledge.
 */
export function useNewChatAlerts() {
  const { user, profile } = useAuth()
  const { status } = useAgentAvailability()
  const { showNotification, permission } = useBrowserNotifications()
  const { preferences } = useNotificationPreferences()
  const { playNotificationSound } = useNotificationSound()
  const queryClient = useQueryClient()

  const [alerts, setAlerts] = useState<NewChatAlert[]>([])
  const seenRef = useRef<Set<string>>(new Set())
  const organizationId = profile?.organization_id
  const isOnline = status === "online"
  const desktopChatEnabled =
    (preferences?.desktop_enabled ?? true) && (preferences?.desktop_on_chat_message ?? true)

  const dismiss = useCallback((sessionId: string) => {
    setAlerts((prev) => prev.filter((a) => a.sessionId !== sessionId))
  }, [])

  const dismissAll = useCallback(() => setAlerts([]), [])

  useEffect(() => {
    if (!user || !organizationId || !isOnline) return

    const channel = supabase
      .channel("new-chat-session-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "widget_chat_sessions" },
        (payload) => {
          void (async () => {
            const session = payload.new as {
              id: string
              status: string
              visitor_name: string | null
              visitor_email: string | null
              started_at: string | null
              widget_config_id: string | null
            }

            if (seenRef.current.has(session.id)) return
            if (session.status !== "waiting" && session.status !== "active") return

            // Scope to this organization's widgets
            if (session.widget_config_id) {
              const { data: config } = await supabase
                .from("widget_configs")
                .select("id, organization_id")
                .eq("id", session.widget_config_id)
                .maybeSingle()
              if (!config || config.organization_id !== organizationId) return
            }

            seenRef.current.add(session.id)

            const visitorName = session.visitor_name || session.visitor_email || "New visitor"

            setAlerts((prev) => [
              {
                sessionId: session.id,
                visitorName,
                startedAt: session.started_at || new Date().toISOString(),
              },
              ...prev.filter((a) => a.sessionId !== session.id),
            ])

            playNotificationSound()
            void queryClient.invalidateQueries({ queryKey: ["sidebar-nav-counts"] })
            void queryClient.invalidateQueries({ queryKey: ["live-chat-sessions"] })

            if (permission === "granted" && desktopChatEnabled) {
              const notification = await showNotification({
                title: "💬 New live chat",
                body: `${visitorName} is waiting for a reply`,
                tag: `chat-session-${session.id}`,
                requireInteraction: true,
                data: { sessionId: session.id },
              })
              if (notification) {
                notification.onclick = () => {
                  window.focus()
                  window.location.href = "/interactions/chat/active"
                  notification.close()
                }
              }
            }
          })()
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "widget_ai_conversations" },
        (payload) => {
          const conv = payload.new as {
            id: string
            status: string
            organization_id: string
            visitor_name: string | null
            visitor_email: string | null
            escalated_at: string | null
          }
          const prev = payload.old as { status?: string } | undefined

          // Only fire when a chat *becomes* escalated, once per conversation.
          if (conv.status !== "escalated") return
          if (prev?.status === "escalated") return
          if (conv.organization_id !== organizationId) return
          const alertKey = `ai-escalation-${conv.id}`
          if (seenRef.current.has(alertKey)) return
          seenRef.current.add(alertKey)

          const visitorName = conv.visitor_name || conv.visitor_email || "A visitor"
          setAlerts((prev2) => [
            {
              sessionId: alertKey,
              visitorName,
              startedAt: conv.escalated_at || new Date().toISOString(),
            },
            ...prev2.filter((a) => a.sessionId !== alertKey),
          ])

          playNotificationSound()
          void queryClient.invalidateQueries({ queryKey: ["sidebar-nav-counts"] })
          void queryClient.invalidateQueries({ queryKey: ["chat-conversations"] })
          void queryClient.invalidateQueries({ queryKey: ["chat-counts"] })

          if (permission === "granted" && desktopChatEnabled) {
            void showNotification({
              title: "🙋 Customer wants a human",
              body: `${visitorName} asked to talk to a person`,
              tag: alertKey,
              requireInteraction: true,
              data: { sessionId: alertKey },
            }).then((notification) => {
              if (notification) {
                notification.onclick = () => {
                  window.focus()
                  window.location.href = "/interactions/chat/active"
                  notification.close()
                }
              }
            })
          }
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [
    user,
    organizationId,
    isOnline,
    permission,
    desktopChatEnabled,
    showNotification,
    playNotificationSound,
    queryClient,
  ])

  // Drop alerts when the agent goes offline
  useEffect(() => {
    if (!isOnline) setAlerts([])
  }, [isOnline])

  return { alerts, dismiss, dismissAll, isOnline }
}
