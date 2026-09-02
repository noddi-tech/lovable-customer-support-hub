import { FileEdit, Trash2 } from "lucide-react"
import type React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useCompose } from "@/contexts/ComposeContext"

function draftTitle(subject: string, to: string, bulkEmails: string) {
  return subject.trim() || to.trim() || bulkEmails.split(/[\n,;]/)[0]?.trim() || "(no subject)"
}

/**
 * Button + popover listing unfinished compose drafts so they can be reopened
 * or discarded. Drafts persist locally until sent or discarded.
 */
export const DraftsList: React.FC<{ className?: string }> = ({ className }) => {
  const { savedDrafts, reopenDraft, removeDraft } = useCompose()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={className}>
          <FileEdit className="h-4 w-4 mr-2" />
          Drafts
          {savedDrafts.length > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
              {savedDrafts.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="px-3 py-2 border-b border-border text-sm font-medium">
          Unfinished drafts
        </div>
        {savedDrafts.length === 0 ? (
          <p className="px-3 py-6 text-sm text-muted-foreground text-center">No saved drafts</p>
        ) : (
          <ScrollArea className="max-h-72">
            <ul className="py-1">
              {savedDrafts.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent/60 rounded-sm"
                >
                  <button
                    type="button"
                    className="flex-1 min-w-0 text-left"
                    onClick={() => reopenDraft(d.id)}
                  >
                    <p className="text-sm truncate">{draftTitle(d.subject, d.to, d.bulkEmails)}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {d.bulkMode ? "Bulk email" : d.to || "No recipient"} ·{" "}
                      {new Date(d.updatedAt).toLocaleString()}
                    </p>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => removeDraft(d.id)}
                    title="Discard draft"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  )
}
