import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "./useAuth"
import { useBrowserNotifications } from "./useBrowserNotifications"
import { useNotificationSound } from "./useNotificationSound"

export const useRealtimeNotifications = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { showNotification, permission } = useBrowserNotifications()
  const { playMentionSound, playNotificationSound } = useNotificationSound()

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          void (async () => {
            const notification = payload.new as any

            // Invalidate queries to update notification badge
            void queryClient.invalidateQueries({ queryKey: ["notifications"] })
            void queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] })

            // Play sound based on notification type
            if (notification.type === "mention") {
              playMentionSound()
            } else {
              playNotificationSound()
            }

            // Show toast notification
            toast(notification.title, {
              description: notification.message,
              action: notification.data?.ticket_id
                ? {
                    label: "View Ticket",
                    onClick: () => {
                      window.location.href = `/operations/tickets?ticket=${notification.data.ticket_id}`
                    },
                  }
                : notification.data?.conversation_id
                  ? {
                      label: "View",
                      onClick: () => {
                        const messagePath = notification.data?.message_id
                          ? `/m/${notification.data.message_id}`
                          : ""
                        window.location.href = `/c/${notification.data.conversation_id}${messagePath}`
                      },
                    }
                  : undefined,
            })

            // Show browser notification if permission granted
            if (permission === "granted") {
              await showNotification({
                title: notification.title,
                body: notification.message,
                tag: notification.id,
                data: notification.data,
              })
            }
          })()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user, queryClient, showNotification, permission, playMentionSound, playNotificationSound])
}
