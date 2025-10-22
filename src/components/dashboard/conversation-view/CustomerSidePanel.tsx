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
  ChevronRight,
  CheckCircle2,
  CircleDot
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { cn } from '@/lib/utils';
import { useConversationView } from '@/contexts/ConversationViewContext';
import { NoddiCustomerDetails } from '@/components/dashboard/voice/NoddiCustomerDetails';

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
  const { dispatch, updateStatus } = useConversationView();
  const [statusLoading, setStatusLoading] = useState(false);

  if (isCollapsed) {
    return (
      <div className="h-full w-12 bg-card flex flex-col items-center py-4 gap-4 border-l border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="h-8 w-8 p-0 hover:bg-primary/10 transition-colors"
          title="Expand side panel"
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(
      "h-full bg-card flex flex-col transition-all duration-300 ease-in-out border-l border-border",
      "animate-in slide-in-from-right"
    )}>
      {/* Header with improved styling */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
        <h3 className="font-semibold text-sm text-foreground">Customer Details</h3>
        <div className="flex items-center gap-1">
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="h-7 w-7 p-0 hover:bg-primary/10 transition-colors"
              title="Collapse side panel"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 w-7 p-0 hover:bg-destructive/10 transition-colors"
              title="Close side panel"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>

      {/* Customer Info Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          
          {/* Enhanced Noddi Customer Details Component */}
          <NoddiCustomerDetails
            customerId={conversation.customer?.id}
            customerEmail={conversation.customer?.email}
            customerPhone={conversation.customer?.phone}
            customerName={conversation.customer?.full_name}
          />
          
          <Separator />
          
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

      {/* Status Management */}
      <div className="p-4 border-t border-border space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
          Status & Actions
        </h4>
        
        {/* Current Status Display */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Current Status:</span>
          <Badge variant={conversation.status === 'open' ? 'default' : 'secondary'}>
            {conversation.status}
          </Badge>
        </div>
        
        {/* Status Change Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {conversation.status !== 'open' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={async () => {
                setStatusLoading(true);
                await updateStatus({ status: 'open' });
                setStatusLoading(false);
              }}
              disabled={statusLoading}
              className="text-xs"
            >
              <CircleDot className="h-3 w-3 mr-1" />
              Reopen
            </Button>
          )}
          
          {conversation.status !== 'pending' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={async () => {
                setStatusLoading(true);
                await updateStatus({ status: 'pending' });
                setStatusLoading(false);
              }}
              disabled={statusLoading}
              className="text-xs"
            >
              <Clock className="h-3 w-3 mr-1" />
              Pending
            </Button>
          )}
          
          {conversation.status !== 'closed' && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={async () => {
                setStatusLoading(true);
                await updateStatus({ status: 'closed' });
                setStatusLoading(false);
              }}
              disabled={statusLoading}
              className="col-span-2 text-xs"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Close Conversation
            </Button>
          )}
        </div>
        
        <Separator className="my-3" />
        
        {/* Quick Actions */}
        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Quick Actions</h4>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start gap-2"
          onClick={() => {
            // TODO: Implement tag dialog
            console.log('Add tag clicked');
          }}
        >
          <Tag className="h-4 w-4" />
          <span className="text-xs">Add Tag</span>
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start gap-2"
          onClick={() => {
            dispatch({ type: 'SET_SNOOZE_DIALOG', payload: { open: true, date: new Date(), time: '09:00' } });
          }}
        >
          <Clock className="h-4 w-4" />
          <span className="text-xs">Snooze</span>
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start gap-2"
          onClick={async () => {
            await updateStatus({ isArchived: true });
          }}
        >
          <Archive className="h-4 w-4" />
          <span className="text-xs">Archive</span>
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start gap-2 text-destructive hover:text-destructive"
          onClick={() => {
            // TODO: Implement delete confirmation
            console.log('Delete clicked');
          }}
        >
          <Trash2 className="h-4 w-4" />
          <span className="text-xs">Delete</span>
        </Button>
      </div>
    </div>
  );
};
