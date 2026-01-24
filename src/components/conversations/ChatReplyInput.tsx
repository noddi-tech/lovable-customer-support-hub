import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, PhoneOff } from 'lucide-react';
import { useConversationView } from '@/contexts/ConversationViewContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useAgentTyping } from '@/hooks/useAgentTyping';

interface ChatReplyInputProps {
  conversationId: string;
  onSent?: () => void;
}

export const ChatReplyInput = ({ conversationId, onSent }: ChatReplyInputProps) => {
  const [message, setMessage] = useState('');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { state } = useConversationView();
  
  // Agent typing indicator
  const { handleTyping, stopTyping } = useAgentTyping({ 
    conversationId,
    enabled: true 
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error('Not authenticated');

      // Get user's profile to get their ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('user_id', user.id)
        .single();

      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: content,
          sender_type: 'agent',
          sender_id: user.id,
          is_internal: false,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      setMessage('');
      // Invalidate messages to trigger refetch
      queryClient.invalidateQueries({ 
        queryKey: ['conversation-messages', conversationId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['thread-messages'] 
      });
      onSent?.();
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    },
  });

  const endChatMutation = useMutation({
    mutationFn: async () => {
      // Find the chat session for this conversation
      const { data: session } = await supabase
        .from('widget_chat_sessions')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('status', 'active')
        .single();

      if (session) {
        // End the session
        const { error } = await supabase
          .from('widget_chat_sessions')
          .update({ 
            status: 'ended',
            ended_at: new Date().toISOString(),
          })
          .eq('id', session.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Chat ended');
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    },
    onError: (error) => {
      console.error('Failed to end chat:', error);
      toast.error('Failed to end chat');
    },
  });

  const handleSend = useCallback(() => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || sendMessageMutation.isPending) return;
    stopTyping(); // Clear typing indicator before sending
    sendMessageMutation.mutate(trimmedMessage);
  }, [message, sendMessageMutation, stopTyping]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    handleTyping(); // Trigger typing indicator
  }, [handleTyping]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEndChat = useCallback(() => {
    if (endChatMutation.isPending) return;
    endChatMutation.mutate();
  }, [endChatMutation]);

  return (
    <div className="flex items-center gap-3 p-4 border-t border-border bg-background">
      <Input 
        placeholder="Type a message..." 
        className="flex-1 rounded-full bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/20"
        value={message}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={stopTyping}
        disabled={sendMessageMutation.isPending}
      />
      <Button 
        size="icon" 
        className="rounded-full shrink-0 h-10 w-10"
        onClick={handleSend}
        disabled={!message.trim() || sendMessageMutation.isPending}
      >
        {sendMessageMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
      <Button 
        size="icon" 
        variant="outline"
        className="rounded-full shrink-0 h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={handleEndChat}
        disabled={endChatMutation.isPending}
        title="End chat"
      >
        {endChatMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <PhoneOff className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
};
