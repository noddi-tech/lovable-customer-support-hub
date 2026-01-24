import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, PhoneOff, UserRoundPlus } from 'lucide-react';
import { useConversationView } from '@/contexts/ConversationViewContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useAgentTyping } from '@/hooks/useAgentTyping';
import { useAgents } from '@/hooks/useAgents';
import { useChatSessionTransfer } from '@/hooks/useChatSessionTransfer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ChatReplyInputProps {
  conversationId: string;
  onSent?: () => void;
}

export const ChatReplyInput = ({ conversationId, onSent }: ChatReplyInputProps) => {
  const [message, setMessage] = useState('');
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { state } = useConversationView();
  
  // Fetch agents for transfer
  const { data: agents } = useAgents();
  
  // Transfer hook
  const { currentAssigneeId, transferSession, isTransferring } = useChatSessionTransfer(conversationId);
  
  // Get current user's profile for transfer message
  const currentAgentName = agents?.find(a => a.user_id === user?.id)?.full_name || 'Agent';
  
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

  const handleTransfer = useCallback(async () => {
    if (!selectedAgentId || isTransferring) return;
    
    const targetAgent = agents?.find(a => a.id === selectedAgentId);
    if (!targetAgent) return;
    
    await transferSession(selectedAgentId, currentAgentName, targetAgent.full_name);
    setTransferDialogOpen(false);
    setSelectedAgentId('');
  }, [selectedAgentId, isTransferring, agents, transferSession, currentAgentName]);

  // Filter out current user from transfer targets
  const transferableAgents = agents?.filter(a => a.user_id !== user?.id) || [];

  return (
    <>
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
        
        {/* Transfer Chat Button */}
        {transferableAgents.length > 0 && (
          <Button 
            size="icon" 
            variant="outline"
            className="rounded-full shrink-0 h-10 w-10"
            onClick={() => setTransferDialogOpen(true)}
            disabled={isTransferring}
            title="Transfer chat"
          >
            {isTransferring ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserRoundPlus className="h-4 w-4" />
            )}
          </Button>
        )}
        
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

      {/* Transfer Chat Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Chat</DialogTitle>
            <DialogDescription>
              Hand off this conversation to another team member. They will be notified immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a team member" />
              </SelectTrigger>
              <SelectContent>
                {transferableAgents.map(agent => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.full_name}
                    {agent.email && (
                      <span className="text-muted-foreground ml-2">({agent.email})</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleTransfer} 
                disabled={!selectedAgentId || isTransferring}
              >
                {isTransferring ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Transferring...
                  </>
                ) : (
                  'Transfer'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
