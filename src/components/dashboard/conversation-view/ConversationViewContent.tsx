import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '@/hooks/use-responsive';
import { ProgressiveMessagesList } from '@/components/conversations/ProgressiveMessagesList';
import { AlwaysVisibleReplyArea } from '@/components/dashboard/conversation-view/AlwaysVisibleReplyArea';
import { CustomerSidePanel } from './CustomerSidePanel';
import { useConversationShortcuts } from '@/hooks/useConversationShortcuts';

interface ConversationViewContentProps {
  conversationId: string;
  conversation: any;
  showSidePanel?: boolean;
}

export const ConversationViewContent: React.FC<ConversationViewContentProps> = ({ 
  conversationId,
  conversation,
  showSidePanel = true
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Enable keyboard shortcuts for status changes
  useConversationShortcuts();

  return (
    <div className="flex h-full">
      {/* Main conversation area */}
      <div className="flex flex-col min-h-0 flex-1 bg-white">
        {/* Enhanced Conversation Header - Phase 2 */}
        <div className="flex-shrink-0 p-5 border-b border-border bg-gray-50 shadow-sm">
          <div className="flex items-center gap-4">
            {/* Left Section: Back + Customer Info */}
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('c');
                  setSearchParams(newParams);
                }}
                className="flex items-center gap-2 shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                {!isMobile && <span className="text-sm">Back</span>}
              </Button>
              
              <div className="flex items-center gap-4 min-w-0">
                <Avatar className="h-14 w-14 ring-2 ring-border shrink-0">
                  <AvatarFallback className="text-xl font-bold">
                    {(conversation.customer?.full_name || conversation.customer?.email || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold mb-1">
                    {conversation.customer?.full_name || 'Unknown Customer'}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {conversation.customer?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Center Section: Subject (if exists) */}
            {conversation.subject && !isMobile && (
              <div className="flex-1 text-center">
                <p className="text-sm font-medium text-muted-foreground">Subject</p>
                <h2 className="text-base font-semibold">
                  {conversation.subject}
                </h2>
              </div>
            )}
            
            {/* Right Section: Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['conversation-messages', conversationId] });
                  queryClient.invalidateQueries({ queryKey: ['conversation-meta', conversationId] });
                  toast.success('Conversation refreshed');
                }}
                className="gap-2"
                title="Refresh (Ctrl+R)"
              >
                <RefreshCw className="h-4 w-4" />
                {!isMobile && <span className="text-xs">Refresh</span>}
              </Button>
            </div>
          </div>
        </div>

        {/* Messages Area with Progressive Loading */}
        <div className="flex-1 min-h-0 w-full flex flex-col bg-white">
          <ProgressiveMessagesList 
            conversationId={conversationId} 
            conversation={conversation}
          />
          <AlwaysVisibleReplyArea conversationId={conversationId} />
        </div>
      </div>

      {/* Side panel - Only on desktop when enabled */}
      {showSidePanel && !isMobile && (
        <div className="flex-shrink-0 w-[360px] xl:w-[400px] border-l border-border">
          <CustomerSidePanel 
            conversation={conversation}
            isCollapsed={false}
          />
        </div>
      )}
    </div>
  );
};
