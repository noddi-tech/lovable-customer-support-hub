import { CheckSquare, XSquare, Archive, Trash2, MailCheck } from 'lucide-react';
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
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onMarkAsRead,
  onMarkAsUnread,
  onChangeStatus,
  onArchive,
  onDelete,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between gap-4">
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
      </div>

      <div className="flex items-center gap-2">
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

        <Select onValueChange={onChangeStatus}>
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue placeholder="Change Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
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
