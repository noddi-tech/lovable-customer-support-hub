import React from 'react';
import { useLiveChatSessions } from '@/hooks/useLiveChatSessions';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Clock, User, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface LiveChatQueueProps {
  className?: string;
  compact?: boolean;
}

export const LiveChatQueue: React.FC<LiveChatQueueProps> = ({ 
  className,
  compact = false
}) => {
  const { profile } = useAuth();
  const organizationId = profile?.organization_id || null;
  const { waitingSessions, activeSessions, isLoading, claimSession, dismissSession } = useLiveChatSessions(organizationId);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleClaimSession = async (sessionId: string, conversationId: string) => {
    if (!profile?.id) return;
    
    // Use profile.id (not user_id) as it matches the FK on widget_chat_sessions.assigned_agent_id
    const success = await claimSession(sessionId, profile.id);
    if (success) {
      // Navigate to the conversation
      navigate(`/interactions/text/open?c=${conversationId}`);
    }
  };

  const handleOpenConversation = (conversationId: string) => {
    navigate(`/interactions/text/open?c=${conversationId}`);
  };

  const handleDismissSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Default dismissal message - this will be shown to the customer
    const dismissalMessage = "Due to high demand, we can't connect you with an agent right now. We'll follow up with you via email shortly.";
    const success = await dismissSession(sessionId, dismissalMessage);
    if (success) {
      toast.info('Chat dismissed', {
        description: 'The visitor will see a message and the conversation will remain for email follow-up.',
      });
    } else {
      toast.error('Failed to dismiss chat');
    }
  };

  const totalCount = waitingSessions.length + activeSessions.length;

  if (isLoading) {
    return null;
  }

  if (totalCount === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
          <MessageCircle className="h-3 w-3 mr-1" />
          {waitingSessions.length} waiting
        </Badge>
        {activeSessions.length > 0 && (
          <Badge variant="outline">
            {activeSessions.length} active
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Live Chat Queue
          {waitingSessions.length > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {waitingSessions.length} waiting
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Waiting Sessions */}
        {waitingSessions.map((session) => (
          <div 
            key={session.id}
            className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center">
                <User className="h-4 w-4 text-amber-700 dark:text-amber-300" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {session.visitorName || session.visitorEmail || 'Visitor'}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Waiting {formatDistanceToNow(new Date(session.startedAt), { addSuffix: false })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => handleDismissSession(session.id, e)}
                className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                title="Dismiss chat"
              >
                <X className="h-4 w-4" />
              </Button>
              <Button 
                size="sm"
                onClick={() => handleClaimSession(session.id, session.conversationId)}
              >
                Claim
              </Button>
            </div>
          </div>
        ))}

        {/* Active Sessions (assigned to current user) */}
        {activeSessions
          .filter(s => s.assignedAgentId === profile?.user_id)
          .map((session) => (
            <div 
              key={session.id}
              className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg cursor-pointer hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors"
              onClick={() => handleOpenConversation(session.conversationId)}
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center relative">
                  <User className="h-4 w-4 text-green-700 dark:text-green-300" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {session.visitorName || session.visitorEmail || 'Visitor'}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Active chat
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-green-600 border-green-300">
                Open
              </Badge>
            </div>
          ))}

        {waitingSessions.length === 0 && activeSessions.filter(s => s.assignedAgentId === profile?.user_id).length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            No active chats
          </p>
        )}
      </CardContent>
    </Card>
  );
};
