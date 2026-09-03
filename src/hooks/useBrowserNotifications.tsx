import { useCallback, useEffect, useState } from "react"

export type NotificationPermission = "default" | "granted" | "denied"

interface BrowserNotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: any
  requireInteraction?: boolean
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

export const useBrowserNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    // Check if notifications are supported
    const supported = "Notification" in window
    setIsSupported(supported)

    if (supported) {
      setPermission(Notification.permission as NotificationPermission)
    }
  }, [])

  /** Re-read the live browser permission (e.g. after the user changed it in site settings). */
  const refreshPermission = useCallback((): NotificationPermission => {
    if (!("Notification" in window)) return "denied"
    const current = Notification.permission as NotificationPermission
    setPermission(current)
    return current
  }, [])

  // Keep in sync when the user changes the setting in another tab / browser UI
  useEffect(() => {
    if (!isSupported) return
    const onFocus = () => setPermission(Notification.permission as NotificationPermission)
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onFocus)
    return () => {
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onFocus)
    }
  }, [isSupported])

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    // Read support from the live window — do not rely on React state (starts false).
    if (!("Notification" in window)) {
      console.warn("Browser notifications are not supported")
      return "denied"
    }

    try {
      // Safari / older browsers may use the callback form and not return a Promise.
      const result = await new Promise<NotificationPermission>((resolve, reject) => {
        let settled = false
        const finish = (permission: NotificationPermission) => {
          if (settled) return
          settled = true
          resolve(permission)
        }

        try {
          const maybePromise = Notification.requestPermission((permission) => {
            finish(permission as NotificationPermission)
          })
          if (
            maybePromise != null &&
            typeof (maybePromise as PromiseLike<NotificationPermission>).then === "function"
          ) {
            Promise.resolve(maybePromise).then(
              (permission) => finish(permission as NotificationPermission),
              reject,
            )
          }
        } catch (error) {
          reject(error)
        }
      })

      setPermission(result)
      return result
    } catch (error) {
      console.error("Error requesting notification permission:", error)
      return "denied"
    }
  }, [])

  const showNotification = useCallback(
    async (options: BrowserNotificationOptions): Promise<Notification | null> => {
      // Request permission if not already granted
      if (permission !== "granted") {
        const newPermission = await requestPermission()
        if (newPermission !== "granted") {
          return null
        }
      }

      try {
        const notification = new Notification(options.title, {
          body: options.body,
          icon: options.icon || "/favicon.ico",
          badge: options.badge,
          tag: options.tag,
          data: options.data,
          requireInteraction: options.requireInteraction,
          silent: false,
        })

        // Auto-close after 10 seconds if not requireInteraction
        if (!options.requireInteraction) {
          setTimeout(() => {
            notification.close()
          }, 10000)
        }

        return notification
      } catch (error) {
        console.error("Error showing notification:", error)
        return null
      }
    },
    [permission, requestPermission],
  )

  return {
    permission,
    isSupported,
    requestPermission,
    refreshPermission,
    showNotification,
  }
}
