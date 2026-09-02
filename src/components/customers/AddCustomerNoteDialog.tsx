import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useCustomerNoteMutations } from "@/hooks/useCustomerRecord"

interface AddCustomerNoteDialogProps {
  customerId: string
  customerName?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Quick note composer opened from the customer list context menu.
 * Mounted per customer (keyed) so the note mutation resolves the right
 * Noddi user group before writing.
 */
export function AddCustomerNoteDialog({
  customerId,
  customerName,
  open,
  onOpenChange,
}: AddCustomerNoteDialogProps) {
  const [content, setContent] = useState("")
  const { addNote } = useCustomerNoteMutations(customerId)

  const submit = () => {
    const trimmed = content.trim()
    if (!trimmed) return
    addNote.mutate(
      { content: trimmed },
      {
        onSuccess: () => {
          setContent("")
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add note</DialogTitle>
          <DialogDescription>
            {customerName
              ? `Internal note about ${customerName}.`
              : "Internal note about this customer."}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          autoFocus
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a note visible to your team…"
          className="min-h-[120px] text-base sm:text-sm"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit()
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!content.trim() || addNote.isPending}>
            {addNote.isPending ? "Saving…" : "Save note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
