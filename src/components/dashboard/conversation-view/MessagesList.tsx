import { useRef, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { EmailRender } from "@/components/ui/email-render";
import { 
  Lock,
  Edit3,
  Trash2,
  Paperclip,
  MoreVertical
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { sanitizeEmailHTML, shouldRenderAsHTML, type EmailAttachment } from "@/utils/emailFormatting";
import { useDateFormatting } from "@/hooks/useDateFormatting";
import { useConversationView } from "@/contexts/ConversationViewContext";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export const MessagesList = () => {
  const { messages, conversation, state, dispatch } = useConversationView();
  const { dateTime } = useDateFormatting();
  const { t } = useTranslation();
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive or reply area opens
  useEffect(() => {
    if (messagesContainerRef.current && (state.showReplyArea || messages.length > 0)) {
      const container = messagesContainerRef.current;
      setTimeout(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [messages.length, state.showReplyArea]);

  if (!conversation) return null;

  const handleDeleteMessage = (messageId: string) => {
    dispatch({ type: 'SET_DELETE_DIALOG', payload: { open: true, messageId } });
  };

  const handleEditMessage = (messageId: string, content: string) => {
    dispatch({ type: 'SET_EDITING_MESSAGE', payload: { id: messageId, text: content } });
  };

  return (
    <div className="flex-1 min-h-0">
      <ScrollArea className="h-full" ref={messagesContainerRef}>
        <div className="p-4 space-y-6">
          {messages.map((message: any, index: number) => (
            <div key={message.id} className="group">
              <div className={cn(
                "flex gap-3",
                message.sender_type === 'agent' && "flex-row-reverse"
              )}>
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="text-xs">
                    {message.sender_type === 'customer' 
                      ? conversation.customer?.full_name?.[0] || 'C'
                      : 'A'
                    }
                  </AvatarFallback>
                </Avatar>
                
                <div className={cn(
                  "flex-1 min-w-0",
                  message.sender_type === 'agent' && "text-right"
                )}>
                  <div className={cn(
                    "flex items-center gap-2 mb-2",
                    message.sender_type === 'agent' && "flex-row-reverse"
                  )}>
                    <span className="font-medium text-sm">
                      {message.sender_type === 'customer' 
                        ? conversation.customer?.full_name || 'Customer'
                        : 'Support Agent'
                      }
                    </span>
                    
                    <span className="text-xs text-muted-foreground">
                      {dateTime(message.created_at)}
                    </span>
                    
                    {message.is_internal && (
                      <Badge variant="outline" className="text-xs">
                        <Lock className="w-3 h-3 mr-1" />
                        Internal
                      </Badge>
                    )}
                    
                    {message.attachments && JSON.parse(message.attachments).length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <Paperclip className="w-3 h-3 mr-1" />
                        {JSON.parse(message.attachments).length}
                      </Badge>
                    )}

                    {/* Message Actions */}
                    <div className={cn(
                      "opacity-0 group-hover:opacity-100 transition-opacity",
                    message.sender_type === 'agent' && "order-first"
                    )}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditMessage(message.id, message.content)}>
                            <Edit3 className="w-4 h-4 mr-2" />
                            {t('conversation.editMessage')}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteMessage(message.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('conversation.deleteMessage')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  <div className={cn(
                    "rounded-lg p-3 max-w-[80%]",
                    message.sender_type === 'customer' 
                      ? "bg-muted" 
                      : "bg-primary text-primary-foreground ml-auto",
                    message.is_internal && "bg-orange-50 border border-orange-200"
                  )}>
                    {shouldRenderAsHTML(message.content, message.content_type || 'text/plain') ? (
                      <EmailRender 
                        content={sanitizeEmailHTML(message.content)} 
                        attachments={message.attachments ? JSON.parse(message.attachments) as EmailAttachment[] : []}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap text-sm">
                        {message.content}
                      </div>
                    )}
                    
                    {/* Attachments */}
                    {message.attachments && JSON.parse(message.attachments).length > 0 && (
                      <div className="mt-3 space-y-2">
                        {JSON.parse(message.attachments).map((attachment: EmailAttachment, i: number) => (
                          <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
                            <Paperclip className="w-4 h-4 text-muted-foreground" />
                            <span className="flex-1 truncate">{attachment.filename}</span>
                            <span className="text-xs text-muted-foreground">
                              {attachment.size ? `${Math.round(attachment.size / 1024)}KB` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {index < messages.length - 1 && (
                <Separator className="mt-6" />
              )}
            </div>
          ))}
          
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <p>{t('conversation.noMessages')}</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};