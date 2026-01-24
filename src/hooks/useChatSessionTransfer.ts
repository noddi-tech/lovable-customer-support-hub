import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface TransferResult {
  success: boolean;
  error?: string;
}

export function useChatSessionTransfer(conversationId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch current session for this conversation
  const { data: session } = useQuery({
    queryKey: ['chat-session', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('widget_chat_sessions')
        .select('id, assigned_agent_id, status')
        .eq('conversation_id', conversationId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async ({ 
      newAgentId, 
      fromAgentName, 
      toAgentName 
    }: { 
      newAgentId: string; 
      fromAgentName: string; 
      toAgentName: string; 
    }): Promise<TransferResult> => {
      if (!session?.id) {
        return { success: false, error: 'No active session found' };
      }

      // Update the session's assigned agent
      const { error: updateError } = await supabase
        .from('widget_chat_sessions')
        .update({ assigned_agent_id: newAgentId })
        .eq('id', session.id);

      if (updateError) {
        console.error('[useChatSessionTransfer] Failed to update session:', updateError);
        return { success: false, error: updateError.message };
      }

      // Insert a system message about the transfer
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: `Chat transferred from ${fromAgentName} to ${toAgentName}`,
          sender_type: 'system',
          sender_id: user?.id,
          is_internal: false,
          content_type: 'text/plain',
        });

      if (messageError) {
        console.error('[useChatSessionTransfer] Failed to insert transfer message:', messageError);
        // Don't fail the transfer just because the message failed
      }

      return { success: true };
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Chat transferred successfully');
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['chat-session', conversationId] });
        queryClient.invalidateQueries({ queryKey: ['live-chat-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['conversation-messages', conversationId] });
        queryClient.invalidateQueries({ queryKey: ['thread-messages'] });
      } else {
        toast.error(result.error || 'Failed to transfer chat');
      }
    },
    onError: (error) => {
      console.error('[useChatSessionTransfer] Transfer error:', error);
      toast.error('Failed to transfer chat');
    },
  });

  return {
    currentAssigneeId: session?.assigned_agent_id,
    sessionId: session?.id,
    transferSession: (newAgentId: string, fromAgentName: string, toAgentName: string) => 
      transferMutation.mutateAsync({ newAgentId, fromAgentName, toAgentName }),
    isTransferring: transferMutation.isPending,
  };
}
