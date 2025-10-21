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
  ExternalLink,
  Loader2,
  AlertCircle,
  Package,
  CheckCircle2,
  CircleDot
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { cn } from '@/lib/utils';
import { useNoddihKundeData } from '@/hooks/useNoddihKundeData';
import { useConversationView } from '@/contexts/ConversationViewContext';

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
  
  // Fetch Noddi customer data
  const { 
    data: noddiData, 
    isLoading: noddiLoading, 
    error: noddiError,
    refresh: refreshNoddi,
    isRefreshing
  } = useNoddihKundeData(conversation.customer ? {
    id: conversation.customer.id,
    full_name: conversation.customer.full_name,
    email: conversation.customer.email,
    phone: conversation.customer.phone
  } : null);

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
          
          {/* Noddi Customer Data Section - Phase 4 */}
          {noddiLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          
          {noddiError && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-destructive mb-1">Failed to load customer data</h4>
                  <p className="text-xs text-muted-foreground">{noddiError.message}</p>
                </div>
              </div>
            </div>
          )}
          
          {noddiData && noddiData.data && (
            <div className="space-y-4">
              {/* Customer Name - Large and Prominent */}
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  {noddiData.data.ui_meta?.display_name || conversation.customer?.full_name || 'Unknown Customer'}
                </h2>
                {noddiData.data.noddi_user_id && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Customer ID: {noddiData.data.noddi_user_id}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-5 px-1"
                      onClick={() => {
                        if (noddiData.data.noddi_user_id) {
                          navigator.clipboard.writeText(noddiData.data.noddi_user_id.toString());
                        }
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Match Badge */}
              {noddiData.data.found && (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Matched by {noddiData.data.ui_meta?.match_mode || 'Email'}
                </Badge>
              )}
              
              {/* Quick Action Links */}
              <div className="space-y-2">
                {noddiData.data.ui_meta?.partner_urls?.customer_url && (
                  <a
                    href={noddiData.data.ui_meta.partner_urls.customer_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <span>Open Customer</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {noddiData.data.ui_meta?.partner_urls?.booking_url && (
                  <a
                    href={noddiData.data.ui_meta.partner_urls.booking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <span>Open Booking #{noddiData.data.ui_meta.partner_urls.booking_id}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              
              <Separator />
              
              {/* Order Summary Card */}
              {noddiData.data.ui_meta?.order_summary && (
                <div className="rounded-lg border border-border bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Order Summary
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => refreshNoddi()}
                      disabled={isRefreshing}
                      className="h-7 px-2"
                    >
                      {isRefreshing ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        'Refresh'
                      )}
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {noddiData.data.ui_meta.order_summary.lines.slice(0, 5).map((line, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs border-b border-border pb-2 last:border-0">
                        <div className="flex-1">
                          <span className="font-medium">{line.name}</span>
                          <span className="text-muted-foreground ml-2">x{line.quantity}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {line.kind === 'discount' && (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                              Discount
                            </Badge>
                          )}
                          <span className="font-medium">{line.subtotal} {noddiData.data.ui_meta?.order_summary?.currency}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {noddiData.data.ui_meta.money && (
                    <div className="pt-2 border-t border-border space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="font-medium">{noddiData.data.ui_meta.money.gross} {noddiData.data.ui_meta.money.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Paid:</span>
                        <span className="font-medium text-emerald-600">{noddiData.data.ui_meta.money.paid} {noddiData.data.ui_meta.money.currency}</span>
                      </div>
                      {noddiData.data.ui_meta.money.outstanding > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Outstanding:</span>
                          <span className="font-medium text-amber-600">{noddiData.data.ui_meta.money.outstanding} {noddiData.data.ui_meta.money.currency}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs",
                            noddiData.data.ui_meta.money.paid_state === 'paid' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                            noddiData.data.ui_meta.money.paid_state === 'unpaid' && "bg-amber-50 text-amber-700 border-amber-200",
                            noddiData.data.ui_meta.money.paid_state === 'partially_paid' && "bg-blue-50 text-blue-700 border-blue-200"
                          )}
                        >
                          {noddiData.data.ui_meta.money.paid_state.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  )}
                  
                  {noddiData.data.unpaid_count > 0 && (
                    <div className="pt-2 border-t border-border">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <span className="text-xs text-amber-600 font-medium">
                          {noddiData.data.unpaid_count} unpaid booking(s)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <Separator />
            </div>
          )}
          
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
