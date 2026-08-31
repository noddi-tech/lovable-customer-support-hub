import { CheckSquare, XSquare, Archive, Trash2, MailCheck, UserPlus, CircleDot, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onMarkAsRead: () => void;
  onMarkAsUnread: () => void;
  onChangeStatus: (status: string) => void;
  onArchive: () => void;
  onDelete: () => void;
  onAssign: (assigneeId: string) => void;
  agents: Array<{ id: string; name: string }>;
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onMarkAsRead,
  onMarkAsUnread,
  onChangeStatus,
  onArchive,
  onDelete,
  onAssign,
  agents,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-primary/5 border-b border-border px-4 py-2 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">
          {selectedCount} selected
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-8"
        >
          <XSquare className="w-4 h-4 mr-2" />
          Clear
        </Button>
        <span className="text-xs text-muted-foreground hidden lg:inline">
          Tip: ⌘/Ctrl-click to pick individually, shift-click for a range
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Prominent one-click status changes for the selected conversations */}
        <div className="flex items-center gap-1 pr-2 mr-1 border-r border-border">
          <Button variant="outline" size="sm" className="h-8" onClick={() => onChangeStatus('open')}>
            <CircleDot className="w-4 h-4 mr-1.5 text-emerald-600" />
            Open
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => onChangeStatus('pending')}>
            <Clock className="w-4 h-4 mr-1.5 text-amber-600" />
            Pending
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => onChangeStatus('closed')}>
            <CheckCircle2 className="w-4 h-4 mr-1.5 text-muted-foreground" />
            Close
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onMarkAsRead}
          className="h-8"
        >
          <MailCheck className="w-4 h-4 mr-2" />
          Mark Read
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onMarkAsUnread}
          className="h-8"
        >
          <CheckSquare className="w-4 h-4 mr-2" />
          Mark Unread
        </Button>

        <Select onValueChange={onAssign}>
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue placeholder="Assign To" />
          </SelectTrigger>
          <SelectContent>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  {agent.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={onArchive}
          className="h-8"
        >
          <Archive className="w-4 h-4 mr-2" />
          Archive
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="h-8 text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </Button>
      </div>
    </div>
  );
}
