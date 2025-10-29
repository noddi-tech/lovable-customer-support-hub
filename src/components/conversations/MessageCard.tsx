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
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
}

export const MessageCard = ({ 
  message, 
  conversation, 
  defaultCollapsed = true,
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

  return (
    <div className={cn(
      "group relative rounded-xl border transition-all duration-200",
      "shadow-sm hover:shadow-md bg-card",
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
                    {(hasQuotedContent || attachments.length > 0) && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {attachments.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Paperclip className="w-3 h-3" />
                            {attachments.length}
                          </span>
                        )}
                        {hasQuotedContent && (
                          <span>• Thread</span>
                        )}
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
            {/* Email header metadata when expanded */}
            {!isCollapsed && (
              <div className="mb-6 pb-6 border-b space-y-2.5 text-sm">
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
            
            {/* Main message content with enhanced typography */}
            <div className="prose prose-sm max-w-none">
              <EmailRender
                content={message.visibleBody}
                contentType={message.originalMessage?.content_type || 'text/plain'}
                attachments={attachments}
                messageId={message.id}
              />
            </div>
            
            {/* Quoted content toggle */}
            {hasQuotedContent && (
              <div className="mt-6 pt-6 border-t">
                <button
                  onClick={() => setShowQuotedContent(!showQuotedContent)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showQuotedContent ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  <span>
                    {showQuotedContent ? 'Hide' : 'Show'} previous messages ({message.quotedBlocks?.length || 0})
                  </span>
                </button>
                
                {showQuotedContent && (
                  <div className="mt-4 space-y-4">
                    {message.quotedBlocks?.map((block, index) => (
                      <div 
                        key={index}
                        className="pl-4 border-l-4 border-muted bg-muted/30 p-4 rounded-r-lg"
                      >
                        <div className="text-xs text-muted-foreground mb-2 italic">
                          {block.kind === 'gmail' ? 'Gmail quote' : 'Quoted content'}
                        </div>
                        <div 
                          className="prose prose-sm max-w-none text-muted-foreground"
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