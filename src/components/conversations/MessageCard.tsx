import { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

// tone per direction (authorType)
function tone(authorType: 'agent' | 'customer' | 'system' = 'customer') {
  if (authorType === 'agent') {
    return {
      accentBar: 'bg-emerald-500',
      border: 'border-emerald-200',
      bg: 'bg-emerald-50/60',
      chip: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    };
  }
  if (authorType === 'customer') {
    return {
      accentBar: 'bg-indigo-500',
      border: 'border-indigo-200',
      bg: 'bg-indigo-50/60',
      chip: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
    };
  }
  return {
    accentBar: 'bg-slate-400',
    border: 'border-slate-200',
    bg: 'bg-slate-50/60',
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
  
  // never show quoted blocks (even if present)
  const SHOW_QUOTED = import.meta.env.VITE_QUOTED_SEGMENTATION === '1' && false;
  
  const isFromCustomer = message.authorType === 'customer';
  
  // Get attachments from original message
  const attachments = message.originalMessage?.attachments ? 
    (typeof message.originalMessage.attachments === 'string' ? 
      JSON.parse(message.originalMessage.attachments) : 
      message.originalMessage.attachments) as EmailAttachment[] : [];

  // Decode HTML entities and generate preview text
  const decodeEntities = (s: string) => {
    if (!s) return s;
    return s
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"');
  };

  const getPreviewText = (content: string) => {
    const textOnly = decodeEntities(content.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
    return textOnly.length > 160 ? textOnly.slice(0, 160) + '…' : textOnly;
  };

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
      "group relative rounded-xl border transition-colors",
      tne.border,
      !isCollapsed && tne.bg
    )}>
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-xl", tne.accentBar)} />
      
      <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
        <div className="p-4 pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium" title={message.from.email || message.from.name}>
                {initial}
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium truncate">
                    {display}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {dateTime(typeof message.createdAt === 'string' ? message.createdAt : new Date(message.createdAt).toISOString())}
                  </div>
                  
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

                {/* Participants chips */}
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                  {toShown.length > 0 && (
                    <>
                      <span className="text-muted-foreground">{t('mail.to') || 'to'}</span>
                      {toShown.map((name) => (
                        <span
                          key={`to-${name}`}
                          className={cn(
                            "px-2 py-0.5 rounded-full ring-1",
                            tne.chip
                          )}
                          title={name}
                        >
                          {name}
                        </span>
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
                    </>
                  )}

                  {ccShown.length > 0 && (
                    <>
                      <span className="ml-2 text-muted-foreground">{t('mail.cc') || 'cc'}</span>
                      {ccShown.map((name) => (
                        <span
                          key={`cc-${name}`}
                          className={cn("px-2 py-0.5 rounded-full ring-1", tne.chip)}
                          title={name}
                        >
                          {name}
                        </span>
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
                
                {/* Preview line when collapsed */}
                {isCollapsed && (
                  <div className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {getPreviewText(message.visibleBody)}
                  </div>
                )}

                {/* Subject line when collapsed */}
                {message.subject && isCollapsed && (
                  <div className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                    Re: {message.subject}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              {/* Expand/Collapse trigger */}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  {isCollapsed ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronUp className="h-3 w-3" />
                  )}
                </Button>
              </CollapsibleTrigger>
              
              {/* Message Actions */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreVertical className="h-3 w-3" />
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
          <div className="px-4 pb-4">
            {/* Subject line when expanded */}
            {message.subject && (
              <div className="text-sm font-medium mb-3 pb-2 border-b border-border">
                Subject: {message.subject}
              </div>
            )}
            
            {/* Main message content */}
            <EmailRender
              content={message.visibleBody}
              contentType={message.originalMessage?.content_type || 'text/plain'}
              attachments={attachments}
              messageId={message.id}
            />
            
            {/* Quoted content toggle - only show if feature flag is enabled */}
            {SHOW_QUOTED && message.quotedBlocks && message.quotedBlocks.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="text-xs text-muted-foreground">
                  Thread-aware view: Quoted content hidden
                </div>
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