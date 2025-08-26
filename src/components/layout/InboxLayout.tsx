import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ResponsiveContainer, ResponsiveGrid, LayoutItem, ResponsiveFlex } from '@/components/admin/design/components/layouts';
import { cn } from '@/lib/utils';

interface InboxLayoutProps {
  conversations: Array<{
    id: string;
    title: string;
    subtitle?: string;
    status?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    timestamp?: string;
  }>;
  renderDetail: (conversationId: string) => React.ReactNode;
  title: string;
  className?: string;
  onReply?: (conversationId: string, message: string) => void;
  showReplyBox?: boolean;
}

export const InboxLayout: React.FC<InboxLayoutProps> = ({
  conversations,
  renderDetail,
  title,
  className,
  onReply,
  showReplyBox = true
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');

  // Sync with URL state
  useEffect(() => {
    const conv = searchParams.get('conv');
    if (conv && conversations.find(c => c.id === conv)) {
      setSelectedConversation(conv);
    }
  }, [conversations, searchParams]);

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversation(conversationId);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('conv', conversationId);
    setSearchParams(newParams, { replace: true });
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('conv');
    setSearchParams(newParams, { replace: true });
  };

  const handleSendReply = () => {
    if (selectedConversation && replyMessage.trim()) {
      onReply?.(selectedConversation, replyMessage);
      setReplyMessage('');
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-destructive bg-destructive/5';
      case 'high': return 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20';
      case 'normal': return 'border-l-primary bg-primary/5';
      case 'low': return 'border-l-muted-foreground bg-muted/50';
      default: return 'border-l-border bg-background';
    }
  };

  return (
    <ResponsiveContainer className={cn("h-full w-full max-h-[calc(100vh-120px)]", className)}>
      {selectedConversation ? (
        // Detail View with Reply Sidebar - Full Screen Layout
        <ResponsiveFlex className="h-full w-full" wrap={false}>
          {/* Back Button */}
          <div className="absolute top-4 left-4 z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToList}
              className="flex items-center gap-2 bg-background/95 backdrop-blur-sm border-border"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to {title}</span>
            </Button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 h-full w-full overflow-y-auto pt-16">
            {renderDetail(selectedConversation)}
          </div>

          {/* Reply Sidebar - 25% width with proper styling */}
          {showReplyBox && (
            <div className="w-1/4 bg-background border-l border-border flex flex-col h-full">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Reply</h3>
              </div>
              <div className="flex-1 p-4 flex flex-col gap-4">
                <textarea
                  placeholder="Type your reply..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="flex-1 min-h-[200px] resize-none p-3 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                />
                <Button
                  onClick={handleSendReply}
                  disabled={!replyMessage.trim()}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Reply
                </Button>
              </div>
            </div>
          )}
        </ResponsiveFlex>
      ) : (
        // List View - Full Screen Grid Layout
        <div className="h-full w-full overflow-y-auto">
          <div className="p-4 border-b border-border bg-background sticky top-0 z-10">
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">
              {conversations.length} {conversations.length === 1 ? 'item' : 'items'}
            </p>
          </div>

          <div className="p-4 h-full w-full">
            <ResponsiveGrid 
              cols={{ sm: '1', md: '2', lg: '3', xl: '4' }} 
              gap="4"
              className="auto-rows-fr w-full h-full"
            >
              {conversations.map((conversation) => (
                <LayoutItem key={conversation.id}>
                  <Card 
                    className={cn(
                      "cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 h-full",
                      getPriorityColor(conversation.priority)
                    )}
                    onClick={() => handleSelectConversation(conversation.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium text-foreground line-clamp-2">
                          {conversation.title}
                        </h3>
                        {conversation.status && (
                          <span className={cn(
                            "text-xs px-2 py-1 rounded-full font-medium",
                            conversation.status === 'open' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                            conversation.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            conversation.status === 'resolved' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          )}>
                            {conversation.status}
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {conversation.subtitle && (
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                          {conversation.subtitle}
                        </p>
                      )}
                      {conversation.timestamp && (
                        <p className="text-xs text-muted-foreground">
                          {conversation.timestamp}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </LayoutItem>
              ))}
            </ResponsiveGrid>

            {conversations.length === 0 && (
              <div className="flex items-center justify-center h-64 text-center">
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">No items found</h3>
                  <p className="text-muted-foreground">
                    There are no items in this {title.toLowerCase()} yet.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </ResponsiveContainer>
  );
};