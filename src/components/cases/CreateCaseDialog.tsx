import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  CASE_PRIORITY_LABELS,
  type CasePriority,
  useCaseCategories,
  useCreateCase,
} from "@/hooks/useCases"
import { CASE_PRIORITY_DOT } from "./CaseBadges"
import { CaseCustomerPicker, type PickedCustomer, useCustomerBasics } from "./CaseCustomerPicker"

interface CreateCaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTitle?: string
  customerId?: string | null
  conversationId?: string | null
  inboxId?: string | null
  sourceChannel?: string | null
  onCreated?: (caseId: string) => void
}

export function CreateCaseDialog({
  open,
  onOpenChange,
  defaultTitle,
  customerId,
  conversationId,
  inboxId,
  sourceChannel,
  onCreated,
}: CreateCaseDialogProps) {
  const [title, setTitle] = useState(defaultTitle ?? "")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<CasePriority>("normal")
  const [categoryId, setCategoryId] = useState<string>("")
  const [customer, setCustomer] = useState<PickedCustomer | null>(null)
  const { data: categories = [] } = useCaseCategories()
  const createCase = useCreateCase()

  // When a customer is passed in (e.g. from a conversation) resolve its label.
  const { data: presetCustomer } = useCustomerBasics(customerId ?? null)

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle ?? "")
      setDescription("")
      setPriority("normal")
      setCategoryId("")
      setCustomer(null)
    }
  }, [open, defaultTitle])

  useEffect(() => {
    if (open && presetCustomer) setCustomer(presetCustomer)
  }, [open, presetCustomer])

  const selectedCustomerId = customer?.id ?? null

  const handleSubmit = async () => {
    if (!title.trim() || !selectedCustomerId) return
    const result = await createCase.mutateAsync({
      title: title.trim(),
      description: description.trim() || null,
      customerId: selectedCustomerId,
      priority,
      categoryId: categoryId || null,
      inboxId: inboxId ?? null,
      sourceChannel: sourceChannel ?? null,
      conversationId: conversationId ?? null,
    })
    onOpenChange(false)
    onCreated?.(result.id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New case</DialogTitle>
          <DialogDescription>
            A case is the unit of work a support rep owns and must follow up. It can span several
            emails, chats and calls for the same customer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <CaseCustomerPicker value={customer} onChange={setCustomer} />
            <p className="text-xs text-muted-foreground">
              Every case belongs to a customer. Search an existing one or create a new record.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="case-title">Title</Label>
            <Input
              id="case-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What does the customer need resolved?"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="case-description">Description</Label>
            <Textarea
              id="case-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Context, what has been tried, what the next action is"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as CasePriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CASE_PRIORITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className={`h-2 w-2 rounded-full ${CASE_PRIORITY_DOT[value as CasePriority]}`}
                        />
                        {label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !selectedCustomerId || createCase.isPending}
          >
            Create case
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
