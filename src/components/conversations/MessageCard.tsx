import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmailRender } from "@/components/ui/email-render";
import { MentionRenderer } from "@/components/ui/mention-renderer";
import { 
  Lock,
  Edit3,
  Trash2,
  Paperclip,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  StickyNote,
  Pin,
  PinOff,
  Mail,
  AlertCircle,
  RefreshCw,
  Calendar,
  Bot,
  Send,
  Pencil,
  X
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { type EmailAttachment } from "@/utils/emailFormatting";
import { useDateFormatting } from "@/hooks/useDateFormatting";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { type NormalizedMessage } from "@/lib/normalizeMessage";
import { MessageDebugProbe } from "./MessageDebugProbe";
import { EmailDebugOverlay } from "./EmailDebugOverlay";
import { stripHtml } from "@/utils/stripHtml";
import { getSmartPreview } from "@/utils/messagePreview";
import { logger } from "@/utils/logger";
import { noteDebug } from "@/utils/noteInteractionDebug";
import { supabase } from "@/integrations/supabase/client";
import { InlineNoteEditor } from "./InlineNoteEditor";
import { useNoteMutations } from "@/hooks/useNoteMutations";

// --- Helpers ---
type Addr = { name?: string; email?: string };

function display(addr?: Addr, preferEmail = false) {
  if (!addr) return '';
  if (preferEmail && addr.email) return addr.email;
  return addr.name?.trim() || addr.email || '';
}

/** Strip quotes and "via Inbox" suffix from a name before computing initials */
function cleanNameForInitials(raw: string): string {
  return raw.replace(/^['"]+/, '').replace(/['"]+$/, '').split(/\s+via\s+/i)[0].trim();
}

/** Multi-char initials: first letter of each word part (e.g. "Hanne Blaasvær Stangnes" → "HBS") */
function multiInitials(name?: string, email?: string): string {
  const raw = name?.trim() || email?.split('@')[0] || '';
  if (!raw) return '•';
  const cleaned = cleanNameForInitials(raw);
  const parts = cleaned.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return '•';
  const inits = parts.map(p => p[0]).join('').toUpperCase();
  return inits.slice(0, 3); // max 3 chars
}

function initials(addr?: Addr) {
  return multiInitials(addr?.name, addr?.email);
}

/** Short name: first name + last initial(s), e.g. "Hanne B.S." or "Robert P." */
function shortName(fullName?: string): string {
  if (!fullName) return '';
  const cleaned = cleanNameForInitials(fullName);
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return cleaned;
  const first = parts[0];
  const rest = parts.slice(1).map(p => p[0]?.toUpperCase() + '.').join('');
  return `${first} ${rest}`;
}

function formatList(list: Addr[] = [], max = 3, preferEmail = false) {
  const shown = list.slice(0, max).map(a => ({ label: display(a, preferEmail), email: a.email })).filter(a => a.label);
  const extra = list.length - shown.length;
  return { shown, extra };
}

// Message styling based on author type - HelpScout inspired
function getMessageStyle(authorType: 'agent' | 'customer' | 'system' | 'ai_draft' = 'customer') {
  if (authorType === 'agent') {
    return {
      border: 'border-l-4 border-blue-500 dark:border-blue-600',
      bg: 'bg-blue-50/20 dark:bg-blue-950/20 hover:bg-blue-50/30',
      avatarRing: 'ring-2 ring-blue-200 dark:ring-blue-800',
      label: 'You',
      labelBadge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    };
  }
  if (authorType === 'ai_draft') {
    return {
      border: 'border-l-4 border-dashed border-emerald-400 dark:border-emerald-500',
      bg: 'bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50/40',
      avatarRing: 'ring-2 ring-emerald-300 dark:ring-emerald-700',
      label: 'AI Draft',
      labelBadge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    };
  }
  if (authorType === 'customer') {
    return {
      border: 'border-l-4 border-amber-400 dark:border-amber-600',
      bg: 'bg-amber-50/20 dark:bg-amber-950/20 hover:bg-amber-50/30',
      avatarRing: 'ring-2 ring-amber-200 dark:ring-amber-800',
      label: 'Customer',
      labelBadge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    };
  }
  return {
    border: 'border-l-4 border-gray-400',
    bg: 'bg-gray-50/20 hover:bg-gray-50/30',
    avatarRing: 'ring-2 ring-gray-200',
    label: 'System',
    labelBadge: 'bg-gray-100 text-gray-800',
  };
}

// Internal note styling - distinct from messages
function getNoteStyle() {
  return {
    border: 'border-l-4 border-yellow-500 dark:border-yellow-600',
    bg: 'bg-yellow-50 dark:bg-yellow-950/50',
    cardBorder: 'border-yellow-200 dark:border-yellow-800',
    avatarRing: 'ring-2 ring-yellow-300 dark:ring-yellow-700',
    avatarBg: 'bg-yellow-100 dark:bg-yellow-900',
    label: 'Note',
    labelBadge: 'bg-yellow-500 text-white',
  };
}

interface MessageCardProps {
  message: NormalizedMessage;
  conversation: {
    customer?: {
      full_name?: string;
      email?: string;
    } | null;
  };
  defaultCollapsed?: boolean;
  disableAnimation?: boolean;
  isFirstInThread?: boolean;
  isNewestMessage?: boolean;
  isPinned?: boolean;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  /** Request note deletion — parent owns the confirm dialog so it survives row unmount */
  onRequestDeleteNote?: (messageId: string) => void;
  onPin?: (messageId: string, pinned: boolean) => void;
  onSendDraft?: (messageId: string) => void;
  onEditDraft?: (messageId: string, content: string) => void;
  onDismissDraft?: (messageId: string) => void;
}

const MessageCardComponent = ({ 
  message, 
  conversation, 
  defaultCollapsed = true,
  disableAnimation = false,
  isFirstInThread = false,
  isNewestMessage = false,
  isPinned: propIsPinned,
  onEdit, 
  onDelete,
  onRequestDeleteNote,
  onPin,
  onSendDraft,
  onEditDraft,
  onDismissDraft
}: MessageCardProps) => {
  const { dateTime } = useDateFormatting();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [showAllRecipients, setShowAllRecipients] = useState(false);
  const [showQuoted, setShowQuoted] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [isPinned, setIsPinned] = useState(propIsPinned ?? message.originalMessage?.is_pinned ?? false);
  const [isEditingThisNote, setIsEditingThisNote] = useState(false);
  const { canEditNote } = useNoteMutations();
  
  // Track renders
  const renderCount = useRef(0);
  const prevPropsRef = useRef({ defaultCollapsed, disableAnimation });
  
  useEffect(() => {
    renderCount.current++;
    const propsChanged = 
      prevPropsRef.current.defaultCollapsed !== defaultCollapsed ||
      prevPropsRef.current.disableAnimation !== disableAnimation;
    
    logger.debug(`MessageCard render #${renderCount.current}`, {
      messageId: message.id.slice(-8),
      authorType: message.authorType,
      isCollapsed,
      defaultCollapsed,
      disableAnimation,
      propsChanged
    }, 'MessageCard');
    
    prevPropsRef.current = { defaultCollapsed, disableAnimation };
  });
  
  // Simple sync with prop - only when not in bulk operation
  useEffect(() => {
    if (!disableAnimation && isCollapsed !== defaultCollapsed) {
      setIsCollapsed(defaultCollapsed);
    }
  }, [defaultCollapsed, disableAnimation]);
  
  // Show quoted blocks if they exist and feature is enabled
  const hasQuotedContent = message.quotedBlocks && message.quotedBlocks.length > 0;
  
  const isFromCustomer = message.authorType === 'customer';
  
  // Get attachments from original message - memoize to prevent reference changes
  const attachments = useMemo(() => {
    const atts = message.originalMessage?.attachments ? 
      (typeof message.originalMessage.attachments === 'string' ? 
        JSON.parse(message.originalMessage.attachments) : 
        message.originalMessage.attachments) as EmailAttachment[] : [];
    
    logger.debug('Attachments processed', {
      messageId: message.id.slice(-8),
      count: atts.length,
      reference: atts.length > 0 ? 'new array created' : 'empty array'
    }, 'MessageCard');
    
    return atts;
  }, [message.originalMessage?.attachments, message.id]);

  // Generate smart preview text
  const previewText = getSmartPreview(message.visibleBody, 300);

  // Use the real author label from normalization
  const display = message.authorLabel;
  
  // Avatar initials from sender - multi-char
  const initial = multiInitials(message.from.name, message.from.email);

  function formatRecipients(list: {name?: string; email?: string}[] = [], max = 3) {
    if (!list.length) return '';
    const names = list.slice(0, max).map(r => r.name || r.email || '—');
    const rest = list.length > max ? ` +${list.length - max}` : '';
    return `${names.join(', ')}${rest}`;
  }

  const isAgentMessage = message.authorType === 'agent';
  const { shown: toShown, extra: toExtra } = formatList(message.to, 3, isAgentMessage);
  const { shown: ccShown, extra: ccExtra } = formatList(message.cc ?? [], 2, isAgentMessage);

  // Detect internal note and AI draft
  const isAiDraft = message.authorType === 'ai_draft';
  const isInternalNote = !isAiDraft && (message.isInternalNote || message.originalMessage?.is_internal === true);
  const noteStyle = isInternalNote ? getNoteStyle() : null;
  
  // Get message styling based on author type (only used if not a note)
  // AI drafts use getMessageStyle('ai_draft') — NOT noteStyle
  const messageStyle = noteStyle ? null : getMessageStyle(message.authorType);
  const isAgent = message.authorType === 'agent' || isAiDraft;

  const handleEdit = () => {
    if (onEdit) {
      onEdit(message.id, message.originalMessage?.content || message.visibleBody);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(message.id);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.visibleBody);
      setCopiedToClipboard(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (error) {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const handleTogglePin = async () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_pinned: newPinned })
        .eq('id', message.id);
      
      if (error) throw error;
      
      toast({ title: newPinned ? "Note pinned" : "Note unpinned" });
      onPin?.(message.id, newPinned);
    } catch (error) {
      setIsPinned(!newPinned); // Revert on error
      toast({ title: "Failed to update pin", variant: "destructive" });
    }
  };

  const handleResendEmail = async () => {
    try {
      const { error } = await supabase.functions.invoke('send-reply-email', {
        body: { messageId: message.id }
      });
      if (error) throw error;
      toast({ title: "Email sent successfully" });
    } catch (error) {
      toast({ title: "Failed to send email", variant: "destructive" });
    }
  };

  // Use defaultCollapsed during bulk operations to prevent double-render
  // AI drafts are always expanded
  const effectiveCollapsed = isAiDraft ? false : (disableAnimation ? defaultCollapsed : isCollapsed);
  
  const handleToggle = () => {
    if (!disableAnimation) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <div 
      data-message-id={message.id}
      data-author-type={message.authorType || 'unknown'}
      data-is-note={isInternalNote ? 'true' : 'false'}
      className={cn(
        "group relative rounded-lg border",
        // Apply note or message styling
        isInternalNote ? noteStyle?.bg : messageStyle?.bg,
        isInternalNote ? noteStyle?.border : messageStyle?.border,
        isInternalNote 
          ? noteStyle?.cardBorder 
          : "border-y border-r border-gray-200 dark:border-gray-800",
        !isInternalNote && "hover:border-gray-300 dark:hover:border-gray-700",
        disableAnimation && "disable-animation",
        effectiveCollapsed ? "py-1 min-h-[108px] grid place-content-center" : "py-2",
        isNewestMessage && "ring-2 ring-primary/30 ring-offset-1",
        isPinned && isInternalNote && "ring-2 ring-yellow-400/50 ring-offset-1"
      )}
      aria-label={isInternalNote ? `Internal note from ${display}` : `${isAgent ? 'Agent' : 'Customer'} message from ${display}`}
    >
        {/* Card Header - improved spacing */}
        <div className={cn(
          "px-2 md:px-4",
          effectiveCollapsed ? "py-0" : "py-4"
        )}>
          <div className={cn(
            "flex",
            effectiveCollapsed ? "items-center gap-3" : "items-start gap-5",
            !isInternalNote && isAgent && "md:flex-row-reverse"
          )}>
            {/* Avatar */}
            <Avatar className={cn(
              "shrink-0",
              effectiveCollapsed ? "h-5 w-5" : "h-10 w-10",
              isInternalNote ? noteStyle?.avatarRing : messageStyle?.avatarRing
            )}>
              <AvatarFallback className={cn(
                "font-medium",
                effectiveCollapsed ? "text-xs" : "text-sm",
                isInternalNote && noteStyle?.avatarBg
              )}>
                {initial}
              </AvatarFallback>
            </Avatar>

            {/* Content area - metadata only */}
            <div className="min-w-0 flex-1">
              <div className={cn(
                "flex items-center",
                effectiveCollapsed ? "flex-nowrap gap-2.5" : "flex-wrap gap-3",
                effectiveCollapsed ? "mb-0" : "mb-1.5",
                !isInternalNote && isAgent && "md:justify-end"
              )}>
                {/* Note icon and badge FIRST for internal notes */}
                {isInternalNote && (
                  <Badge className={cn("text-xs shrink-0 gap-1", noteStyle?.labelBadge)}>
                    {isPinned && <Pin className="w-3 h-3" />}
                    <StickyNote className="w-3 h-3" />
                    {noteStyle?.label}
                  </Badge>
                )}
                
                {/* Timestamp */}
                <span className={cn(
                  "text-muted-foreground shrink-0 flex items-center gap-1",
                  effectiveCollapsed ? "text-xs leading-none" : "text-sm"
                )}>
                  <Calendar className="w-3 h-3" />
                  <span className="font-semibold">
                    {dateTime(typeof message.createdAt === 'string' ? message.createdAt : new Date(message.createdAt).toISOString())}
                  </span>
                </span>
                
                {/* Author type badge with name inside - replaces separate name span */}
                {!isInternalNote && messageStyle && (
                  <Badge className={cn("text-xs shrink-0 gap-1", messageStyle.labelBadge)}>
                    {isAiDraft && <Bot className="w-3 h-3" />}
                    {isAiDraft 
                      ? 'AI Draft'
                      : message.authorType === 'customer' 
                        ? shortName(message.from.name) || message.from.email?.split('@')[0] || 'Customer'
                        : shortName(message.from.name) || message.from.email?.split('@')[0] || 'Agent'}
                  </Badge>
                )}

                {/* Inline "To:" recipient - shown for non-notes when expanded */}
                {!isInternalNote && !effectiveCollapsed && (() => {
                  const recipientEmail = toShown.length > 0 
                    ? (toShown[0].email || toShown[0].label)
                    : (conversation?.customer?.email || '—');
                  return (
                    <span className="text-xs text-muted-foreground shrink-0 truncate max-w-[220px]" title={recipientEmail}>
                      → {recipientEmail}
                    </span>
                  );
                })()}
                
                {/* Note author name next to note badge */}
                {isInternalNote && (
                  <span className={cn(
                    "text-xs text-muted-foreground shrink-0",
                    effectiveCollapsed ? "leading-none" : ""
                  )}>
                    {shortName(message.from.name) || message.from.email?.split('@')[0] || 'Agent'}
                  </span>
                )}
                
                {/* New badge for newest message */}
                {isNewestMessage && (
                  <Badge 
                    variant="outline" 
                    className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/30 shrink-0"
                  >
                    New
                  </Badge>
                )}
                
                 {attachments.length > 0 && (
                   <Badge variant="outline" className="text-xs shrink-0">
                     <Paperclip className="w-3 h-3 mr-1" />
                     {attachments.length}
                   </Badge>
                 )}
              </div>

              {/* Preview text below header when collapsed */}
              {effectiveCollapsed && previewText && (
                <div className="pl-[26px] pt-1.5 pb-1 pr-4">
                  <span className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {previewText}
                  </span>
                </div>
              )}

              {/* Recipients chips removed - now inline in header */}

              {/* Full recipients list when expanded */}
              {showAllRecipients && (
                <div className={cn(
                  "mt-1 space-x-1 text-xs text-muted-foreground",
                  isAgent && "md:text-right"
                )}>
                  <span className="font-medium">{t('mail.to') || 'to'}:</span>{' '}
                  {(message.to ?? []).map(a => a.name || a.email || '').filter(Boolean).join(', ')}
                  {message.cc?.length ? (
                    <>
                      {' · '}
                      <span className="font-medium">{t('mail.cc') || 'cc'}:</span>{' '}
                      {message.cc.map(a => a.name || a.email || '').filter(Boolean).join(', ')}
                    </>
                  ) : null}
                </div>
              )}
            </div>
            
            {/* Actions - always on far right */}
            <div className="flex items-center space-x-1 shrink-0">
              {/* Copy Button - visible on hover */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleCopy}
                title="Copy message content"
              >
                {copiedToClipboard ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>

              {/* Expand/Collapse trigger - simple button */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={handleToggle}
                aria-label={effectiveCollapsed ? "Expand message" : "Collapse message"}
              >
                {effectiveCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
              
              {/* Message Actions - hidden for AI drafts */}
              {!isAiDraft && <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleCopy}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </DropdownMenuItem>
                    {/* Edit + Delete for internal notes (author or admin) */}
                    {isInternalNote && canEditNote({
                      is_internal: true,
                      sender_id: message.originalMessage?.sender_id,
                    }) && (
                      <>
                        <DropdownMenuItem
                          onSelect={() => {
                            noteDebug('note_editor_open_requested', {
                              source: 'MessageCard',
                              messageId: message.id,
                              triggeredFrom: 'onSelect',
                            }, 'MessageCard');
                            // Let the dropdown close naturally; setTimeout defers
                            // the state update until after Radix's close animation
                            // starts unwinding, avoiding overlay stacking.
                            setTimeout(() => setIsEditingThisNote(true), 0);
                          }}
                        >
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edit note
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            noteDebug('delete_dialog_open_requested', {
                              source: 'MessageCard',
                              messageId: message.id,
                            }, 'MessageCard');
                            // Hand off to parent — its hoisted dialog survives this row unmounting
                            setTimeout(() => onRequestDeleteNote?.(message.id), 0);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete note
                        </DropdownMenuItem>
                      </>
                    )}
                    {/* Pin option - only for internal notes */}
                    {isInternalNote && (
                      <DropdownMenuItem onClick={handleTogglePin}>
                        {isPinned ? (
                          <>
                            <PinOff className="w-4 h-4 mr-2" />
                            Unpin note
                          </>
                        ) : (
                          <>
                            <Pin className="w-4 h-4 mr-2" />
                            Pin note
                          </>
                        )}
                      </DropdownMenuItem>
                    )}
                    {/* Resend Email - only for agent messages that are not internal notes */}
                    {isAgent && !isInternalNote && (
                      <DropdownMenuItem onClick={handleResendEmail}>
                        <Mail className="w-4 h-4 mr-2" />
                        Resend Email
                      </DropdownMenuItem>
                    )}
                    {/* Delete - only for unsent agent messages */}
                    {isAgent && !isInternalNote && (message.emailStatus === 'failed' || message.emailStatus === 'pending' || message.emailStatus === 'retry') && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={handleDelete}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {t('conversation.deleteMessage')}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>}

            </div>
          </div>
        </div>
        
      {/* Collapsed preview is now inline in metadata - removed separate section */}

        {/* Full content - simple CSS collapse */}
        <div className={cn(
          "message-content",
          effectiveCollapsed ? "is-collapsed" : "pl-2 pr-2 pb-3 md:pl-16 md:pr-4 md:pb-4"
        )}>
          <div className="space-y-4 overflow-hidden">
            {/* Email content or mention-aware note (with inline editor) */}
            {isInternalNote ? (
              isEditingThisNote ? (
                <InlineNoteEditor
                  messageId={message.id}
                  initialContent={message.originalMessage?.content || message.visibleBody || ''}
                  conversationId={message.originalMessage?.conversation_id}
                  context={{
                    type: 'internal_note',
                    conversation_id: message.originalMessage?.conversation_id,
                    message_id: message.id,
                  }}
                  onCancel={() => setIsEditingThisNote(false)}
                />
              ) : (
                <div>
                  <MentionRenderer content={message.visibleBody || ''} className="text-sm" />
                  {message.originalMessage?.updated_at &&
                    message.originalMessage?.created_at &&
                    new Date(message.originalMessage.updated_at).getTime() -
                      new Date(message.originalMessage.created_at).getTime() >
                      2000 && (
                      <span className="ml-2 text-[10px] text-muted-foreground italic">(edited)</span>
                    )}
                </div>
              )
            ) : (
              <EmailRender 
                content={message.visibleBody || ''} 
                contentType={message.originalMessage?.content_type || 'text/plain'}
                attachments={attachments}
                messageId={message.id}
              />
            )}

            {/* Toggle quoted content */}
            {hasQuotedContent && (
              <div className="mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQuoted(!showQuoted)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {showQuoted ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Hide quoted text
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Show quoted text
                    </>
                  )}
                </Button>

                {showQuoted && message.quotedBlocks && message.quotedBlocks.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {message.quotedBlocks.map((block, index) => (
                      <div 
                        key={index} 
                        className="pl-4 border-l-2 border-muted-foreground/30 text-sm text-muted-foreground"
                      >
                        <pre className="whitespace-pre-wrap">{block.raw}</pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Email delivery warning for failed/pending */}
            {isAgent && !isInternalNote && (message.emailStatus === 'failed' || message.emailStatus === 'pending' || message.emailStatus === 'retry') && (
              <div className="flex items-center gap-2 mt-3 p-2 rounded-md bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                <span className="text-sm text-destructive font-medium">Email not delivered</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-6 text-xs px-2 gap-1 ml-auto text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={handleResendEmail}
                >
                  <RefreshCw className="h-3 w-3" />
                  Resend Email
                </Button>
              </div>
            )}

            {/* AI Draft action buttons */}
            {isAiDraft && (
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-emerald-200 dark:border-emerald-800">
                <Button 
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  onClick={() => onSendDraft?.(message.id)}
                >
                  <Send className="h-3.5 w-3.5" />
                  Send
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="gap-1.5"
                  onClick={() => onEditDraft?.(message.id, message.originalMessage?.content || message.visibleBody)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
                  onClick={() => onDismissDraft?.(message.id)}
                >
                  <X className="h-3.5 w-3.5" />
                  Dismiss
                </Button>
              </div>
            )}

            {/* Debug probe */}
            {import.meta.env.VITE_UI_PROBE === '1' && <MessageDebugProbe message={message} />}
          </div>
        </div>

      {/* Delete confirmation dialog is hoisted to the parent list to survive row unmount */}
    </div>
  );
};

// Memoized wrapper with custom comparison
export const MessageCard = memo(MessageCardComponent, (prevProps, nextProps) => {
  const messageMatch = prevProps.message.id === nextProps.message.id;
  const collapsedMatch = prevProps.defaultCollapsed === nextProps.defaultCollapsed;
  const animationMatch = prevProps.disableAnimation === nextProps.disableAnimation;
  const isFirstMatch = prevProps.isFirstInThread === nextProps.isFirstInThread;

  const shouldUpdate = !(
    messageMatch && 
    collapsedMatch && 
    animationMatch &&
    isFirstMatch
  );

  if (shouldUpdate) {
    logger.trackMemoBreak(
      'MessageCard', 
      `msg:${!messageMatch} collapsed:${!collapsedMatch} anim:${!animationMatch} first:${!isFirstMatch}`
    );
  }

  return !shouldUpdate;
});