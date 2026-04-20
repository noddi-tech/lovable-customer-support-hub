import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { CheckCheck, AlertCircle, RefreshCw, Loader2, Lock, MoreHorizontal, Edit3, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MentionRenderer } from '@/components/ui/mention-renderer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InlineNoteEditor } from '@/components/conversations/InlineNoteEditor';
import { useNoteMutations } from '@/hooks/useNoteMutations';
import { noteDebug } from '@/utils/noteInteractionDebug';
import type { NormalizedMessage } from '@/lib/normalizeMessage';

interface MobileChatBubbleProps {
  message: NormalizedMessage;
  customerName?: string;
  /** Request note deletion — parent owns the confirm dialog so it survives this bubble unmounting */
  onRequestDeleteNote?: (messageId: string) => void;
}

/** Resolve visible content with fallback for widget/chat messages */
function resolveContent(message: NormalizedMessage): string {
  // Prefer visibleBody if it has actual content
  if (message.visibleBody && message.visibleBody.trim().length > 0) {
    // Strip HTML and check if there's real text
    const temp = document.createElement('div');
    temp.innerHTML = message.visibleBody;
    const text = (temp.textContent || temp.innerText || '').trim();
    if (text.length > 0) return message.visibleBody;
  }
  
  // Fallback to original message content
  const raw = message.originalMessage;
  if (raw?.content) {
    const temp = document.createElement('div');
    temp.innerHTML = raw.content;
    const text = (temp.textContent || temp.innerText || '').trim();
    if (text.length > 0) return raw.content;
  }
  
  return message.visibleBody || '';
}

export const MobileChatBubble = ({ message, customerName, onRequestDeleteNote }: MobileChatBubbleProps) => {
  const { relative: formatRelative } = useDateFormatting();
  const [isEditing, setIsEditing] = useState(false);
  const { canEditNote } = useNoteMutations();
  const isAgent = message.authorType === 'agent';
  const isSystem = message.authorType === 'system';
  const isInternal = message.isInternalNote;
  const senderName = message.from?.name || message.from?.email;
  const conversationId = message.originalMessage?.conversation_id;
  const canEditThisNote = isInternal && canEditNote({
    is_internal: true,
    sender_id: message.originalMessage?.sender_id,
  });

  if (isSystem) {
    return (
      <div className="flex justify-center py-1">
        <div className="bg-muted/50 text-muted-foreground text-[10px] px-3 py-1 rounded-full">
          {message.visibleBody}
        </div>
      </div>
    );
  }

  const content = resolveContent(message);
  const isPlainText = !/<[a-z][\s\S]*>/i.test(content);

  const handleResendEmail = async () => {
    try {
      const { error } = await supabase.functions.invoke('send-reply-email', {
        body: { messageId: message.id }
      });
      if (error) throw error;
      toast.success('Email sent successfully');
    } catch {
      toast.error('Failed to send email');
    }
  };

  return (
    <div className={cn(
      "flex flex-col max-w-[82%]",
      isAgent ? "self-end items-end" : "self-start items-start"
    )}>
      {/* Sender label */}
      {isInternal ? (
        <span className="text-[10px] text-yellow-700 mb-0.5 px-1 flex items-center gap-0.5">
          <Lock className="h-2.5 w-2.5" />
          Internal note
        </span>
      ) : (
        <span className="text-[10px] text-muted-foreground mb-0.5 px-1 truncate max-w-full">
          {isAgent ? senderName || 'Agent' : customerName || 'Customer'}
        </span>
      )}

      {/* Bubble */}
      <div className={cn(
        "px-3 py-2 rounded-2xl text-[13px] leading-snug break-words max-w-full relative group",
        isInternal
          ? "bg-yellow-50 text-foreground border border-yellow-200 rounded-br-md"
          : isAgent
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
      )}>
        {isInternal && canEditThisNote && !isEditing && (
          <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 active:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full bg-background border shadow-sm"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    navigator.clipboard.writeText(content);
                    toast.success('Copied');
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    noteDebug('note_editor_open_requested', {
                      source: 'MobileChatBubble',
                      messageId: message.id,
                    }, 'MobileChatBubble');
                    // Let the dropdown close naturally; setTimeout defers
                    // the state update until after Radix's close animation
                    // starts unwinding, avoiding overlay stacking.
                    setTimeout(() => setIsEditing(true), 0);
                  }}
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit note
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    noteDebug('delete_dialog_open_requested', {
                      source: 'MobileChatBubble',
                      messageId: message.id,
                    }, 'MobileChatBubble');
                    // Hand off to parent — its hoisted dialog survives this bubble unmounting
                    setTimeout(() => onRequestDeleteNote?.(message.id), 0);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete note
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        {isInternal && isEditing ? (
          <InlineNoteEditor
            messageId={message.id}
            initialContent={message.originalMessage?.content || content}
            conversationId={conversationId}
            context={{
              type: 'internal_note',
              conversation_id: conversationId,
              message_id: message.id,
            }}
            onCancel={() => setIsEditing(false)}
            compact
          />
        ) : isInternal ? (
          <>
            <MentionRenderer content={content} className="text-[13px]" />
            {message.originalMessage?.updated_at &&
              message.originalMessage?.created_at &&
              new Date(message.originalMessage.updated_at).getTime() -
                new Date(message.originalMessage.created_at).getTime() >
                2000 && (
                <span className="ml-1 text-[9px] text-muted-foreground italic">(edited)</span>
              )}
          </>
        ) : isPlainText ? (
          <p className="whitespace-pre-wrap m-0">{(() => {
            const temp = document.createElement('div');
            temp.innerHTML = content;
            return (temp.textContent || temp.innerText || '').trim();
          })()}</p>
        ) : (
          <div
            className="[&_*]:!text-inherit [&_img]:max-w-full [&_img]:h-auto"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
      </div>

      {/* Timestamp + status */}
      <div className="flex items-center gap-1 mt-0.5 px-1">
        <span className="text-[10px] text-muted-foreground">
          {formatRelative(new Date(message.createdAt))}
        </span>
        {isAgent && !isInternal && (!message.emailStatus || message.emailStatus === 'sent') && (
          <CheckCheck className="h-2.5 w-2.5 text-primary" />
        )}
      </div>

      {isAgent && message.emailStatus === 'sending' && (
        <div className="flex items-center gap-1 mt-0.5 px-1">
          <Loader2 className="h-2.5 w-2.5 text-muted-foreground animate-spin" />
          <span className="text-[10px] text-muted-foreground">Sending...</span>
        </div>
      )}

      {isAgent && (message.emailStatus === 'failed' || message.emailStatus === 'retry') && (
        <div className="flex items-center gap-1 mt-0.5 px-1">
          <AlertCircle className="h-2.5 w-2.5 text-destructive" />
          <span className="text-[10px] text-destructive">Failed</span>
          <Button
            variant="outline"
            size="sm"
            className="h-4 text-[9px] px-1.5 py-0 gap-0.5 text-destructive border-destructive/30"
            onClick={handleResendEmail}
          >
            <RefreshCw className="h-2 w-2" />
            Retry
          </Button>
        </div>
      )}

      {/* Delete confirmation dialog is hoisted to the parent list to survive bubble unmount */}
    </div>
  );
};
