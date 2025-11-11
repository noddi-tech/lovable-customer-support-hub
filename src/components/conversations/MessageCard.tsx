import { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

export const MessageCard = ({ 
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
  const [showQuotedContent, setShowQuotedContent] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  
  // Sync with prop changes for expand/collapse all functionality
  useEffect(() => {
    setIsCollapsed(defaultCollapsed);
  }, [defaultCollapsed]);
  
  // Show quoted blocks if they exist and feature is enabled
  const hasQuotedContent = message.quotedBlocks && message.quotedBlocks.length > 0;
  
  const isFromCustomer = message.authorType === 'customer';
  
  // Get attachments from original message
  const attachments = message.originalMessage?.attachments ? 
    (typeof message.originalMessage.attachments === 'string' ? 
      JSON.parse(message.originalMessage.attachments) : 
      message.originalMessage.attachments) as EmailAttachment[] : [];

  // Generate smart preview text
  const previewText = getSmartPreview(message.visibleBody, 160);

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

  // Helper to detect if message is from customer
  const isCustomer = () => {
    const from = (message.from?.email || '').toLowerCase();
    return !from.endsWith('@noddi.no') && !from.includes('@noddi.tech');
  };

  return (
    <div 
      data-message-id={message.id}
      data-author-type={message.authorType || 'unknown'}
      className={cn(
        "group relative rounded-lg border transition-all duration-200",
        messageStyle.bg,
        messageStyle.border,
        "border-y border-r border-gray-200 dark:border-gray-800",
        "hover:border-gray-300 dark:hover:border-gray-700"
      )}
      aria-label={`${isAgent ? 'Agent' : 'Customer'} message from ${display}`}
    >
      
        <Collapsible 
          open={!isCollapsed} 
          onOpenChange={(open) => setIsCollapsed(!open)}
          className={disableAnimation ? "disable-animation" : ""}
        >
        {/* Card Header - improved spacing */}
        <div className="px-8 py-5">
          <div className={cn(
            "flex items-start gap-5",
            isAgent && "md:flex-row-reverse"
          )}>
            {/* Avatar */}
            <Avatar className={cn("h-10 w-10 shrink-0", messageStyle.avatarRing)}>
              <AvatarFallback className="text-sm font-medium">
                {initial}
              </AvatarFallback>
            </Avatar>
            
            {/* Content area - metadata only */}
            <div className="min-w-0 flex-1">
              <div className={cn(
                "flex flex-wrap items-center gap-3 mb-1.5",
                isAgent && "md:justify-end"
              )}>
                <span className="font-semibold text-base leading-tight">
                  {display}
                </span>
                
                {/* Author type badge */}
                <Badge className={cn("text-xs", messageStyle.labelBadge)}>
                  {messageStyle.label}
                </Badge>
                
                <span className="text-sm text-muted-foreground">
                  {dateTime(typeof message.createdAt === 'string' ? message.createdAt : new Date(message.createdAt).toISOString())}
                </span>
                
                {message.originalMessage?.is_internal && (
                  <Badge variant="outline" className="text-xs">
                    <Lock className="w-3 h-3 mr-1" />
                    Internal
                  </Badge>
                )}
                
                 {attachments.length > 0 && (
                   <Badge variant="outline" className="text-xs">
                     <Paperclip className="w-3 h-3 mr-1" />
                     {attachments.length}
                   </Badge>
                 )}
              </div>

              {/* Recipients chips - better spacing */}
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

              {/* Expand/Collapse trigger - clearer indicator */}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {isCollapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              
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
        
        {/* Collapsed preview - separate container with consistent padding */}
        <div 
          className={cn(
            "pl-[92px] pr-8",
            disableAnimation ? "" : "transition-all duration-200",
            isCollapsed ? "pb-5 opacity-100" : "pb-0 opacity-0 overflow-hidden"
          )}
        >
          <div className="space-y-1.5">
            {message.subject && (
              <p className="text-sm font-semibold text-foreground leading-tight">
                {message.subject}
              </p>
            )}
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {previewText}
            </p>
            {hasQuotedContent && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>• Thread</span>
              </div>
            )}
          </div>
        </div>
        
        <CollapsibleContent>
          <div className="py-4 pr-8 pl-[92px] min-w-0 overflow-hidden">
            {/* Main message content */}
            <div className="mt-0">
              <EmailRender
                content={message.visibleBody}
                contentType={message.originalMessage?.content_type || 'text/plain'}
                attachments={[]}
                messageId={message.id}
              />
              
              {/* Debug overlay - only shows when VITE_UI_PROBE=1 */}
              <EmailDebugOverlay messageId={message.id} />
            </div>
            
            {/* Attachment Rail - Below message content */}
            {!isCollapsed && attachments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Paperclip className="h-3 w-3" />
                  {attachments.length} {attachments.length === 1 ? 'Attachment' : 'Attachments'}
                </div>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((att, index) => (
                    <button
                      key={index}
                      className="flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted rounded-lg border border-border transition-colors text-sm group"
                      onClick={() => {
                        // Download functionality
                        const downloadUrl = `/supabase/functions/v1/get-attachment/${att.attachmentId}?messageId=${message.id}&download=true`;
                        const link = document.createElement('a');
                        link.href = downloadUrl;
                        link.download = att.filename;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                    >
                      <Paperclip className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      <span className="font-medium">{att.filename}</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({(att.size / 1024).toFixed(1)} KB)
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Quoted content toggle - Enhanced styling */}
            {hasQuotedContent && (
              <div className="mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowQuotedContent(!showQuotedContent)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                >
                  {showQuotedContent ? (
                    <ChevronUp className="w-4 h-4 group-hover:translate-y-[-2px] transition-transform" />
                  ) : (
                    <ChevronDown className="w-4 h-4 group-hover:translate-y-[2px] transition-transform" />
                  )}
                  <span className="font-medium">
                    {showQuotedContent ? 'Hide' : 'Show'} previous messages ({message.quotedBlocks?.length || 0})
                  </span>
                </button>
                
                {showQuotedContent && (
                  <div className="mt-4 space-y-3">
                    {message.quotedBlocks?.map((block, index) => (
                      <div 
                        key={index}
                        className="relative pl-5 border-l-3 border-muted-foreground/30 bg-muted/20 p-4 rounded-r-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-muted-foreground/40 to-muted-foreground/10 rounded-l-lg" />
                        <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                          {block.kind === 'gmail' ? 'Previous email' : 'Quoted reply'}
                        </div>
                        <div 
                          className="prose prose-sm max-w-none text-foreground/80 [&_*]:text-foreground/80"
                          dangerouslySetInnerHTML={{ __html: block.raw }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Dev probe */}
            <MessageDebugProbe message={message} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};