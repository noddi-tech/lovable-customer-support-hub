import { Bell, Loader2, Mail, MonitorSmartphone } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications"
import {
  type NotificationPreferences,
  useNotificationPreferences,
} from "@/hooks/useNotificationPreferences"
import { DesktopEmailNotificationSettings } from "./DesktopEmailNotificationSettings"

type PrefKey = keyof NotificationPreferences

interface EventRow {
  label: string
  description: string
  app?: PrefKey
  email?: PrefKey
  desktop?: PrefKey
}

interface EventGroup {
  title: string
  rows: EventRow[]
}

const GROUPS: EventGroup[] = [
  {
    title: "Conversations",
    rows: [
      {
        label: "New customer email",
        description: "Desktop OS popup when an email arrives in an inbox you can access",
        desktop: "desktop_on_new_email",
      },
      {
        label: "New chat message",
        description: "Desktop OS popup when a live-chat visitor sends a message",
        desktop: "desktop_on_chat_message",
      },
      {
        label: "Conversation assigned to me",
        description: "Someone assigns a conversation to you",
        app: "app_on_conversation_assigned",
      },
      {
        label: "Mentions",
        description: "Someone @mentions you in a note or comment",
        app: "app_on_mention",
        email: "email_on_mention",
      },
    ],
  },
  {
    title: "Calls",
    rows: [
      {
        label: "Incoming call",
        description: "A call is ringing for your team",
        app: "app_on_incoming_call",
      },
      {
        label: "Missed call",
        description: "A call was not answered",
        app: "app_on_missed_call",
      },
      {
        label: "Voicemail",
        description: "A caller left a voicemail",
        app: "app_on_voicemail",
      },
    ],
  },
  {
    title: "Tickets & SLA",
    rows: [
      {
        label: "Ticket assigned",
        description: "A ticket is assigned to you",
        app: "app_on_ticket_assigned",
        email: "email_on_ticket_assigned",
      },
      {
        label: "New comment",
        description: "Someone comments on your ticket",
        app: "app_on_ticket_commented",
        email: "email_on_ticket_commented",
      },
      {
        label: "Ticket updates",
        description: "A ticket you're involved with is updated",
        app: "app_on_ticket_updated",
        email: "email_on_ticket_updated",
      },
      {
        label: "SLA breach warning",
        description: "An SLA is about to breach or has breached",
        app: "app_on_sla_breach",
        email: "email_on_sla_breach",
      },
    ],
  },
]

function ChannelCell({
  id,
  ariaLabel,
  prefKey,
  preferences,
  onToggle,
  disabled,
}: {
  id: string
  ariaLabel: string
  prefKey?: PrefKey
  preferences: NotificationPreferences
  onToggle: (key: PrefKey) => (checked: boolean) => void
  disabled?: boolean
}) {
  if (!prefKey) {
    return (
      <span className="text-xs text-muted-foreground/50" aria-hidden>
        —
      </span>
    )
  }
  return (
    <Switch
      id={id}
      aria-label={ariaLabel}
      checked={Boolean(preferences[prefKey])}
      onCheckedChange={onToggle(prefKey)}
      disabled={disabled}
    />
  )
}

export function UserNotificationSettings() {
  const { preferences, isLoading, updatePreferences, isUpdating } = useNotificationPreferences()
  const { permission, isSupported } = useBrowserNotifications()

  const handleToggle = (key: PrefKey) => (checked: boolean) => {
    updatePreferences({ [key]: checked })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!preferences) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Unable to load notification preferences.
        </CardContent>
      </Card>
    )
  }

  const desktopDisabled = !isSupported || permission !== "granted" || !preferences.desktop_enabled

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notifications</CardTitle>
          <CardDescription>
            Pick how you want to hear about each event. <span className="font-medium">In-app</span>{" "}
            shows a toast and adds to the bell while you have Support Hub open,{" "}
            <span className="font-medium">Email</span> sends a message to your inbox, and{" "}
            <span className="font-medium">Desktop</span> pops up from your operating system even
            when the app is in a background tab.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <DesktopEmailNotificationSettings />

          {/* Column headings */}
          <div className="grid grid-cols-[1fr_repeat(3,4.5rem)] items-end gap-2 border-b pb-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Event
            </span>
            <span className="flex flex-col items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Bell className="h-4 w-4" />
              In-app
            </span>
            <span className="flex flex-col items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Mail className="h-4 w-4" />
              Email
            </span>
            <span className="flex flex-col items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <MonitorSmartphone className="h-4 w-4" />
              Desktop
            </span>
          </div>

          {GROUPS.map((group, groupIndex) => (
            <div key={group.title} className="space-y-1">
              {groupIndex > 0 && <Separator className="mb-3" />}
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.title}
              </h3>
              {group.rows.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[1fr_repeat(3,4.5rem)] items-center gap-2 py-2"
                >
                  <div className="space-y-0.5 pr-4">
                    <Label className="text-sm font-medium">{row.label}</Label>
                    <p className="text-xs text-muted-foreground">{row.description}</p>
                  </div>
                  <div className="flex justify-center">
                    <ChannelCell
                      id={`app-${row.app ?? row.label}`}
                      ariaLabel={`In-app notification for ${row.label}`}
                      prefKey={row.app}
                      preferences={preferences}
                      onToggle={handleToggle}
                      disabled={isUpdating}
                    />
                  </div>
                  <div className="flex justify-center">
                    <ChannelCell
                      id={`email-${row.email ?? row.label}`}
                      ariaLabel={`Email notification for ${row.label}`}
                      prefKey={row.email}
                      preferences={preferences}
                      onToggle={handleToggle}
                      disabled={isUpdating}
                    />
                  </div>
                  <div className="flex justify-center">
                    <ChannelCell
                      id={`desktop-${row.desktop ?? row.label}`}
                      ariaLabel={`Desktop notification for ${row.label}`}
                      prefKey={row.desktop}
                      preferences={preferences}
                      onToggle={handleToggle}
                      disabled={isUpdating || desktopDisabled}
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
