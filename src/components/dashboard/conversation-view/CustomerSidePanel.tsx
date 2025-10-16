import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  X, 
  Mail, 
  Phone, 
  Calendar,
  Tag,
  Archive,
  Clock,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { cn } from '@/lib/utils';

interface CustomerSidePanelProps {
  conversation: any;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const CustomerSidePanel = ({ 
  conversation, 
  onClose,
  isCollapsed = false,
  onToggleCollapse
}: CustomerSidePanelProps) => {
  const { t } = useTranslation();
  const { dateTime } = useDateFormatting();

  if (isCollapsed) {
    return (
      <div className="w-12 border-l border-border bg-card flex flex-col items-center py-4 gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(
      "w-80 border-l border-border bg-card flex flex-col transition-all duration-300 ease-in-out",
      "animate-in slide-in-from-right"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-sm">Customer Details</h3>
        <div className="flex items-center gap-1">
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="h-6 w-6 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Customer Info Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Customer Basic Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium truncate">{conversation.customer?.email || 'N/A'}</span>
            </div>
            
            {conversation.customer?.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-medium">{conversation.customer.phone}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Conversation Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">Conversation</h4>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline" className="text-xs">
                  {conversation.status}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Priority:</span>
                <Badge variant="outline" className="text-xs">
                  {conversation.priority}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Channel:</span>
                <Badge variant="outline" className="text-xs capitalize">
                  {conversation.channel}
                </Badge>
              </div>

              {conversation.assigned_to && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Assigned to:</span>
                  <span className="font-medium text-xs">
                    {conversation.assigned_to.full_name}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Timestamps */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">Timeline</h4>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span className="text-xs">{dateTime(conversation.created_at)}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Updated:</span>
                <span className="text-xs">{dateTime(conversation.updated_at)}</span>
              </div>

              {conversation.snooze_until && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-warning" />
                  <span className="text-muted-foreground">Snoozed until:</span>
                  <span className="text-xs text-warning">{dateTime(conversation.snooze_until)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Footer */}
      <div className="p-4 border-t border-border space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Quick Actions</h4>
        
        <Button variant="outline" size="sm" className="w-full justify-start gap-2">
          <Tag className="h-4 w-4" />
          <span className="text-xs">Add Tag</span>
        </Button>
        
        <Button variant="outline" size="sm" className="w-full justify-start gap-2">
          <Clock className="h-4 w-4" />
          <span className="text-xs">Snooze</span>
        </Button>
        
        <Button variant="outline" size="sm" className="w-full justify-start gap-2">
          <Archive className="h-4 w-4" />
          <span className="text-xs">Archive</span>
        </Button>
        
        <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
          <span className="text-xs">Delete</span>
        </Button>
      </div>
    </div>
  );
};
