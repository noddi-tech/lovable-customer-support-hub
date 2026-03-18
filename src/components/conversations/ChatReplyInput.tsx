import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MentionTextarea } from '@/components/ui/mention-textarea';
import { useMentionNotifications } from '@/hooks/useMentionNotifications';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, MessageSquareX, UserRoundPlus, Smile, Paperclip, Mic, Image, X, Languages, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils'; // utility
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
import { Label } from '@/components/ui/label';

const LANGUAGES = [
  { code: 'auto', label: 'Auto Detect' },
  { code: 'en', label: 'English' },
  { code: 'no', label: 'Norwegian' },
  { code: 'sv', label: 'Swedish' },
  { code: 'da', label: 'Danish' },
  { code: 'de', label: 'German' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
];

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
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [replyStatus, setReplyStatus] = useState<'closed' | 'open' | 'pending'>('closed');
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [translateLoading, setTranslateLoading] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('no');
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

  const uploadAttachment = async (file: File): Promise<{ url: string; storagePath: string } | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${conversationId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('chat-attachments')
      .upload(fileName, file);
    
    if (error) {
      console.error('Upload error:', error);
      return null;
    }
    
    const { data: signedUrlData, error: signedError } = await supabase.storage
      .from('chat-attachments')
      .createSignedUrl(fileName, 3600);
    
    if (signedError || !signedUrlData) {
      console.error('Signed URL error:', signedError);
      return null;
    }
    
    return { url: signedUrlData.signedUrl, storagePath: fileName };
  };

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error('Not authenticated');

      const uploadedAttachments: { url: string; name: string; type: string; storagePath: string }[] = [];
      
      if (attachments.length > 0) {
        setIsUploading(true);
        for (const attachment of attachments) {
          const result = await uploadAttachment(attachment.file);
          if (result) {
            uploadedAttachments.push({
              url: result.url,
              name: attachment.file.name,
              type: attachment.file.type,
              storagePath: result.storagePath,
            });
          }
        }
        setIsUploading(false);
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('user_id', user.id)
        .single();

      const messageContent = content || (uploadedAttachments.length > 0 ? '[Attachment]' : '');
      
      const { data: insertedMsg, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: messageContent,
          sender_type: 'agent',
          sender_id: user.id,
          is_internal: isInternalNote,
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments : null,
          email_status: isInternalNote ? null : 'sending',
        })
        .select('id')
        .single();

      if (error) throw error;

      // For non-internal messages: update status + send email if not live
      if (!isInternalNote) {
        // Update conversation status (agent chooses: closed, open, pending)
        if (replyStatus !== 'open') {
          console.log('[ChatReplyInput] Updating conversation status:', { conversationId, replyStatus });
          const { error: statusError } = await supabase
            .from('conversations')
            .update({ 
              status: replyStatus,
              is_read: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', conversationId);
          
          if (statusError) {
            console.error('[ChatReplyInput] Failed to update conversation status:', statusError);
            throw new Error(`Failed to update status: ${statusError.message}`);
          }
          console.log('[ChatReplyInput] Conversation status updated successfully to:', replyStatus);
        }

        // Check if there's an active live chat session
        const { data: activeSession } = await supabase
          .from('widget_chat_sessions')
          .select('id, last_seen_at, status')
          .eq('conversation_id', conversationId)
          .in('status', ['active', 'waiting'])
          .maybeSingle();

        const isLive = activeSession?.last_seen_at && 
          new Date(activeSession.last_seen_at) > new Date(Date.now() - 60000) &&
          activeSession.status === 'active';

        // If not actively live, send via email
        if (!isLive && insertedMsg?.id) {
          try {
            await supabase.functions.invoke('send-reply-email', {
              body: { messageId: insertedMsg.id }
            });
          } catch (emailErr) {
            console.error('[ChatReplyInput] Email send failed:', emailErr);
          }
        }
      }
    },
    onSuccess: () => {
      setMessage('');
      setIsInternalNote(false);
      setAttachments([]);
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['thread-messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['all-counts'] });
      queryClient.invalidateQueries({ queryKey: ['inboxCounts'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversation-meta', conversationId] });
      onSent?.();
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    },
  });

  const endChatMutation = useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase
        .from('widget_chat_sessions')
        .select('id')
        .eq('conversation_id', conversationId)
        .in('status', ['active', 'waiting'])
        .maybeSingle();

      if (session) {
        await supabase
          .from('widget_chat_sessions')
          .update({ 
            status: 'ended',
            ended_at: new Date().toISOString(),
          })
          .eq('id', session.id);
      }

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
    stopTyping();
    sendMessageMutation.mutate(trimmedMessage);
  }, [message, attachments, sendMessageMutation, stopTyping]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    if (!isInternalNote) {
      handleTyping();
    }
  }, [handleTyping, isInternalNote]);

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

  const handleTranslate = useCallback(async () => {
    if (!message.trim() || translateLoading) return;
    setTranslateLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-text', {
        body: { text: message, sourceLanguage, targetLanguage },
      });
      if (error) throw error;
      if (data?.translatedText) {
        setMessage(data.translatedText);
        toast.success('Message translated');
      }
    } catch (err) {
      console.error('Translation error:', err);
      toast.error('Failed to translate message');
    } finally {
      setTranslateLoading(false);
    }
  }, [message, sourceLanguage, targetLanguage, translateLoading]);

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

      {/* Internal note banner */}
      {isInternalNote && (
        <div className="flex items-center gap-2 px-4 py-2 border-t border-warning/50 bg-warning/10">
          <StickyNote className="h-4 w-4 text-warning" />
          <span className="text-xs font-medium text-warning">Internal note — not visible to the customer</span>
        </div>
      )}
      
      <div className={cn(
        "flex items-end gap-2 p-4 border-t border-border bg-background",
        isInternalNote && "bg-warning/5 border-t-warning/50"
      )}>
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

        {/* Internal note toggle */}
        <Button 
          variant={isInternalNote ? "secondary" : "ghost"}
          size="sm" 
          className={cn(
            "shrink-0 h-9 gap-1.5",
            isInternalNote 
              ? "text-warning bg-warning/15 hover:bg-warning/25" 
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setIsInternalNote(!isInternalNote)}
          title={isInternalNote ? "Switch to reply" : "Write internal note"}
        >
          <StickyNote className="h-4 w-4" />
          <span className="text-xs">Note</span>
        </Button>

        {/* Translate button */}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground"
              title="Translate message"
            >
              <Languages className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" side="top" align="start">
            <div className="space-y-3">
              <p className="font-medium text-sm">Translate</p>
              <div className="space-y-1.5">
                <Label className="text-xs">From</Label>
                <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => (
                      <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">To</Label>
                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.filter(l => l.code !== 'auto').map(l => (
                      <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                size="sm" 
                className="w-full" 
                onClick={handleTranslate}
                disabled={!message.trim() || translateLoading}
              >
                {translateLoading ? (
                  <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Translating...</>
                ) : (
                  'Translate'
                )}
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Message input */}
        <Textarea 
          placeholder={isInternalNote ? "Write an internal note..." : "Type a message..."} 
          className={cn(
            "flex-1 min-h-[80px] resize-none rounded-2xl border-0 focus-visible:ring-2 focus-visible:ring-primary/20",
            isInternalNote ? "bg-warning/10" : "bg-muted/50"
          )}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={stopTyping}
          disabled={isPending}
          emojiAutocomplete={false}
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

        {/* Reply status selector - hidden for internal notes */}
        {!isInternalNote && (
          <Select value={replyStatus} onValueChange={(v) => setReplyStatus(v as 'closed' | 'open' | 'pending')}>
            <SelectTrigger className="shrink-0 h-9 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="closed">Send & Close</SelectItem>
              <SelectItem value="open">Send & Keep Open</SelectItem>
              <SelectItem value="pending">Send & Pending</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Send button */}
        <Button 
          size="icon" 
          className={cn(
            "rounded-full shrink-0 h-10 w-10",
            isInternalNote && "bg-warning hover:bg-warning/90 text-warning-foreground"
          )}
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
            size="sm" 
            variant="outline"
            className="shrink-0 h-9 gap-1.5"
            onClick={() => setTransferDialogOpen(true)}
            disabled={isTransferring}
          >
            {isTransferring ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserRoundPlus className="h-4 w-4" />
            )}
            <span className="text-xs">Transfer</span>
          </Button>
        )}
        
        <Button 
          size="sm" 
          variant="outline"
          className="shrink-0 h-9 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleEndChat}
          disabled={endChatMutation.isPending}
        >
          {endChatMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageSquareX className="h-4 w-4" />
          )}
          <span className="text-xs">End Chat</span>
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
