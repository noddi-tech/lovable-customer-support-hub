import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageSquare, 
  RefreshCw,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-responsive';
import { useConversationMeta } from '@/hooks/conversations/useConversationMeta';
import { ProgressiveMessagesList } from '@/components/conversations/ProgressiveMessagesList';
import { LazyReplyArea } from '@/components/conversations/LazyReplyArea';
import { ConversationViewProvider } from '@/contexts/ConversationViewContext';

interface ConversationViewProps {
  conversationId: string | null;
}

export const ConversationView: React.FC<ConversationViewProps> = ({ conversationId }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Use optimized hooks for fast loading
  const { data: conversation, isLoading: conversationLoading, error: conversationError } = useConversationMeta(conversationId);

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">{t('conversation.selectConversation')}</p>
          <p className="text-sm">{t('conversation.chooseFromList')}</p>
        </div>
      </div>
    );
  }

  if (conversationLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (conversationError || !conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-lg mb-2">Error loading conversation</p>
          <p className="text-sm">{conversationError?.message || 'Conversation not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <ConversationViewProvider conversationId={conversationId}>
      <div className="flex-1 min-h-0 w-full flex flex-col bg-background">
        {/* Conversation Header */}
        <div className="flex-shrink-0 p-3 md:p-4 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 md:space-x-4 min-w-0 flex-1">
              {/* Back to Inbox Button */}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('c');
                  setSearchParams(newParams);
                }}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {isMobile ? '' : 'Back to Inbox'}
              </Button>
              
              {/* Customer Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {(conversation.customer?.full_name || conversation.customer?.email || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h1 className="text-sm md:text-base font-semibold truncate">
                      {conversation.customer?.full_name || 'Unknown Customer'}
                    </h1>
                    <p className="text-xs text-muted-foreground truncate">
                      {conversation.customer?.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['conversation-messages', conversationId] });
                  queryClient.invalidateQueries({ queryKey: ['conversation-meta', conversationId] });
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Messages Area with Progressive Loading */}
        <div className="flex-1 min-h-0 w-full flex flex-col bg-background">
          <ProgressiveMessagesList 
            conversationId={conversationId} 
            conversation={conversation}
          />
          <LazyReplyArea conversationId={conversationId} />
        </div>
      </div>
    </ConversationViewProvider>
  );
};