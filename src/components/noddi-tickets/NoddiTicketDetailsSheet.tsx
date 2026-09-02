import { format } from "date-fns"
import { Archive, CheckCircle2, Loader2, MessageSquare, RotateCcw } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  useCommentNoddiTicket,
  useNoddiTicket,
  useNoddiTicketAction,
  useNoddiTicketEvents,
  useUpdateNoddiTicket,
} from "@/hooks/useNoddiTickets"
import {
  NODDI_TICKET_PRIORITIES,
  type NoddiTicketPriority,
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_TYPE_LABELS,
} from "@/types/noddiTicket"
import { TicketPriorityBadge, TicketSourceBadge, TicketStatusBadge } from "./NoddiTicketBadges"

interface Props {
  ticketId: number | null
  onOpenChange: (open: boolean) => void
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">{value ?? "—"}</div>
    </div>
  )
}

export function NoddiTicketDetailsSheet({ ticketId, onOpenChange }: Props) {
  const { data: ticket, isLoading } = useNoddiTicket(ticketId)
  const { data: events = [], isLoading: loadingEvents } = useNoddiTicketEvents(ticketId)
  const commentMutation = useCommentNoddiTicket()
  const actionMutation = useNoddiTicketAction()
  const updateMutation = useUpdateNoddiTicket()
  const [comment, setComment] = useState("")

  const submitComment = async () => {
    if (!ticketId || !comment.trim()) return
    await commentMutation.mutateAsync({ ticket_id: ticketId, comment: comment.trim() })
    setComment("")
  }

  return (
    <Sheet open={!!ticketId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="pr-8">
            {isLoading
              ? "Loading ticket…"
              : `#${ticket?.id} · ${ticket?.title || "Untitled ticket"}`}
          </SheetTitle>
        </SheetHeader>

        {isLoading || !ticket ? (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <TicketStatusBadge status={ticket.status} />
              <TicketPriorityBadge priority={ticket.priority} />
              <Badge variant="outline" className="text-[11px]">
                {TICKET_TYPE_LABELS[ticket.type] ?? ticket.type}
              </Badge>
              <TicketSourceBadge source={ticket.source} />
              {ticket.tags?.map((tag) => (
                <Badge key={tag.id} variant="secondary" className="text-[11px]">
                  {tag.short_name}
                </Badge>
              ))}
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap items-center gap-2">
              {ticket.status !== "RESOLVED" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionMutation.isPending}
                  onClick={() => actionMutation.mutate({ ticket_id: ticket.id, action: "resolve" })}
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" /> Resolve
                </Button>
              )}
              {ticket.status === "RESOLVED" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionMutation.isPending}
                  onClick={() => actionMutation.mutate({ ticket_id: ticket.id, action: "reopen" })}
                >
                  <RotateCcw className="mr-1.5 h-4 w-4" /> Reopen
                </Button>
              )}
              {ticket.status !== "ARCHIVED" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionMutation.isPending}
                  onClick={() => actionMutation.mutate({ ticket_id: ticket.id, action: "archive" })}
                >
                  <Archive className="mr-1.5 h-4 w-4" /> Archive
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionMutation.isPending}
                  onClick={() => actionMutation.mutate({ ticket_id: ticket.id, action: "restore" })}
                >
                  <RotateCcw className="mr-1.5 h-4 w-4" /> Restore
                </Button>
              )}
              <Select
                value={ticket.priority}
                onValueChange={(v) =>
                  updateMutation.mutate({ ticket_id: ticket.id, patch: { priority: v } })
                }
              >
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NODDI_TICKET_PRIORITIES.map((p: NoddiTicketPriority) => (
                    <SelectItem key={p} value={p}>
                      {TICKET_PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Category"
                value={TICKET_CATEGORY_LABELS[ticket.category] ?? ticket.category}
              />
              <Field label="Department" value={ticket.service_department?.name} />
              <Field label="Assignee" value={ticket.assignee?.name ?? "Unassigned"} />
              <Field label="Customer" value={ticket.user_group?.name ?? "—"} />
              <Field
                label="Created"
                value={
                  ticket.created_at ? format(new Date(ticket.created_at), "dd MMM yyyy HH:mm") : "—"
                }
              />
              <Field
                label="Due"
                value={ticket.due_at ? format(new Date(ticket.due_at), "dd MMM yyyy HH:mm") : "—"}
              />
            </div>

            {ticket.description && (
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Description
                </div>
                <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MessageSquare className="h-4 w-4" /> Activity
              </div>
              {loadingEvents ? (
                <Skeleton className="h-24 w-full" />
              ) : events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <ul className="space-y-3">
                  {events.map((event) => (
                    <li key={event.id} className="rounded-md border p-3">
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {event.actor_name || "System"} · {event.event_type.toLowerCase()}
                        </span>
                        <span>{format(new Date(event.created_at), "dd MMM HH:mm")}</span>
                      </div>
                      {(event.comment || event.detail || event.resolution_note) && (
                        <p className="mt-1 whitespace-pre-wrap text-sm">
                          {event.comment || event.resolution_note || event.detail}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Add a comment in Noddi…"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={submitComment}
                  disabled={!comment.trim() || commentMutation.isPending}
                >
                  {commentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add comment
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
