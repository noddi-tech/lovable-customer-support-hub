import { Radio } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  type NoddiTicketPriority,
  type NoddiTicketStatus,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  ticketSourceLabel,
} from "@/types/noddiTicket"

const STATUS_CLASSES: Record<NoddiTicketStatus, string> = {
  OPEN: "bg-primary/10 text-primary border-primary/20",
  SNOOZED: "bg-muted text-muted-foreground border-border",
  RESOLVED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  ARCHIVED: "bg-muted/60 text-muted-foreground border-border",
}

const PRIORITY_CLASSES: Record<NoddiTicketPriority, string> = {
  LOW: "bg-muted text-muted-foreground border-border",
  NORMAL: "bg-secondary text-secondary-foreground border-border",
  HIGH: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  URGENT: "bg-destructive/10 text-destructive border-destructive/20",
}

export function TicketStatusBadge({ status }: { status: NoddiTicketStatus }) {
  return (
    <Badge variant="outline" className={cn("text-[11px] font-medium", STATUS_CLASSES[status])}>
      {TICKET_STATUS_LABELS[status] ?? status}
    </Badge>
  )
}

export function TicketPriorityBadge({ priority }: { priority: NoddiTicketPriority }) {
  return (
    <Badge variant="outline" className={cn("text-[11px] font-medium", PRIORITY_CLASSES[priority])}>
      {TICKET_PRIORITY_LABELS[priority] ?? priority}
    </Badge>
  )
}

/** Shows where the ticket was originally created (Support Hub, Noddi Admin, API, …). */
export function TicketSourceBadge({ source }: { source?: string | null }) {
  const label = ticketSourceLabel(source)
  const isSupportHub = (source ?? "").toUpperCase().startsWith("SUPPORT")
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 text-[11px] font-medium",
        isSupportHub
          ? "bg-primary/10 text-primary border-primary/20"
          : "bg-muted text-muted-foreground border-border",
      )}
      title={`Created from ${label}`}
    >
      <Radio className="h-3 w-3" />
      {label}
    </Badge>
  )
}
