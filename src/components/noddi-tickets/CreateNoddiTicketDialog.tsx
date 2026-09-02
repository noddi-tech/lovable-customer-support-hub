import { Loader2 } from "lucide-react"
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
import { useCreateNoddiTicket, useNoddiServiceDepartments } from "@/hooks/useNoddiTickets"
import {
  NODDI_TICKET_CATEGORIES,
  NODDI_TICKET_PRIORITIES,
  NODDI_TICKET_TYPES,
  type NoddiTicketCategory,
  type NoddiTicketPriority,
  type NoddiTicketType,
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_TYPE_LABELS,
} from "@/types/noddiTicket"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTitle?: string
  defaultDescription?: string
  /** Noddi user group the ticket relates to (links the ticket to the customer). */
  userGroupId?: number | null
  /** Noddi booking the ticket relates to. */
  bookingId?: number | null
  defaultCategory?: NoddiTicketCategory
  defaultPriority?: NoddiTicketPriority
  onCreated?: (ticketId: number) => void
}

export function CreateNoddiTicketDialog({
  open,
  onOpenChange,
  defaultTitle = "",
  defaultDescription = "",
  userGroupId,
  bookingId,
  defaultCategory = "CUSTOMER_ISSUE",
  defaultPriority = "NORMAL",
  onCreated,
}: Props) {
  const { data: departments = [], isLoading: loadingDepartments } = useNoddiServiceDepartments()
  const createTicket = useCreateNoddiTicket()

  const [title, setTitle] = useState(defaultTitle)
  const [description, setDescription] = useState(defaultDescription)
  const [departmentId, setDepartmentId] = useState<string>("")
  const [category, setCategory] = useState<NoddiTicketCategory>(defaultCategory)
  const [priority, setPriority] = useState<NoddiTicketPriority>(defaultPriority)
  const [type, setType] = useState<NoddiTicketType>("TASK")

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle)
      setDescription(defaultDescription)
      setCategory(defaultCategory)
      setPriority(defaultPriority)
    }
  }, [open, defaultTitle, defaultDescription, defaultCategory, defaultPriority])

  useEffect(() => {
    if (!departmentId && departments.length) setDepartmentId(String(departments[0].id))
  }, [departments, departmentId])

  const canSubmit = title.trim().length > 0 && !!departmentId && !createTicket.isPending

  const handleSubmit = async () => {
    if (!canSubmit) return
    const ticket = await createTicket.mutateAsync({
      title: title.trim(),
      description: description.trim(),
      service_department_id: Number(departmentId),
      category,
      priority,
      type,
      ...(userGroupId ? { user_group_id: userGroupId } : {}),
      ...(bookingId ? { booking_id: bookingId } : {}),
    })
    onOpenChange(false)
    setTitle("")
    setDescription("")
    const id = (ticket as { id?: number } | undefined)?.id
    if (id && onCreated) onCreated(id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create ops ticket</DialogTitle>
          <DialogDescription>
            This creates an operational ticket for a service department in Navio. It is created
            directly in the Navio backend and will show up in their app — Support Hub only displays
            it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ticket-title">Title</Label>
            <Input
              id="ticket-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short summary of the issue"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ticket-description">Description</Label>
            <Textarea
              id="ticket-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="What happened, and what needs to be done?"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Service department</Label>
              <Select
                value={departmentId}
                onValueChange={setDepartmentId}
                disabled={loadingDepartments}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={loadingDepartments ? "Loading…" : "Select department"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as NoddiTicketCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NODDI_TICKET_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {TICKET_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as NoddiTicketPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NODDI_TICKET_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {TICKET_PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as NoddiTicketType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NODDI_TICKET_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TICKET_TYPE_LABELS[t]}
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
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {createTicket.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
