import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send, MessageCircle, Archive, Forward, UserCheck } from 'lucide-react';
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
  const [isReplyBoxVisible, setIsReplyBoxVisible] = useState(false);

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
      setIsReplyBoxVisible(false);
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
    <div className={cn("flex-1 overflow-hidden h-full bg-background", className)}>
      {selectedConversation ? (
        // Detail View - Enhanced card-based layout
        <ResponsiveContainer className="h-full flex flex-col">
          {/* Back Button - Clean positioning */}
          <div className="p-4 border-b border-border bg-card">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToList}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to {title}</span>
            </Button>
          </div>

          {/* Main Content with Enhanced Card Structure */}
          <div className="flex-1 overflow-y-auto bg-background p-4">
            <Card className="w-full h-fit shadow-sm border-border">
              <CardHeader>
                <h3 className="text-lg font-semibold text-foreground">Conversation Details</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderDetail(selectedConversation)}
              </CardContent>
            </Card>
            
            {/* Enhanced Reply Box */}
            {showReplyBox && isReplyBoxVisible && (
              <Card className="mt-4 border-border shadow-sm">
                <CardHeader>
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Reply to this conversation
                  </h4>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    placeholder="Type your reply..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="min-h-[120px] resize-none bg-background border-border focus:ring-ring"
                  />
                  <ResponsiveFlex className="gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setIsReplyBoxVisible(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSendReply}
                      disabled={!replyMessage.trim()}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Reply
                    </Button>
                  </ResponsiveFlex>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Enhanced Floating Reply Button */}
          {showReplyBox && !isReplyBoxVisible && (
            <div className="fixed bottom-6 right-6 z-20">
              <Button 
                onClick={() => setIsReplyBoxVisible(true)}
                className="shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Reply
              </Button>
            </div>
          )}
        </ResponsiveContainer>
      ) : (
        // List View - Enhanced Card-Based Grid Layout
        <ResponsiveContainer className="h-full flex flex-col">
          {/* Enhanced Header Card */}
          <Card className="border-b border-border rounded-none shadow-none bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {conversations.length} {conversations.length === 1 ? 'item' : 'items'}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Enhanced Conversation Grid with Cards */}
          <div className="flex-1 overflow-y-auto bg-background p-4">
            <ResponsiveGrid 
              cols={{ sm: '1', md: '2', lg: '3', xl: '4' }} 
              gap="4"
              className="auto-rows-fr"
            >
              {conversations.map((conversation) => (
                <LayoutItem key={conversation.id}>
                  <Card 
                    className={cn(
                      "cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 h-full group hover:scale-[1.02]",
                      getPriorityColor(conversation.priority),
                      "bg-card border-border hover:border-primary/20"
                    )}
                    onClick={() => handleSelectConversation(conversation.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium text-card-foreground line-clamp-2 group-hover:text-primary transition-colors">
                          {conversation.title}
                        </h3>
                        {conversation.status && (
                          <span className={cn(
                            "text-xs px-2 py-1 rounded-full font-medium",
                            conversation.status === 'open' ? 'bg-success/10 text-success border border-success/20' :
                            conversation.status === 'pending' ? 'bg-warning/10 text-warning border border-warning/20' :
                            conversation.status === 'resolved' ? 'bg-primary/10 text-primary border border-primary/20' :
                            'bg-muted text-muted-foreground border border-border'
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

            {/* Enhanced Empty State */}
            {conversations.length === 0 && (
              <Card className="border-dashed border-2 border-border">
                <CardContent className="flex items-center justify-center h-64 text-center">
                  <div>
                    <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No items found</h3>
                    <p className="text-muted-foreground">
                      There are no items in this {title.toLowerCase()} yet.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ResponsiveContainer>
      )}
    </div>
  );
};