import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Inbox, Mail, Users, Archive, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InboxItem {
  id: string;
  name: string;
  count: number;
  icon?: React.ReactNode;
  color?: string;
}

interface InboxListProps {
  selectedInbox?: string;
  onInboxSelect?: (inboxId: string) => void;
  className?: string;
}

const defaultInboxes: InboxItem[] = [
  { id: 'all', name: 'All Messages', count: 142, icon: <Mail className="h-4 w-4" /> },
  { id: 'unread', name: 'Unread', count: 23, icon: <Inbox className="h-4 w-4" />, color: 'text-blue-600' },
  { id: 'assigned', name: 'Assigned to Me', count: 8, icon: <Star className="h-4 w-4" />, color: 'text-yellow-600' },
  { id: 'team', name: 'Team Queue', count: 15, icon: <Users className="h-4 w-4" />, color: 'text-green-600' },
  { id: 'archived', name: 'Archived', count: 89, icon: <Archive className="h-4 w-4" />, color: 'text-gray-500' },
];

export const InboxList: React.FC<InboxListProps> = ({
  selectedInbox = 'all',
  onInboxSelect,
  className
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      <h3 className="text-sm font-semibold text-foreground/70 px-2 pb-2">Inboxes</h3>
      
      <div className="space-y-1">
        {defaultInboxes.map((inbox) => (
          <Button
            key={inbox.id}
            variant={selectedInbox === inbox.id ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-between h-auto px-3 py-2 text-left",
              selectedInbox === inbox.id && "bg-muted text-foreground"
            )}
            onClick={() => onInboxSelect?.(inbox.id)}
          >
            <div className="flex items-center gap-2">
              <span className={cn("flex-shrink-0", inbox.color)}>
                {inbox.icon}
              </span>
              <span className="text-sm font-medium truncate">
                {inbox.name}
              </span>
            </div>
            
            {inbox.count > 0 && (
              <Badge 
                variant={selectedInbox === inbox.id ? "default" : "secondary"} 
                className="ml-2 px-2 py-0 h-5 text-xs"
              >
                {inbox.count}
              </Badge>
            )}
          </Button>
        ))}
      </div>
    </div>
  );
};