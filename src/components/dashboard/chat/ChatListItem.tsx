import React, { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useNoddihKundeData } from '@/hooks/useNoddihKundeData';
import { Check, CheckCheck } from 'lucide-react';

interface ChatConversation {
  id: string;
  subject: string | null;
  preview_text: string | null;
  status: string;
  updated_at: string;
  is_read: boolean;
  customer: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  session?: {
    id: string;
    status: string;
    visitor_name: string | null;
    visitor_email: string | null;
  } | null;
}

interface ChatListItemProps {
  conv: ChatConversation;
  isSelected: boolean;
  onSelect: () => void;
}

export const ChatListItem: React.FC<ChatListItemProps> = ({
  conv,
  isSelected,
  onSelect,
}) => {
  const customerName = conv.session?.visitor_name || conv.customer?.full_name || 'Visitor';
  const customerEmail = conv.session?.visitor_email || conv.customer?.email;
  const isWaiting = conv.session?.status === 'waiting';
  const isActive = conv.session?.status === 'active';
  const initial = customerName.charAt(0).toUpperCase();

  // Create customer object for Noddi lookup
  const customer = useMemo(() => ({
    id: conv.customer?.id || conv.id,
    email: customerEmail || undefined,
    phone: undefined,
    full_name: customerName,
  }), [conv.customer?.id, conv.id, customerEmail, customerName]);

  // Noddi customer lookup
  const { data: noddiData } = useNoddihKundeData(customer);
  const isNoddiCustomer = noddiData?.data?.found;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all duration-200",
        isSelected
          ? "bg-accent border-accent-foreground/20 shadow-sm"
          : "hover:bg-muted/50 border-transparent",
        !conv.is_read && "bg-primary/5"
      )}
    >
      {/* Avatar with status indicator */}
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarFallback className={cn(
            "text-sm font-medium",
            isNoddiCustomer ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-primary/10"
          )}>
            {initial}
          </AvatarFallback>
        </Avatar>
        {/* Status dot */}
        {(isWaiting || isActive) && (
          <div className={cn(
            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
            isWaiting ? "bg-yellow-500 animate-pulse" : "bg-green-500"
          )} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn(
            "text-sm truncate",
            !conv.is_read ? "font-semibold" : "font-medium"
          )}>
            {customerName}
          </span>
          {isNoddiCustomer && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
              Noddi
            </Badge>
          )}
          {isWaiting && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
              WAITING
            </Badge>
          )}
          {isActive && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-300 animate-pulse dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
              LIVE
            </Badge>
          )}
        </div>
        {customerEmail && (
          <span className="text-xs text-muted-foreground truncate block">
            {customerEmail}
          </span>
        )}
        <div className="flex items-center gap-1 mt-1">
          {/* Delivery status indicator */}
          {conv.is_read ? (
            <CheckCheck className="h-3 w-3 text-primary shrink-0" />
          ) : (
            <Check className="h-3 w-3 text-muted-foreground shrink-0" />
          )}
          <p className="text-xs text-muted-foreground line-clamp-1">
            {conv.preview_text || 'No messages yet'}
          </p>
        </div>
      </div>

      {/* Time + unread indicator */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={cn(
          "text-[10px]",
          !conv.is_read ? "text-primary font-medium" : "text-muted-foreground"
        )}>
          {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: false })}
        </span>
        {!conv.is_read && (
          <span className="h-2 w-2 rounded-full bg-primary" />
        )}
      </div>
    </button>
  );
};
