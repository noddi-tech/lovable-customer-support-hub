import { ExternalLink, MonitorSmartphone, RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications"
import { useDesktopEmailNotificationsSetting } from "@/hooks/useDesktopEmailNotifications"

/** The Lovable preview runs inside an iframe, where browsers block notification prompts. */
const isInIframe = typeof window !== "undefined" && window.self !== window.top

/**
 * Permission + master switch for OS-level notifications. Rendered as a banner above
 * the per-event notification matrix; the matrix owns the individual desktop toggles.
 */
export function DesktopEmailNotificationSettings() {
  const { permission, isSupported, requestPermission, refreshPermission } =
    useBrowserNotifications()
  const { enabled, setEnabled, isUpdating } = useDesktopEmailNotificationsSetting()
  const [optimisticEnabled, setOptimisticEnabled] = useState<boolean | null>(null)
  const [isRequesting, setIsRequesting] = useState(false)

  const serverChecked = enabled && permission === "granted"
  const checked = optimisticEnabled ?? serverChecked

  useEffect(() => {
    if (optimisticEnabled === null) return
    if (optimisticEnabled === serverChecked) {
      setOptimisticEnabled(null)
    }
  }, [optimisticEnabled, serverChecked])

  const handleToggle = async (next: boolean) => {
    if (!next) {
      setOptimisticEnabled(false)
      try {
        await setEnabled(false)
      } catch (error) {
        setOptimisticEnabled(null)
        const message = error instanceof Error ? error.message : "Failed to update preferences"
        toast.error(message)
      }
      return
    }

    setOptimisticEnabled(true)
    setIsRequesting(true)
    try {
      let nextPermission = permission
      if (nextPermission !== "granted") {
        nextPermission = await requestPermission()
        if (nextPermission !== "granted") {
          setOptimisticEnabled(null)
          if (nextPermission === "denied") {
            toast.error("Browser notifications are blocked. Allow them in your browser settings.")
          } else {
            toast.info("Permission was not granted. Flip the toggle again to ask the browser.")
          }
          return
        }
      }

      await setEnabled(true)
      toast.success("Desktop notifications enabled on this account")
    } catch (error) {
      setOptimisticEnabled(null)
      const message = error instanceof Error ? error.message : "Failed to update preferences"
      toast.error(message)
    } finally {
      setIsRequesting(false)
    }
  }

  const handleRecheck = async () => {
    const current = refreshPermission()
    if (current === "granted") {
      setOptimisticEnabled(true)
      try {
        await setEnabled(true)
        toast.success("Desktop notifications enabled on this account")
      } catch (error) {
        setOptimisticEnabled(null)
        const message = error instanceof Error ? error.message : "Failed to update preferences"
        toast.error(message)
      }
    } else if (current === "denied") {
      toast.error("Still blocked — allow notifications in your browser site settings, then reload.")
    } else {
      toast.info("Permission reset — flip the toggle to ask again.")
    }
  }

  if (!isSupported) {
    return (
      <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
        This browser does not support desktop notifications, so that column is unavailable.
      </div>
    )
  }

  const helperText =
    permission === "denied"
      ? "Blocked for this site — you have to re-allow them in the browser itself."
      : permission === "default"
        ? "Click the toggle to allow browser notifications, then we’ll turn Desktop on for your account."
        : "OS-level popups that reach you even when Support Hub is in a background tab. Required for the Desktop column below."

  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-2">
          <MonitorSmartphone className="mt-0.5 h-4 w-4 text-muted-foreground" />
          <div className="space-y-0.5">
            <Label
              htmlFor="desktop-email-notifications"
              className="text-sm font-medium cursor-pointer"
            >
              Desktop notifications
            </Label>
            <p className="text-xs text-muted-foreground">{helperText}</p>
          </div>
        </div>
        {permission === "denied" ? (
          <Button variant="outline" size="sm" onClick={handleRecheck}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Re-check
          </Button>
        ) : (
          <Switch
            id="desktop-email-notifications"
            checked={checked}
            onCheckedChange={handleToggle}
            disabled={isUpdating || isRequesting}
          />
        )}
      </div>

      {permission === "denied" && (
        <div className="rounded-md border bg-background p-3 text-xs text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">How to unblock</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>Click the lock / settings icon left of the address bar.</li>
            <li>
              Set <span className="font-medium">Notifications</span> to “Allow” (or reset the
              permission).
            </li>
            <li>Reload this page, then press “Re-check”.</li>
          </ul>
          {isInIframe && (
            <p>
              You are viewing this inside an embedded preview, where browsers refuse the
              notification prompt. Open the app in its own tab to enable them.
            </p>
          )}
        </div>
      )}

      {isInIframe && permission !== "granted" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(window.location.href, "_blank", "noopener")}
        >
          <ExternalLink className="mr-2 h-3.5 w-3.5" />
          Open app in a new tab
        </Button>
      )}
    </div>
  )
}
