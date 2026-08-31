import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useCreateNoddiTicket, useNoddiServiceDepartments } from '@/hooks/useNoddiTickets';
import {
  NODDI_TICKET_CATEGORIES,
  NODDI_TICKET_PRIORITIES,
  NODDI_TICKET_TYPES,
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_TYPE_LABELS,
  type NoddiTicketCategory,
  type NoddiTicketPriority,
  type NoddiTicketType,
} from '@/types/noddiTicket';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTitle?: string;
  defaultDescription?: string;
  onCreated?: (ticketId: number) => void;
}

export function CreateNoddiTicketDialog({
  open,
  onOpenChange,
  defaultTitle = '',
  defaultDescription = '',
  onCreated,
}: Props) {
  const { data: departments = [], isLoading: loadingDepartments } = useNoddiServiceDepartments();
  const createTicket = useCreateNoddiTicket();

  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDescription);
  const [departmentId, setDepartmentId] = useState<string>('');
  const [category, setCategory] = useState<NoddiTicketCategory>('CUSTOMER_ISSUE');
  const [priority, setPriority] = useState<NoddiTicketPriority>('NORMAL');
  const [type, setType] = useState<NoddiTicketType>('TASK');

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle);
      setDescription(defaultDescription);
    }
  }, [open, defaultTitle, defaultDescription]);

  useEffect(() => {
    if (!departmentId && departments.length) setDepartmentId(String(departments[0].id));
  }, [departments, departmentId]);

  const canSubmit = title.trim().length > 0 && !!departmentId && !createTicket.isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const ticket = await createTicket.mutateAsync({
      title: title.trim(),
      description: description.trim(),
      service_department_id: Number(departmentId),
      category,
      priority,
      type,
    });
    onOpenChange(false);
    setTitle('');
    setDescription('');
    const id = (ticket as { id?: number } | undefined)?.id;
    if (id && onCreated) onCreated(id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create ticket</DialogTitle>
          <DialogDescription>
            The ticket is created directly in the Noddi backend — Support Hub only displays it.
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Service department</Label>
              <Select value={departmentId} onValueChange={setDepartmentId} disabled={loadingDepartments}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingDepartments ? 'Loading…' : 'Select department'} />
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
  );
}
