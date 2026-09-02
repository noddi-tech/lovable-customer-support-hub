import { useCallback, useEffect, useRef } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "./useAuth"
import { useBrowserNotifications } from "./useBrowserNotifications"
import { useNotificationPreferences } from "./useNotificationPreferences"

const STORAGE_KEY = "desktop-email-notifications-enabled"

/**
 * Legacy local flag. Preferences now live in `notification_preferences.desktop_enabled`
 * so the choice follows the user across devices; the local value is kept for one
 * release as a migration fallback (and for the pre-auth permission prompt).
 */
export function isDesktopEmailNotificationsEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true"
}

export function setDesktopEmailNotificationsEnabled(enabled: boolean) {
  localStorage.setItem(STORAGE_KEY, String(enabled))
}

export function useDesktopEmailNotificationsSetting() {
  const { preferences, updatePreferences, isUpdating } = useNotificationPreferences()
  const migratedRef = useRef(false)

  const enabled = preferences?.desktop_enabled ?? false

  // One-time migration: local opt-in wins until it has been persisted server-side.
  useEffect(() => {
    if (!preferences || migratedRef.current) return
    migratedRef.current = true
    if (!preferences.desktop_enabled && isDesktopEmailNotificationsEnabled()) {
      updatePreferences({ desktop_enabled: true })
    }
  }, [preferences, updatePreferences])

  const setEnabled = useCallback(
    (v: boolean) => {
      setDesktopEmailNotificationsEnabled(v)
      updatePreferences({ desktop_enabled: v })
    },
    [updatePreferences],
  )

  return { enabled, setEnabled, isUpdating, preferences }
}

/**
 * Global listener: shows a browser (desktop) notification whenever a new
 * inbound customer email arrives in an inbox the current user can access.
 * Mounted once in the app layout.
 */
export function useDesktopEmailNotifications() {
  const { user } = useAuth()
  const { showNotification, permission } = useBrowserNotifications()
  const { preferences } = useNotificationPreferences()
  const seenRef = useRef<Set<string>>(new Set())

  const enabled = preferences?.desktop_enabled ?? false
  const emailEnabled = preferences?.desktop_on_new_email ?? true
  const chatEnabled = preferences?.desktop_on_chat_message ?? true

  useEffect(() => {
    if (!user || !enabled || permission !== "granted") return
    if (!emailEnabled && !chatEnabled) return

    const channel = supabase
      .channel("desktop-email-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const message = payload.new as {
            id: string
            conversation_id: string
            sender_type: string
            is_internal: boolean
            content: string | null
            email_subject: string | null
          }

          // Only inbound customer messages, never our own replies or internal notes
          if (message.sender_type !== "customer" || message.is_internal) return
          if (seenRef.current.has(message.id)) return
          seenRef.current.add(message.id)

          // Don't notify for the conversation the user is actively reading
          const isViewingConversation =
            document.visibilityState === "visible" &&
            window.location.pathname.includes(message.conversation_id)
          if (isViewingConversation) return

          // RLS scopes this: no row means the user can't access the inbox
          const { data: conversation } = await supabase
            .from("conversations")
            .select("id, subject, channel, customer:customers(full_name, email)")
            .eq("id", message.conversation_id)
            .maybeSingle()

          if (!conversation) return
          const channel: string = conversation.channel || "email"
          const isChat = ["chat", "live_chat", "widget"].includes(channel)
          if (!isChat && channel !== "email") return
          if (isChat ? !chatEnabled : !emailEnabled) return

          const customer = conversation.customer as {
            full_name?: string | null
            email?: string | null
          } | null
          const from =
            customer?.full_name || customer?.email || (isChat ? "New chat message" : "New email")
          const subject = message.email_subject || conversation.subject || "(no subject)"
          const preview = (message.content || "")
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 160)

          const notification = await showNotification({
            title: isChat ? `💬 ${from}` : `${from}: ${subject}`,
            body: preview || (isChat ? "New chat message" : "New email received"),
            tag: `conversation-${message.conversation_id}`,
            requireInteraction: isChat,
            data: { conversationId: message.conversation_id },
          })

          if (notification) {
            notification.onclick = () => {
              window.focus()
              window.location.href = `/c/${message.conversation_id}`
              notification.close()
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, enabled, emailEnabled, chatEnabled, permission, showNotification])
}
