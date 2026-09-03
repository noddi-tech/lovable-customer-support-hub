/**
 * Open Noddi tickets for the customer currently shown in the conversation sidebar.
 * Tickets are matched on the customer's Noddi user group(s), and optionally
 * narrowed to a specific car (license plate) when one is in context.
 * All data comes from the Noddi backend API — nothing is stored in this app.
 */

import { format } from "date-fns"
import { Car, Ticket } from "lucide-react"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useNoddiTickets } from "@/hooks/useNoddiTickets"
import type { NoddiTicket } from "@/types/noddiTicket"
import { TicketPriorityBadge, TicketSourceBadge, TicketStatusBadge } from "./NoddiTicketBadges"
import { NoddiTicketDetailsSheet } from "./NoddiTicketDetailsSheet"

interface Props {
  /** Noddi user group ids belonging to this customer. */
  userGroupIds: number[]
  /** Optional license plate to narrow the list to a single car. */
  licensePlate?: string | null
}

function plateOf(ticket: NoddiTicket): string | null {
  const raw = ticket.user_group_car?.license_plate
  if (!raw) return null
  if (typeof raw === "string") return raw
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>
    const value = obj.number ?? obj.license_plate ?? obj.value
    return typeof value === "string" ? value : null
  }
  return null
}

export function CustomerNoddiTicketsCard({ userGroupIds, licensePlate }: Props) {
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null)
  const [onlyThisCar, setOnlyThisCar] = useState(false)

  const ids = useMemo(() => Array.from(new Set(userGroupIds.filter(Boolean))), [userGroupIds])

  const { data, isLoading } = useNoddiTickets(
    {
      user_group_ids: ids,
      statuses: ["OPEN", "SNOOZED"],
      ordering: "-created_at",
      page_size: 20,
    },
    { enabled: ids.length > 0 },
  )

  const tickets = useMemo(() => {
    const list = data?.results ?? []
    if (!onlyThisCar || !licensePlate) return list
    const target = licensePlate.replace(/\s/g, "").toUpperCase()
    return list.filter((t) => (plateOf(t) ?? "").replace(/\s/g, "").toUpperCase() === target)
  }, [data?.results, onlyThisCar, licensePlate])

  if (!ids.length) return null

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-muted-foreground" />
              Open tickets
              {!isLoading && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                  {tickets.length}
                </Badge>
              )}
            </span>
            {licensePlate && (
              <Button
                size="sm"
                variant={onlyThisCar ? "secondary" : "ghost"}
                className="h-6 gap-1 px-2 text-[11px]"
                onClick={() => setOnlyThisCar((v) => !v)}
                title="Only show tickets for this car"
              >
                <Car className="h-3 w-3" />
                {licensePlate}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </>
          ) : tickets.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No open tickets for this customer in Noddi.
            </p>
          ) : (
            tickets.map((ticket) => {
              const plate = plateOf(ticket)
              return (
                <button
                  type="button"
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className="w-full rounded-md border border-border p-2 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="truncate text-xs font-medium">
                      {ticket.title || "Untitled ticket"}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      #{ticket.id}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    <TicketStatusBadge status={ticket.status} />
                    <TicketPriorityBadge priority={ticket.priority} />
                    <TicketSourceBadge source={ticket.source} />
                    {plate && (
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <Car className="h-3 w-3" />
                        {plate}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {ticket.created_at
                      ? format(new Date(ticket.created_at), "dd MMM yyyy HH:mm")
                      : "—"}
                    {ticket.assignee?.name ? ` · ${ticket.assignee.name}` : " · Unassigned"}
                  </div>
                </button>
              )
            })
          )}
        </CardContent>
      </Card>

      <NoddiTicketDetailsSheet
        ticketId={selectedTicketId}
        onOpenChange={(open) => !open && setSelectedTicketId(null)}
      />
    </>
  )
}
