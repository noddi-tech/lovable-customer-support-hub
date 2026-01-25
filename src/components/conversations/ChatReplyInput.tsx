import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, MessageSquareX, UserRoundPlus, Smile, Paperclip, Mic, Image, X } from 'lucide-react';
import { useConversationView } from '@/contexts/ConversationViewContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useAgentTyping } from '@/hooks/useAgentTyping';
import { useAgents } from '@/hooks/useAgents';
import { useChatSessionTransfer } from '@/hooks/useChatSessionTransfer';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EmojiPicker } from '@/components/ui/emoji-picker';
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

interface AttachmentPreview {
  file: File;
  url: string;
  type: 'image' | 'file';
}

export const ChatReplyInput = ({ conversationId, onSent }: ChatReplyInputProps) => {
  const [message, setMessage] = useState('');
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
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

  const uploadAttachment = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${conversationId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('chat-attachments')
      .upload(fileName, file);
    
    if (error) {
      console.error('Upload error:', error);
      return null;
    }
    
    const { data: urlData } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  };

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error('Not authenticated');

      // Upload attachments first
      const uploadedUrls: { url: string; name: string; type: string }[] = [];
      
      if (attachments.length > 0) {
        setIsUploading(true);
        for (const attachment of attachments) {
          const url = await uploadAttachment(attachment.file);
          if (url) {
            uploadedUrls.push({
              url,
              name: attachment.file.name,
              type: attachment.file.type,
            });
          }
        }
        setIsUploading(false);
      }

      // Get user's profile to get their ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('user_id', user.id)
        .single();

      const messageContent = content || (uploadedUrls.length > 0 ? '[Attachment]' : '');
      
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: messageContent,
          sender_type: 'agent',
          sender_id: user.id,
          is_internal: false,
          attachments: uploadedUrls.length > 0 ? uploadedUrls : null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      setMessage('');
      setAttachments([]);
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
      // Try to find active/waiting session (may not exist if visitor already left)
      const { data: session } = await supabase
        .from('widget_chat_sessions')
        .select('id')
        .eq('conversation_id', conversationId)
        .in('status', ['active', 'waiting'])
        .maybeSingle();

      // Update session if it exists
      if (session) {
        await supabase
          .from('widget_chat_sessions')
          .update({ 
            status: 'ended',
            ended_at: new Date().toISOString(),
          })
          .eq('id', session.id);
      }

      // Always close the conversation
      const { error: convError } = await supabase
        .from('conversations')
        .update({ 
          status: 'closed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (convError) throw convError;
    },
    onSuccess: () => {
      toast.success('Chat ended');
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['chat-counts'] });
      // Navigate to ended tab
      navigate('/interactions/chat/ended');
    },
    onError: (error) => {
      console.error('Failed to end chat:', error);
      toast.error('Failed to end chat');
    },
  });

  const handleSend = useCallback(() => {
    const trimmedMessage = message.trim();
    if ((!trimmedMessage && attachments.length === 0) || sendMessageMutation.isPending) return;
    stopTyping(); // Clear typing indicator before sending
    sendMessageMutation.mutate(trimmedMessage);
  }, [message, attachments, sendMessageMutation, stopTyping]);

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

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const newAttachments: AttachmentPreview[] = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
      type: file.type.startsWith('image/') ? 'image' : 'file',
    }));
    
    setAttachments(prev => [...prev, ...newAttachments]);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => {
      const newAttachments = [...prev];
      URL.revokeObjectURL(newAttachments[index].url);
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  }, []);

  const handleEmojiSelect = useCallback((emoji: string) => {
    setMessage(prev => prev + emoji);
  }, []);

  // Filter out current user from transfer targets
  const transferableAgents = agents?.filter(a => a.user_id !== user?.id) || [];

  const isPending = sendMessageMutation.isPending || isUploading;

  return (
    <>
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-t border-border bg-muted/30 overflow-x-auto">
          {attachments.map((attachment, index) => (
            <div key={index} className="relative shrink-0">
              {attachment.type === 'image' ? (
                <img 
                  src={attachment.url} 
                  alt={attachment.file.name}
                  className="h-16 w-16 object-cover rounded-lg border"
                />
              ) : (
                <div className="h-16 w-16 flex items-center justify-center bg-muted rounded-lg border">
                  <Paperclip className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <button
                onClick={() => removeAttachment(index)}
                className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex items-center gap-2 p-4 border-t border-border bg-background">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {/* Emoji picker */}
        <EmojiPicker 
          onEmojiSelect={handleEmojiSelect}
          trigger={
            <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground">
              <Smile className="h-5 w-5" />
            </Button>
          }
        />
        
        {/* Attachment button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        {/* Message input */}
        <Input 
          placeholder="Type a message..." 
          className="flex-1 rounded-full bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/20"
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={stopTyping}
          disabled={isPending}
        />
        
        {/* Mic button (placeholder) */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="shrink-0 h-9 w-9 text-muted-foreground"
          disabled
          title="Voice messages coming soon"
        >
          <Mic className="h-5 w-5" />
        </Button>

        {/* Send button */}
        <Button 
          size="icon" 
          className="rounded-full shrink-0 h-10 w-10"
          onClick={handleSend}
          disabled={(!message.trim() && attachments.length === 0) || isPending}
        >
          {isPending ? (
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
            <MessageSquareX className="h-4 w-4" />
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