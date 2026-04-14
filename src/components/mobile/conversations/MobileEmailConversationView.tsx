import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { canGoBackInApp, getConversationBackPath } from '@/utils/conversationNavigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, CircleDot, Clock, CheckCircle2, Archive, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { getCustomerDisplayWithNoddi, getCustomerInitial } from '@/utils/customerDisplayName';
import { useNoddihKundeData } from '@/hooks/useNoddihKundeData';
import { useConversationView } from '@/contexts/ConversationViewContext';
import { useThreadMessagesList } from '@/hooks/conversations/useThreadMessagesList';
import { createNormalizationContext } from '@/lib/normalizeMessage';
import { useAuth } from '@/hooks/useAuth';
import { MobileEmailMessageCard } from './MobileEmailMessageCard';
import { MobileCustomerSummaryCard } from './MobileCustomerSummaryCard';
import { LazyReplyArea } from '@/components/conversations/LazyReplyArea';
import { cn } from '@/lib/utils';

interface MobileEmailConversationViewProps {
  conversationId: string;
  conversation: any;
}

export const MobileEmailConversationView: React.FC<MobileEmailConversationViewProps> = ({
  conversationId,
  conversation,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversationIds, updateStatus } = useConversationView();
  const { data: noddiData } = useNoddihKundeData(conversation.customer || null);

  const customerDisplay = useMemo(() =>
    getCustomerDisplayWithNoddi(noddiData, conversation.customer?.full_name, conversation.customer?.email),
    [noddiData, conversation.customer?.full_name, conversation.customer?.email]
  );

  const normCtx = useMemo(() => createNormalizationContext({
    currentUserEmail: user?.email,
    agentDomains: ['noddi.no'],
    agentEmails: [],
    conversationCustomerEmail: conversation?.customer?.email,
    conversationCustomerName: conversation?.customer?.full_name,
  }), [user?.email, conversation?.customer?.email, conversation?.customer?.full_name]);

  const fetchIds = conversationIds || conversationId;
  const {
    messages,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useThreadMessagesList(fetchIds, normCtx);

  const handleBack = () => {
    if (canGoBackInApp()) {
      navigate(-1);
    } else {
      navigate(getConversationBackPath(window.location.pathname));
    }
  };

  // Messages in ASC order (oldest first)
  const sortedMessages = [...messages].reverse();

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Compact header */}
      <div className="flex-shrink-0 px-2 py-2 border-b flex items-center gap-2 bg-card shadow-sm">
        <SidebarTrigger className="shrink-0 h-8 w-8" />
        <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0 h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium truncate">
              {customerDisplay.displayName}
            </span>
            {conversation.is_archived && (
              <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0 bg-muted text-muted-foreground">
                <Archive className="h-2.5 w-2.5 mr-0.5" />
                Archived
              </Badge>
            )}
          </div>
          {conversation.subject && (
            <p className="text-[10px] text-muted-foreground truncate">
              {conversation.subject}
            </p>
          )}
        </div>

        <Select value={conversation?.status || 'open'} onValueChange={(s) => updateStatus({ status: s })}>
          <SelectTrigger className="h-6 w-[80px] text-[10px] shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open"><div className="flex items-center gap-1"><CircleDot className="h-3 w-3" />Open</div></SelectItem>
            <SelectItem value="pending"><div className="flex items-center gap-1"><Clock className="h-3 w-3" />Pending</div></SelectItem>
            <SelectItem value="closed"><div className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Closed</div></SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Customer summary with Noddi data */}
      <MobileCustomerSummaryCard customer={conversation.customer} noddiData={noddiData} />

      {/* Messages */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="divide-y divide-border/30">
            {sortedMessages.map((msg, idx) => (
              <MobileEmailMessageCard
                key={msg.dedupKey || msg.id}
                message={msg}
                conversation={conversation}
                isNewest={idx === sortedMessages.length - 1}
              />
            ))}

            {(hasNextPage || isFetchingNextPage) && (
              <div className="text-center py-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={!hasNextPage || isFetchingNextPage}
                  className="text-xs"
                >
                  {isFetchingNextPage ? (
                    <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Loading...</>
                  ) : 'Load older messages'}
                </Button>
              </div>
            )}

            {/* Reply area */}
            {messages.length > 0 && (
              <div className="p-2">
                <LazyReplyArea conversationId={conversationId} onReply={undefined} />
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
