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
  const { preferences, updatePreferences, updatePreferencesAsync, isUpdating } =
    useNotificationPreferences()
  const migratedRef = useRef(false)

  const enabled = preferences?.desktop_enabled ?? true

  // One-time migration: local opt-in wins until it has been persisted server-side.
  useEffect(() => {
    if (!preferences || migratedRef.current) return
    migratedRef.current = true
    if (!preferences.desktop_enabled && isDesktopEmailNotificationsEnabled()) {
      updatePreferences({ desktop_enabled: true })
    }
  }, [preferences, updatePreferences])

  const setEnabled = useCallback(
    async (v: boolean) => {
      setDesktopEmailNotificationsEnabled(v)
      await updatePreferencesAsync({ desktop_enabled: v })
    },
    [updatePreferencesAsync],
  )

  return { enabled, setEnabled, isUpdating, preferences }
}

type NotificationRow = {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  data: Record<string, unknown> | null
}

function conversationIdFromData(data: Record<string, unknown> | null): string | null {
  if (!data) return null
  const id = data.conversation_id
  return typeof id === "string" ? id : null
}

function isViewingConversation(conversationId: string | null): boolean {
  if (!conversationId) return false
  return document.visibilityState === "visible" && window.location.pathname.includes(conversationId)
}

/**
 * Global listener: shows a browser (desktop) notification whenever a new
 * inbound customer email/chat message arrives, or when a personal notification
 * row is inserted for events with desktop_on_* prefs.
 * Mounted once in the app layout.
 */
export function useDesktopEmailNotifications() {
  const { user } = useAuth()
  const { showNotification, permission } = useBrowserNotifications()
  const { preferences, isLoading, updatePreferences } = useNotificationPreferences()
  const seenMessagesRef = useRef<Set<string>>(new Set())
  const seenNotifsRef = useRef<Set<string>>(new Set())
  const migratedRef = useRef(false)

  // Prefs win when loaded; while loading, allow notifications if browser permission is granted.
  const enabled =
    preferences != null ? preferences.desktop_enabled : isLoading && permission === "granted"
  const emailEnabled = preferences?.desktop_on_new_email ?? true
  const chatEnabled = preferences?.desktop_on_chat_message ?? true
  // No dedicated per-event columns exist for these on notification_preferences;
  // they follow the overall desktop_enabled toggle instead.
  const assignmentEnabled = true
  const mentionEnabled = true
  const incomingCallEnabled = true
  const missedCallEnabled = true
  const voicemailEnabled = true
  const slaEnabled = true

  // Persist localStorage opt-in to server so the auto-permission prompt enables desktop prefs
  // without requiring a visit to Settings.
  useEffect(() => {
    if (!preferences || migratedRef.current) return
    if (permission !== "granted") return
    migratedRef.current = true
    if (!preferences.desktop_enabled && isDesktopEmailNotificationsEnabled()) {
      updatePreferences({ desktop_enabled: true })
    }
  }, [preferences, permission, updatePreferences])

  useEffect(() => {
    if (!user || !enabled || permission !== "granted") return
    if (!emailEnabled && !chatEnabled) return

    const channel = supabase
      .channel("desktop-email-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          void (async () => {
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
            if (seenMessagesRef.current.has(message.id)) return
            seenMessagesRef.current.add(message.id)

            if (isViewingConversation(message.conversation_id)) return

            // RLS scopes this: no row means the user can't access the inbox
            const { data: conversation } = await supabase
              .from("conversations")
              .select("id, subject, channel, customer:customers(full_name, email)")
              .eq("id", message.conversation_id)
              .maybeSingle()

            if (!conversation) return
            const channelName: string = conversation.channel || "email"
            const isChat = ["chat", "live_chat", "widget"].includes(channelName)
            if (!isChat && channelName !== "email") return
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
          })()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user, enabled, emailEnabled, chatEnabled, permission, showNotification])

  useEffect(() => {
    if (!user || !enabled || permission !== "granted") return

    const anyPersonalDesktop =
      assignmentEnabled ||
      mentionEnabled ||
      incomingCallEnabled ||
      missedCallEnabled ||
      voicemailEnabled ||
      slaEnabled
    if (!anyPersonalDesktop) return

    const channel = supabase
      .channel("desktop-personal-notifications")
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
            const row = payload.new as NotificationRow
            if (seenNotifsRef.current.has(row.id)) return
            seenNotifsRef.current.add(row.id)

            const data = row.data || {}
            const conversationId = conversationIdFromData(data)
            if (isViewingConversation(conversationId)) return

            const eventType = typeof data.event_type === "string" ? data.event_type : null
            let allowed = false
            let href: string | null = conversationId ? `/c/${conversationId}` : null

            if (row.type === "assignment") {
              allowed = assignmentEnabled
            } else if (row.type === "mention") {
              allowed = mentionEnabled
              if (!href && typeof data.ticket_id === "string") {
                href = `/service-tickets?ticket=${data.ticket_id}`
              }
            } else if (eventType === "call_started") {
              allowed = incomingCallEnabled
            } else if (eventType === "call_missed") {
              allowed = missedCallEnabled
            } else if (eventType === "voicemail_received") {
              allowed = voicemailEnabled
            } else if (row.type === "sla_breach" || row.type === "sla_warning") {
              allowed = slaEnabled
            } else {
              return
            }

            if (!allowed) return

            const notification = await showNotification({
              title: row.title,
              body: row.message,
              tag: `notification-${row.id}`,
              requireInteraction: row.type === "mention" || eventType === "call_started",
              data: { notificationId: row.id, conversationId },
            })

            if (notification && href) {
              notification.onclick = () => {
                window.focus()
                window.location.href = href!
                notification.close()
              }
            } else if (notification) {
              notification.onclick = () => {
                window.focus()
                notification.close()
              }
            }
          })()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user, enabled, permission, showNotification])
}
