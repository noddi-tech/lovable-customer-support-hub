import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell, Phone, MessageSquare, Mail, Ticket, UserCheck, AtSign,
  Check, Eye, Trash2, ArrowUpDown,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { EnhancedNotification, NotificationPriority } from '@/hooks/useNotificationFilters';

const categoryIcons: Record<string, React.ElementType> = {
  calls: Phone,
  text: MessageSquare,
  email: Mail,
  tickets: Ticket,
  assigned: UserCheck,
  mentions: AtSign,
};

const priorityStyles: Record<NotificationPriority, string> = {
  urgent: 'border-l-4 border-l-destructive',
  high: 'border-l-4 border-l-yellow-500',
  normal: '',
  low: '',
};

interface ColumnOptions {
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (notification: EnhancedNotification) => void;
}

export const getNotificationColumns = ({
  onMarkAsRead,
  onDelete,
  onNavigate,
}: ColumnOptions): ColumnDef<EnhancedNotification>[] => [
  {
    id: 'status',
    header: '',
    size: 40,
    cell: ({ row }) => (
      <div className="flex justify-center">
        {!row.original.is_read && (
          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
        )}
      </div>
    ),
    enableSorting: false,
  },
  {
    id: 'type',
    header: 'Type',
    size: 50,
    cell: ({ row }) => {
      const Icon = categoryIcons[row.original.category] || Bell;
      return <Icon className="h-4 w-4 text-muted-foreground" />;
    },
    enableSorting: false,
  },
  {
    id: 'notification',
    header: 'Notification',
    accessorFn: (row) => `${row.title} ${row.message}`,
    cell: ({ row }) => {
      const n = row.original;
      return (
        <div
          className={cn(
            'py-1 cursor-pointer',
            priorityStyles[n.priority],
            n.priority !== 'normal' && n.priority !== 'low' && 'pl-3',
          )}
          onClick={() => onNavigate(n)}
        >
          <p className={cn('text-sm truncate', !n.is_read && 'font-semibold')}>
            {n.title}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-1">{n.message}</p>
          <div className="flex gap-1.5 mt-1">
            {n.priority === 'urgent' && (
              <Badge variant="destructive" className="text-[10px] h-4 px-1.5">Urgent</Badge>
            )}
            {n.priority === 'high' && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-yellow-500 text-yellow-600">High</Badge>
            )}
          </div>
        </div>
      );
    },
  },
  {
    id: 'time',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Time
        <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
      </Button>
    ),
    accessorKey: 'created_at',
    size: 120,
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(new Date(row.original.created_at), { addSuffix: true })}
      </span>
    ),
  },
  {
    id: 'actions',
    header: '',
    size: 100,
    cell: ({ row }) => {
      const n = row.original;
      return (
        <div className="flex items-center gap-1">
          {!n.is_read && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Mark as read"
              onClick={(e) => { e.stopPropagation(); onMarkAsRead(n.id); }}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="View"
            onClick={(e) => { e.stopPropagation(); onNavigate(n); }}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            title="Delete"
            onClick={(e) => { e.stopPropagation(); onDelete(n.id); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      );
    },
    enableSorting: false,
  },
];
