import { useQuery } from "@tanstack/react-query"
import { ExternalLink, Lock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { TimelineItem } from "@/hooks/useCustomerTimeline"
import { useDateFormatting } from "@/hooks/useDateFormatting"
import { supabase } from "@/integrations/supabase/client"
import { cn } from "@/lib/utils"
import { useNavigate } from "@/router/compat"

interface PreviewMessage {
  id: string
  content: string | null
  content_type: string | null
  sender_type: string | null
  is_internal: boolean | null
  created_at: string
  email_subject: string | null
}

/** Very small HTML → readable text conversion, good enough for a glance preview. */
function toPlainText(content: string | null, contentType: string | null): string {
  if (!content) return ""
  if ((contentType || "").includes("html") || /<\/?[a-z][\s\S]*>/i.test(content)) {
    const doc = new DOMParser().parseFromString(content, "text/html")
    // Drop quoted history / signatures noise the parser keeps as raw nodes
    doc.querySelectorAll("style, script").forEach((el) => el.remove())
    return (doc.body.textContent || "").replace(/\n{3,}/g, "\n\n").trim()
  }
  return content.trim()
}

function useTimelineMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ["timeline-preview-messages", conversationId],
    enabled: !!conversationId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, content, content_type, sender_type, is_internal, created_at, email_subject")
        .eq("conversation_id", conversationId as string)
        .order("created_at", { ascending: true })
        .limit(50)
      if (error) throw error
      return (data ?? []) as PreviewMessage[]
    },
  })
}

interface TimelineItemPreviewDialogProps {
  item: TimelineItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TimelineItemPreviewDialog({
  item,
  open,
  onOpenChange,
}: TimelineItemPreviewDialogProps) {
  const navigate = useNavigate()
  const { dateTime } = useDateFormatting()

  const conversationId = item?.id.startsWith("conversation:")
    ? item.id.slice("conversation:".length)
    : null

  const { data: messages, isLoading } = useTimelineMessages(open ? conversationId : null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-6 text-base">{item?.title || "Preview"}</DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-xs">
            {item ? dateTime(item.at) : ""}
            {item?.status && (
              <Badge variant="outline" className="text-[10px]">
                {item.status.replace(/_/g, " ")}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] pr-3">
          {conversationId ? (
            isLoading ? (
              <p className="text-sm text-muted-foreground">Loading messages…</p>
            ) : !messages?.length ? (
              <p className="text-sm text-muted-foreground">No messages in this conversation.</p>
            ) : (
              <div className="space-y-3">
                {messages.map((m) => {
                  const isAgent = m.sender_type === "agent"
                  const body = toPlainText(m.content, m.content_type)
                  return (
                    <div
                      key={m.id}
                      className={cn("flex flex-col gap-1", isAgent ? "items-end" : "items-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] whitespace-pre-wrap rounded-lg border px-3 py-2 text-sm",
                          m.is_internal
                            ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                            : isAgent
                              ? "bg-primary/10"
                              : "bg-muted",
                        )}
                      >
                        {m.is_internal && (
                          <span className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase">
                            <Lock className="h-3 w-3" /> Internal note
                          </span>
                        )}
                        {body || <span className="text-muted-foreground">(empty message)</span>}
                      </div>
                      <span className="px-1 text-[10px] text-muted-foreground">
                        {isAgent ? "Agent" : "Customer"} · {dateTime(m.created_at)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          ) : (
            <p className="text-sm text-muted-foreground">
              {item?.subtitle || "No further details available."}
            </p>
          )}
        </ScrollArea>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {item?.href && (
            <Button
              size="sm"
              onClick={() => {
                onOpenChange(false)
                navigate(item.href as string)
              }}
            >
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              Open full view
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
