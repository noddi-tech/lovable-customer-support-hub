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
                {isFromCustomer 
                  ? conversation.customer?.full_name?.[0] || message.from.name?.[0] || 'C'
                  : message.from.name?.[0] || 'A'
                }
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-medium text-sm">
                  {message.authorLabel}
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
              
              {message.originalMessage?.email_subject && (
                <div className="text-xs text-muted-foreground mt-1 truncate">
                  Subject: {message.originalMessage.email_subject}
                </div>
              )}
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
        
        {/* Quoted content toggle */}
        {message.quotedBlocks && message.quotedBlocks.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowQuoted(!showQuoted)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {showQuoted ? (
                <>
                  <ChevronUp className="w-3 h-3 mr-1" />
                  Hide quoted text
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3 mr-1" />
                  Show quoted text ({message.quotedBlocks.length} block{message.quotedBlocks.length > 1 ? 's' : ''})
                </>
              )}
            </Button>
            
            {showQuoted && (
              <div className="mt-2 space-y-2">
                {message.quotedBlocks.map((block, index) => (
                  <div key={index} className="pl-3 border-l-2 border-muted">
                    <div className="text-xs text-muted-foreground mb-1 font-medium">
                      {block.kind === 'gmail' ? 'Gmail Quote' : 
                       block.kind === 'outlook' ? 'Outlook Quote' :
                       block.kind === 'blockquote' ? 'HTML Quote' : 'Quoted Text'}
                    </div>
                    <EmailRender
                      content={block.raw}
                      contentType={message.originalMessage?.content_type || 'text/plain'}
                      attachments={[]}
                      messageId={`${message.id}-quoted-${index}`}
                    />
                  </div>
                ))}
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