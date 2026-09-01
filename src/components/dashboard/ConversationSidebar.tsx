import React from 'react';
import { Tag, UserPlus, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NoddiCustomerDetails } from '@/components/dashboard/voice/NoddiCustomerDetails';
import { DescribedSelectItem } from '@/components/ui/described-select-item';
import { CONVERSATION_STATUS_DESCRIPTIONS, PRIORITY_DESCRIPTIONS } from '@/lib/option-descriptions';

interface ConversationSidebarProps {
  conversationId?: string;
  
  // Customer information
  customer?: {
    id?: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
    phone?: string;
    company?: string;
  };
  
  // Conversation metadata
  status?: 'open' | 'pending' | 'resolved' | 'closed';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  assignedTo?: {
    id: string;
    name: string;
    avatar?: string;
  };
  tags?: string[];
  
  // Actions
  onStatusChange?: (status: string) => void;
  onPriorityChange?: (priority: string) => void;
  onAssigneeChange?: (assigneeId: string) => void;
  onAssign?: () => void;
  onAddTag?: () => void;
  onRemoveTag?: (tag: string) => void;
  onSnooze?: () => void;
  onArchive?: () => void;
  onMarkClosed?: () => void;
  
  // UI state
  className?: string;
  showActions?: boolean;
  showMetadata?: boolean;
  showCustomer?: boolean;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  customer,
  status = 'open',
  priority = 'normal',
  assignedTo,
  tags = [],
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onAssign,
  onAddTag,
  onRemoveTag,
  onSnooze,
  onArchive,
  onMarkClosed,
  className,
  showActions = true,
  showMetadata = true,
  showCustomer = true,
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Customer Information */}
        {showCustomer && customer?.id && (
          <NoddiCustomerDetails
            customerId={customer.id}
            customerEmail={customer.email}
            customerPhone={customer.phone}
            customerName={customer.full_name}
          />
        )}
      
      {/* Conversation Metadata */}
      {showMetadata && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Conversation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={status} onValueChange={onStatusChange}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <DescribedSelectItem value="open" title="Open" description={CONVERSATION_STATUS_DESCRIPTIONS.open}>Open</DescribedSelectItem>
                  <DescribedSelectItem value="pending" title="Pending" description={CONVERSATION_STATUS_DESCRIPTIONS.pending}>Pending</DescribedSelectItem>
                  <DescribedSelectItem value="resolved" title="Resolved" description={CONVERSATION_STATUS_DESCRIPTIONS.resolved}>Resolved</DescribedSelectItem>
                  <DescribedSelectItem value="closed" title="Closed" description={CONVERSATION_STATUS_DESCRIPTIONS.closed}>Closed</DescribedSelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Priority</label>
              <Select value={priority} onValueChange={onPriorityChange}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <DescribedSelectItem value="low" title="Low" description={PRIORITY_DESCRIPTIONS.low}>Low</DescribedSelectItem>
                  <DescribedSelectItem value="normal" title="Normal" description={PRIORITY_DESCRIPTIONS.normal}>Normal</DescribedSelectItem>
                  <DescribedSelectItem value="high" title="High" description={PRIORITY_DESCRIPTIONS.high}>High</DescribedSelectItem>
                  <DescribedSelectItem value="urgent" title="Urgent" description={PRIORITY_DESCRIPTIONS.urgent}>Urgent</DescribedSelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assigned To */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Assigned To</label>
              {assignedTo ? (
                <div className="flex items-center gap-2 p-2 rounded-md border border-border">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={assignedTo.avatar} />
                    <AvatarFallback className="text-xs">
                      {assignedTo.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{assignedTo.name}</span>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => onAssigneeChange?.('current-user')}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign to me
                </Button>
              )}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Tags</label>
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs px-2 py-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => onRemoveTag?.(tag)}
                      title={`Remove ${tag} tag`}
                    >
                      {tag}×
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      {showActions && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={onAssign}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Assign
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={onAddTag}
            >
              <Tag className="h-4 w-4 mr-2" />
              Add Tag
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={onSnooze}
            >
              <Clock className="h-4 w-4 mr-2" />
              Snooze
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={onArchive}
            >
              Archive
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={onMarkClosed}
            >
              Mark Closed
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};