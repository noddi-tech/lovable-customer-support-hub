import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Clock, XCircle, MessageCircle } from 'lucide-react';
import { useConversationStatusActions } from '@/hooks/useConversationStatusActions';

interface ConversationStatusContextMenuProps {
  conversationId: string;
  status?: string;
  children: React.ReactNode;
}

/**
 * Right-click menu giving agents one-click "Pending" / "Close" / "Reopen"
 * on a conversation row (email list and live chat list share this).
 */
export const ConversationStatusContextMenu: React.FC<ConversationStatusContextMenuProps> = ({
  conversationId,
  status,
  children,
}) => {
  const { setStatus } = useConversationStatusActions();

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuLabel className="text-xs text-muted-foreground">Change status</ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem
          disabled={status === 'pending'}
          onSelect={() => setStatus(conversationId, 'pending')}
        >
          <Clock className="w-4 h-4 mr-2" />
          Set to pending
        </ContextMenuItem>
        <ContextMenuItem
          disabled={status === 'closed'}
          onSelect={() => setStatus(conversationId, 'closed')}
        >
          <XCircle className="w-4 h-4 mr-2" />
          Close conversation
        </ContextMenuItem>
        <ContextMenuItem
          disabled={status === 'open'}
          onSelect={() => setStatus(conversationId, 'open')}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Reopen
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
