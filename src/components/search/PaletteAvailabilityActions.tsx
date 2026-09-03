import { Circle, LogIn, LogOut, Phone } from "lucide-react"
import type React from "react"
import { toast } from "sonner"
import { CommandGroup, CommandItem } from "@/components/ui/command"
import { type AvailabilityStatus, useAgentAvailability } from "@/hooks/useAgentAvailability"
import { usePhoneSession } from "@/hooks/usePhoneSession"
import { cn } from "@/lib/utils"

const CHAT_STATUSES: {
  value: AvailabilityStatus
  label: string
  color: string
  title: string
  description: string
}[] = [
  {
    value: "online",
    label: "Online",
    color: "text-green-500",
    title: "You are now online for chat",
    description: "Visitors can start live chats with you",
  },
  {
    value: "away",
    label: "Away",
    color: "text-yellow-500",
    title: "Status set to Away",
    description: "You will still receive chat notifications",
  },
  {
    value: "offline",
    label: "Offline",
    color: "text-muted-foreground",
    title: "You are now offline",
    description: "Live chat is disabled for visitors",
  },
]

interface PaletteAvailabilityActionsProps {
  /** Close the palette after running an action. */
  onDone: () => void
}

/**
 * Command palette group for setting chat availability and
 * logging in/out of the Aircall phone system.
 */
export const PaletteAvailabilityActions: React.FC<PaletteAvailabilityActionsProps> = ({
  onDone,
}) => {
  const { status, setStatus, isUpdating } = useAgentAvailability()
  const phone = usePhoneSession()

  return (
    <>
      <CommandGroup heading="Chat availability">
        {CHAT_STATUSES.map((option) => (
          <CommandItem
            key={option.value}
            value={`availability-chat-${option.value}-${option.label}`}
            disabled={isUpdating}
            onSelect={() => {
              void setStatus(option.value)
              toast.success(option.title, { description: option.description })
              onDone()
            }}
          >
            <Circle className={cn("mr-2 h-3 w-3 flex-shrink-0 fill-current", option.color)} />
            <span className="text-sm">Set chat status: {option.label}</span>
            {status === option.value && (
              <span className="ml-auto text-xs text-muted-foreground">Current</span>
            )}
          </CommandItem>
        ))}
      </CommandGroup>

      {phone.isConfigured && (
        <CommandGroup heading="Phone">
          <CommandItem
            value={
              phone.isLoggedIn
                ? "availability-phone-logout-aircall-sign-out"
                : "availability-phone-login-aircall-sign-in"
            }
            onSelect={() => {
              if (phone.isLoggedIn) {
                phone.logout()
              } else {
                phone.login()
              }
              onDone()
            }}
          >
            {phone.isLoggedIn ? (
              <LogOut className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            ) : (
              <LogIn className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            )}
            <span className="text-sm">
              {phone.isLoggedIn ? "Logout from Aircall" : "Login to Aircall"}
            </span>
            <Phone
              className={cn(
                "ml-auto h-3.5 w-3.5",
                phone.isLoggedIn ? "text-green-500" : "text-muted-foreground",
              )}
            />
          </CommandItem>
        </CommandGroup>
      )}
    </>
  )
}
