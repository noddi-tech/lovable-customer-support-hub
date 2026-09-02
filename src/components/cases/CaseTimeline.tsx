import {
  ArrowRight,
  CalendarClock,
  Flag,
  type LucideIcon,
  PlusCircle,
  RefreshCcw,
  UserRound,
} from "lucide-react"
import { CaseStatusBadge } from "@/components/cases/CaseBadges"
import { Skeleton } from "@/components/ui/skeleton"
import { CASE_STATUS_LABELS, type CaseStatus, useCaseEvents } from "@/hooks/useCases"
import { useDateFormatting } from "@/hooks/useDateFormatting"

const EVENT_LABELS: Record<string, string> = {
  created: "Case created",
  status_changed: "Status changed",
  owner_changed: "Owner changed",
  priority_changed: "Priority changed",
  due_changed: "Due date changed",
}

const EVENT_ICONS: Record<string, LucideIcon> = {
  created: PlusCircle,
  status_changed: RefreshCcw,
  owner_changed: UserRound,
  priority_changed: Flag,
  due_changed: CalendarClock,
}

const isStatus = (value: string | null): value is CaseStatus =>
  !!value && value in CASE_STATUS_LABELS

function formatValue(eventType: string, value: string | null) {
  if (!value) return "—"
  if (eventType === "status_changed" || eventType === "created") {
    return CASE_STATUS_LABELS[value as CaseStatus] ?? value
  }
  if (eventType === "due_changed") {
    const d = new Date(value)
    return Number.isNaN(d.getTime())
      ? value
      : d.toLocaleString("nb-NO", {
          timeZone: "Europe/Oslo",
          dateStyle: "short",
          timeStyle: "short",
        })
  }
  return value
}

export function CaseTimeline({ caseId }: { caseId: string }) {
  const { data: events = [], isLoading } = useCaseEvents(caseId)
  const { dateTime } = useDateFormatting()

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>
  }

  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {events.map((event) => {
        const EventIcon = EVENT_ICONS[event.event_type] ?? RefreshCcw
        const statusChange = event.event_type === "status_changed" && isStatus(event.to_value)
        return (
          <li key={event.id} className="relative">
            <span className="absolute -left-[29px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border bg-background text-muted-foreground">
              <EventIcon className="h-3 w-3" />
            </span>
            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              <span className="font-medium">
                {EVENT_LABELS[event.event_type] ?? event.event_type}
              </span>
              {statusChange ? (
                <span className="flex flex-wrap items-center gap-1.5">
                  {isStatus(event.from_value) && (
                    <>
                      <CaseStatusBadge status={event.from_value} className="text-[10px]" />
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </>
                  )}
                  <CaseStatusBadge status={event.to_value as CaseStatus} className="text-[10px]" />
                </span>
              ) : (
                event.event_type !== "created" && (
                  <span className="text-muted-foreground">
                    {formatValue(event.event_type, event.from_value)} →{" "}
                    {formatValue(event.event_type, event.to_value)}
                  </span>
                )
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {event.actor?.full_name ?? "System"} · {dateTime(event.created_at)}
            </p>
            {event.note && <p className="mt-1 text-sm text-muted-foreground">{event.note}</p>}
          </li>
        )
      })}
    </ol>
  )
}
