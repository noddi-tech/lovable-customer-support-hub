import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmailRender } from "@/components/ui/email-render";
import { 
  Lock,
  Edit3,
  Trash2,
  Paperclip,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

// --- Helpers ---
type Addr = { name?: string; email?: string };

function display(addr?: Addr) {
  if (!addr) return '';
  return addr.name?.trim() || addr.email || '';
}

function initials(addr?: Addr) {
  const s = display(addr);
  const parts = s.split('@')[0].split(/[.\s_-]+/).filter(Boolean);
  const two = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
  return (two || s[0] || '•').toUpperCase();
}

function formatList(list: Addr[] = [], max = 3) {
  const shown = list.slice(0, max).map(display).filter(Boolean);
  const extra = list.length - shown.length;
  return { shown, extra };
}

// Message styling based on author type - HelpScout inspired
function getMessageStyle(authorType: 'agent' | 'customer' | 'system' = 'customer') {
  if (authorType === 'agent') {
    return {
      border: 'border-l-4 border-blue-500 dark:border-blue-600',
      bg: 'bg-blue-50/20 dark:bg-blue-950/20 hover:bg-blue-50/30',
      avatarRing: 'ring-2 ring-blue-200 dark:ring-blue-800',
      label: 'You',
      labelBadge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
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
  isFirstInThread?: boolean;  // NEW: Indicates if this is the first message in the thread
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
}

const MessageCardComponent = ({ 
  message, 
  conversation, 
  defaultCollapsed = true,
  disableAnimation = false,
  isFirstInThread = false,
  onEdit, 
  onDelete 
}: MessageCardProps) => {
  const { dateTime } = useDateFormatting();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [showAllRecipients, setShowAllRecipients] = useState(false);
  const [showQuoted, setShowQuoted] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  
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
  const previewText = getSmartPreview(message.visibleBody, 100);

  // Use the real author label from normalization
  const display = message.authorLabel;
  
  // Avatar initial from sender (name -> initials; else first letter of email)
  const initial = (message.from.name?.[0] ?? message.from.email?.[0] ?? '•').toUpperCase();

  function formatRecipients(list: {name?: string; email?: string}[] = [], max = 3) {
    if (!list.length) return '';
    const names = list.slice(0, max).map(r => r.name || r.email || '—');
    const rest = list.length > max ? ` +${list.length - max}` : '';
    return `${names.join(', ')}${rest}`;
  }

  // Recipients formatting
  const { shown: toShown, extra: toExtra } = formatList(message.to, 3);
  const { shown: ccShown, extra: ccExtra } = formatList(message.cc ?? [], 2);

  // Get message styling based on author type
  const messageStyle = getMessageStyle(message.authorType);
  const isAgent = message.authorType === 'agent';

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

  // Use defaultCollapsed during bulk operations to prevent double-render
  const effectiveCollapsed = disableAnimation ? defaultCollapsed : isCollapsed;
  
  const handleToggle = () => {
    if (!disableAnimation) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <div 
      data-message-id={message.id}
      data-author-type={message.authorType || 'unknown'}
      className={cn(
        "group relative rounded-lg border",
        messageStyle.bg,
        messageStyle.border,
        "border-y border-r border-gray-200 dark:border-gray-800",
        "hover:border-gray-300 dark:hover:border-gray-700",
        disableAnimation && "disable-animation",
        effectiveCollapsed ? "py-1 min-h-[40px]" : "py-2"
      )}
      aria-label={`${isAgent ? 'Agent' : 'Customer'} message from ${display}`}
    >
        {/* Card Header - improved spacing */}
        <div className={cn(
          "px-8",
          effectiveCollapsed ? "py-0" : "py-5"
        )}>
          <div className={cn(
            "flex",
            effectiveCollapsed ? "items-center gap-1.5" : "items-start gap-5",
            isAgent && "md:flex-row-reverse"
          )}>
            {/* Avatar */}
            <Avatar className={cn(
              "shrink-0",
              effectiveCollapsed ? "h-5 w-5" : "h-10 w-10",
              messageStyle.avatarRing
            )}>
              <AvatarFallback className={cn(
                "font-medium",
                effectiveCollapsed ? "text-xs" : "text-sm"
              )}>
                {initial}
              </AvatarFallback>
            </Avatar>

            {/* Content area - metadata only */}
            <div className="min-w-0 flex-1">
              <div className={cn(
                "flex items-center",
                effectiveCollapsed ? "flex-nowrap gap-1.5" : "flex-wrap gap-3",
                effectiveCollapsed ? "mb-0" : "mb-1.5",
                isAgent && "md:justify-end"
              )}>
                {/* Timestamp FIRST when collapsed */}
                <span className={cn(
                  "text-muted-foreground shrink-0",
                  effectiveCollapsed ? "text-xs leading-none" : "text-sm"
                )}>
                  {dateTime(typeof message.createdAt === 'string' ? message.createdAt : new Date(message.createdAt).toISOString())}
                </span>
                
                {/* Name */}
                <span className={cn(
                  "font-semibold shrink-0",
                  effectiveCollapsed ? "text-xs leading-none" : "text-base leading-tight"
                )}>
                  {display}
                </span>
                
                {/* Author type badge */}
                <Badge className={cn("text-xs shrink-0", messageStyle.labelBadge)}>
                  {messageStyle.label}
                </Badge>
                
                {/* Preview text inline when collapsed */}
                {effectiveCollapsed && (
                  <span className="text-xs text-muted-foreground truncate min-w-0 leading-none">
                    {previewText}
                  </span>
                )}
                
                {message.originalMessage?.is_internal && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    <Lock className="w-3 h-3 mr-1" />
                    Internal
                  </Badge>
                )}
                
                 {attachments.length > 0 && (
                   <Badge variant="outline" className="text-xs shrink-0">
                     <Paperclip className="w-3 h-3 mr-1" />
                     {attachments.length}
                   </Badge>
                 )}
              </div>

              {/* Recipients chips - only show when expanded */}
              {!effectiveCollapsed && (
                <div className={cn(
                  "mt-3 flex flex-wrap items-center gap-2 text-xs",
                  isAgent && "md:justify-end"
                )}>
                  <span className="text-muted-foreground font-medium">{t('mail.to') || 'To:'}</span>
                    {toShown.length > 0 && toShown.map((name) => (
                      <Badge
                        key={`to-${name}`}
                        variant="secondary"
                        className="px-2 py-0.5"
                      >
                        {name}
                      </Badge>
                    ))}
                    {toExtra > 0 && !showAllRecipients && (
                      <button
                        type="button"
                        onClick={() => setShowAllRecipients(true)}
                        className="px-2 py-0.5 rounded-full ring-1 bg-muted text-foreground/80 hover:bg-muted/80 transition-colors"
                      >
                        +{toExtra} {t('mail.more') || 'more'}
                      </button>
                    )}
                    {ccShown.length > 0 && (
                      <>
                        <span className="ml-2 text-muted-foreground">{t('mail.cc') || 'cc'}</span>
                        {ccShown.map((name) => (
                          <Badge
                            key={`cc-${name}`}
                            variant="secondary"
                            className="px-2 py-0.5"
                          >
                            {name}
                          </Badge>
                        ))}
                        {ccExtra > 0 && !showAllRecipients && (
                          <button
                            type="button"
                            onClick={() => setShowAllRecipients(true)}
                            className="px-2 py-0.5 rounded-full ring-1 bg-muted text-foreground/80 hover:bg-muted/80 transition-colors"
                          >
                            +{ccExtra} {t('mail.more') || 'more'}
                          </button>
                        )}
                      </>
                    )}
                </div>
              )}

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
              
              {/* Message Actions */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleEdit}>
                      <Edit3 className="w-4 h-4 mr-2" />
                      {t('conversation.editMessage')}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={handleDelete}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('conversation.deleteMessage')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
        
      {/* Collapsed preview is now inline in metadata - removed separate section */}

        {/* Full content - simple CSS collapse */}
        <div className={cn(
          "message-content pl-[92px] pr-8 pb-8",
          effectiveCollapsed && "is-collapsed"
        )}>
          <div className="space-y-4">
            {/* Email content */}
            <EmailRender 
              content={message.visibleBody || ''} 
              contentType={message.originalMessage?.content_type || 'text/plain'}
              attachments={attachments}
            />

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

            {/* Debug probe */}
            {import.meta.env.VITE_UI_PROBE === '1' && <MessageDebugProbe message={message} />}
          </div>
        </div>
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