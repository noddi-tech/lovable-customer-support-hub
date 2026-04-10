import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export const ConversationRedirect = () => {
  const { conversationId, messageId } = useParams();
  
  const { data: conversation, isLoading, error } = useQuery({
    queryKey: ['conversation-redirect', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, status, inbox_id, channel')
        .eq('id', conversationId!)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
    staleTime: 30000,
  });
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (error || !conversation) {
    return <Navigate to="/interactions/text/open" replace />;
  }
  
  const isChat = conversation.channel === 'widget';
  const params = new URLSearchParams();
  
  if (messageId) {
    params.set('m', messageId);
  }
  
  // Route to the conversation resource URL
  const type = isChat ? 'chat' : 'text';
  const qs = params.toString();
  const targetPath = `/interactions/${type}/conversations/${conversationId}${qs ? `?${qs}` : ''}`;
  
  return <Navigate to={targetPath} replace />;
};
