import { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

interface MessageItemProps {
  message: NormalizedMessage;
  conversation: {
    customer?: {
      full_name?: string;
      email?: string;
    } | null;
  };
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
}

export const MessageItem = ({ message, conversation, onEdit, onDelete }: MessageItemProps) => {
  const { dateTime } = useDateFormatting();
  const { t } = useTranslation();
  const [showQuoted, setShowQuoted] = useState(false);

  const hasQuoted = !!message.quotedBlocks && message.quotedBlocks.length > 0;
  const quotedHtml = hasQuoted
    ? message.quotedBlocks!.map(b => b.raw || '').filter(Boolean).join('\n<hr/>\n')
    : '';

  const isFromCustomer = message.authorType === 'customer';
  
  // Get attachments from original message
  const attachments = message.originalMessage?.attachments ? 
    (typeof message.originalMessage.attachments === 'string' ? 
      JSON.parse(message.originalMessage.attachments) : 
      message.originalMessage.attachments) as EmailAttachment[] : [];

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
    <Card className="group overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className={cn(
                isFromCustomer ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                {(() => {
                  const raw = (message.from.name || message.from.email || '•').trim();
                  const cleaned = raw.replace(/^['"]+/, '').replace(/['"]+$/, '').split(/\s+via\s+/i)[0].trim();
                  const parts = cleaned.split(/[\s._-]+/).filter(Boolean);
                  return parts.map(p => p[0]).join('').toUpperCase().slice(0, 3) || '•';
                })()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-medium text-sm truncate">
                  {message.from.name?.trim() || message.from.email?.split('@')[0] || (message.authorType === 'agent' ? 'Agent' : 'Customer')}
                  {message.from.email && <span className="ml-2 text-muted-foreground text-xs">({message.from.email})</span>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {dateTime(typeof message.createdAt === 'string' ? message.createdAt : new Date(message.createdAt).toISOString())}
                </div>
                
                {message.originalMessage?.is_internal && (
                  <Badge variant="outline" className="text-xs">
                    <Lock className="w-3 h-3 mr-1" />
                    {t('conversation.internalNote')}
                  </Badge>
                )}
                
                {attachments.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    <Paperclip className="w-3 h-3 mr-1" />
                    {attachments.length}
                  </Badge>
                )}
              </div>
              
              {/* Recipients line */}
              <div className="text-xs text-muted-foreground truncate">
                {message.to.length > 0 && <>{t('mail.to') || 'to'} {message.to.slice(0, 3).map(r => r.name || r.email).join(', ')}{message.to.length > 3 ? ` +${message.to.length - 3}` : ''}</>}
                {message.cc && message.cc.length > 0 && <> · {t('mail.cc') || 'cc'} {message.cc.slice(0, 2).map(r => r.name || r.email).join(', ')}{message.cc.length > 2 ? ` +${message.cc.length - 2}` : ''}</>}
                {message.subject && <> · Re: {message.subject}</>}
              </div>
            </div>
          </div>
          
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
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Main message content */}
        <EmailRender
          content={message.visibleBody}
          contentType={message.originalMessage?.content_type || 'text/plain'}
          attachments={attachments}
          messageId={message.id}
        />
        
        {/* Quoted history toggle */}
        {hasQuoted && (
          <div className="mt-3 pt-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => setShowQuoted(v => !v)}
            >
              {showQuoted ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
              {showQuoted ? t('conversation.hideQuoted', 'Skjul sitert historikk') : t('conversation.showQuoted', 'Vis sitert historikk')}
            </Button>
            {showQuoted && (
              <div className="mt-2 pl-3 border-l-2 border-border opacity-80">
                <EmailRender
                  content={quotedHtml}
                  contentType={message.originalMessage?.content_type || 'text/html'}
                  attachments={[]}
                  messageId={`${message.id}-quoted`}
                />
              </div>
            )}
          </div>
        )}
        
        {/* Dev probe */}
        <MessageDebugProbe message={message} />
      </CardContent>
    </Card>
  );
};