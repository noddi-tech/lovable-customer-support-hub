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
  ChevronUp
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { type EmailAttachment } from "@/utils/emailFormatting";
import { useDateFormatting } from "@/hooks/useDateFormatting";
import { useTranslation } from "react-i18next";
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

// tone per direction (authorType) - Pure white cards with colored accent bars
function tone(authorType: 'agent' | 'customer' | 'system' = 'customer') {
  if (authorType === 'agent') {
    return {
      accentBar: 'bg-emerald-500',
      border: 'border-gray-200',
      bg: 'bg-white',
      chip: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    };
  }
  if (authorType === 'customer') {
    return {
      accentBar: 'bg-indigo-500',
      border: 'border-gray-200',
      bg: 'bg-white',
      chip: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
    };
  }
  return {
    accentBar: 'bg-slate-400',
    border: 'border-gray-200',
    bg: 'bg-white',
    chip: 'bg-slate-50 text-slate-800 ring-slate-200',
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
  isFirstInThread?: boolean;  // NEW: Indicates if this is the first message in the thread
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
}

export const MessageCard = ({ 
  message, 
  conversation, 
  defaultCollapsed = true,
  isFirstInThread = false,
  onEdit, 
  onDelete 
}: MessageCardProps) => {
  const { dateTime } = useDateFormatting();
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [showAllRecipients, setShowAllRecipients] = useState(false);
  const [showQuotedContent, setShowQuotedContent] = useState(false);
  
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

  // Get theme tone
  const tne = tone(message.authorType);

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

  // Helper to detect if message is from customer
  const isCustomer = () => {
    const from = (message.from?.email || '').toLowerCase();
    return !from.endsWith('@noddi.no') && !from.includes('@noddi.tech');
  };

  return (
    <div 
      data-message-id={message.id}
      data-author-type={message.authorType || 'unknown'}
      data-is-customer={isCustomer()}
      className={cn(
        "group relative rounded-xl border transition-all duration-200",
        "shadow-sm hover:shadow-md hover:border-primary/40",
        isCustomer()
          ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/40"
          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800",
        tne.border
      )}>
      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl transition-all duration-200", tne.accentBar)} />
      
      <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
        {/* Card Header - improved spacing */}
        <div className={cn("p-6", !isCollapsed && "bg-muted/20 border-b")}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 min-w-0 flex-1">
              <Avatar className="h-10 w-10 ring-2 ring-border shrink-0">
                <AvatarFallback className="text-sm font-medium">
                  {initial}
                </AvatarFallback>
              </Avatar>
              
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                  <span className="font-semibold text-base leading-tight">
                    {display}
                  </span>
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
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
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
                   <div className="mt-1 space-x-1 text-xs text-muted-foreground">
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
                
                 {/* Subject and preview when collapsed - enhanced layout */}
                {isCollapsed && (
                  <div className="mt-3 space-y-1.5">
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
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-1 shrink-0">
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
        
        <CollapsibleContent>
          <div className="p-6 pt-5 min-w-0 overflow-hidden">
            {/* Email header metadata - ONLY on first message in thread */}
            {!isCollapsed && isFirstInThread && (
              <div className="mb-6 pb-6 border-b space-y-2.5 text-sm bg-muted/20 -mx-6 -mt-5 px-6 pt-5 rounded-t-lg">
                <div className="flex">
                  <span className="w-16 font-medium text-muted-foreground shrink-0">From:</span>
                  <span className="text-foreground">{display}</span>
                </div>
                {message.to && message.to.length > 0 && (
                  <div className="flex">
                    <span className="w-16 font-medium text-muted-foreground shrink-0">To:</span>
                    <span className="text-foreground">
                      {message.to.map(a => a.name || a.email).join(', ')}
                    </span>
                  </div>
                )}
                {message.cc && message.cc.length > 0 && (
                  <div className="flex">
                    <span className="w-16 font-medium text-muted-foreground shrink-0">Cc:</span>
                    <span className="text-foreground">
                      {message.cc.map(a => a.name || a.email).join(', ')}
                    </span>
                  </div>
                )}
                <div className="flex">
                  <span className="w-16 font-medium text-muted-foreground shrink-0">Date:</span>
                  <span className="text-foreground">
                    {dateTime(typeof message.createdAt === 'string' ? message.createdAt : new Date(message.createdAt).toISOString())}
                  </span>
                </div>
                {message.subject && (
                  <div className="flex">
                    <span className="w-16 font-medium text-muted-foreground shrink-0">Subject:</span>
                    <span className="text-foreground font-semibold">{message.subject}</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Compact header for subsequent messages */}
            {!isCollapsed && !isFirstInThread && (
              <div className="mb-4 pb-3 border-b text-xs text-muted-foreground -mx-6 px-6">
                <span className="font-medium text-foreground">{display}</span>
                <span className="mx-2">•</span>
                <span>{dateTime(typeof message.createdAt === 'string' ? message.createdAt : new Date(message.createdAt).toISOString())}</span>
              </div>
            )}
            
            {/* Visual separator between header and content */}
            {!isCollapsed && (
              <div className="h-[1px] bg-border/50 mb-5 -mx-6" />
            )}
            
            {/* Main message content */}
            <div className="mt-4">
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
              <div className="mt-6 pt-4 border-t">
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
              <div className="mt-6 pt-6 border-t border-dashed">
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