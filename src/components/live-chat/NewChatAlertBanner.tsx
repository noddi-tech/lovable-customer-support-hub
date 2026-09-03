import { MessageSquareDot, X } from "lucide-react"
import type React from "react"
import { Button } from "@/components/ui/button"
import { useNewChatAlerts } from "@/hooks/useNewChatAlerts"
import { useNavigate } from "@/router/compat"

/**
 * Loud, always-visible banner shown to online agents when a customer starts a
 * new live chat. Sits on top of the app so it can't be missed on any route.
 */
export const NewChatAlertBanner: React.FC = () => {
  const { alerts, dismiss, dismissAll } = useNewChatAlerts()
  const navigate = useNavigate()

  if (alerts.length === 0) return null

  const [latest] = alerts
  const extra = alerts.length - 1

  const open = () => {
    navigate("/interactions/chat/active")
    dismissAll()
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-3 pt-3">
      <div className="pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-lg border border-primary/40 bg-primary text-primary-foreground shadow-lg animate-fade-in p-3">
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15">
          <MessageSquareDot className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">New live chat waiting</p>
          <p className="truncate text-xs opacity-90">
            {latest.visitorName}
            {extra > 0 && ` + ${extra} more waiting`}
          </p>
        </div>

        <Button size="sm" variant="secondary" className="h-9 shrink-0" onClick={open}>
          Answer
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Dismiss new chat alert"
          className="h-9 w-9 shrink-0 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
          onClick={() => dismiss(latest.sessionId)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
