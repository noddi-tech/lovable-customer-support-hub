import { useState } from 'react';
import { ChevronDown, ChevronUp, Lock, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmailRender } from '@/components/ui/email-render';
import { MentionRenderer } from '@/components/ui/mention-renderer';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { cn } from '@/lib/utils';
import { stripHtml } from '@/utils/stripHtml';
import type { NormalizedMessage } from '@/lib/normalizeMessage';
import type { EmailAttachment } from '@/utils/emailFormatting';

interface MobileEmailMessageCardProps {
  message: NormalizedMessage;
  conversation: any;
  isNewest?: boolean;
}

function display(addr?: { name?: string; email?: string }, preferEmail = false) {
  if (!addr) return '';
  if (preferEmail && addr.email) return addr.email;
  return addr.name?.trim() || addr.email || '';
}

export const MobileEmailMessageCard = ({ message, conversation, isNewest = false }: MobileEmailMessageCardProps) => {
  const [expanded, setExpanded] = useState(isNewest);
  const { relative: formatRelative } = useDateFormatting();
  
  const isAgent = message.authorType === 'agent';
  const isInternal = message.isInternalNote;
  const senderLabel = display(message.from) || message.authorLabel || 'Unknown';
  const recipientEmail = isAgent 
    ? (message.to?.[0]?.email || conversation?.customer?.email || '') 
    : '';
  
  // Preview text
  const previewText = stripHtml(message.visibleBody).slice(0, 120);
  
  // Attachments
  const attachments: EmailAttachment[] = (message.originalMessage?.attachments || []).map((a: any) => ({
    filename: a.name || a.filename || 'file',
    mimeType: a.type || a.mimeType || 'application/octet-stream',
    size: a.size || 0,
    contentId: a.contentId || a.content_id,
    isInline: a.isInline || false,
    storageKey: a.storageKey || a.storage_key,
  }));

  return (
    <div className={cn(
      "border-b border-border/50 last:border-b-0",
      isInternal && "bg-yellow-50/50 dark:bg-yellow-950/10"
    )}>
      {/* Compact header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
      >
        {/* Direction indicator */}
        <div className={cn(
          "w-1 h-8 rounded-full shrink-0",
          isInternal ? "bg-yellow-400" : isAgent ? "bg-primary" : "bg-muted-foreground/40"
        )} />
        
        <div className="flex-1 min-w-0">
          {/* Row 1: Sender + time */}
          <div className="flex items-center gap-1.5">
            {isInternal && <Lock className="h-3 w-3 text-yellow-600 shrink-0" />}
            <span className={cn(
              "text-xs font-medium truncate",
              isAgent ? "text-primary" : "text-foreground"
            )}>
              {isInternal ? 'Internal Note' : senderLabel}
            </span>
            {recipientEmail && !isInternal && (
              <span className="text-[10px] text-muted-foreground truncate">
                → {recipientEmail}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
              {formatRelative(new Date(message.createdAt))}
            </span>
          </div>
          
          {/* Row 2: Preview (collapsed only) */}
          {!expanded && (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {previewText || '(empty)'}
            </p>
          )}
        </div>
        
        <div className="shrink-0">
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>
      
      {/* Expanded body */}
      {expanded && (
        <div className="px-2 pb-2">
          <div className="mobile-email-body overflow-hidden">
            {isInternal ? (
              <MentionRenderer content={message.visibleBody} className="text-xs" />
            ) : (
              <EmailRender
                content={message.visibleBody}
                contentType={message.originalMessage?.content_type || 'text/plain'}
                attachments={attachments}
                messageId={message.id}
                className="mobile-email-render"
              />
            )}
          </div>
          
          {/* Email status indicators */}
          {isAgent && (message.emailStatus === 'failed' || message.emailStatus === 'retry') && (
            <div className="flex items-center gap-1.5 mt-2">
              <AlertCircle className="h-3 w-3 text-destructive" />
              <span className="text-[10px] text-destructive font-medium">Email not sent</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
