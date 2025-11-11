import { useRef, useEffect, useState, useMemo } from 'react';
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { EmailRender } from "@/components/ui/email-render";
import { ImageGallery } from "@/components/ui/image-gallery";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { 
  Lock,
  Edit3,
  Trash2,
  Paperclip,
  MoreVertical,
  List,
  Network
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { sanitizeEmailHTML, shouldRenderAsHTML, type EmailAttachment } from "@/utils/emailFormatting";
import { useDateFormatting } from "@/hooks/useDateFormatting";
import { useConversationView } from "@/contexts/ConversationViewContext";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useImageLightbox } from "@/hooks/useImageLightbox";
import { ThreadedMessagesList } from "./ThreadedMessagesList";
import { useThreadTree } from "@/hooks/useThreadTree";
import { normalizeMessage, createNormalizationContext } from "@/lib/normalizeMessage";

export const MessagesList = () => {
  const { messages, conversation, state, dispatch } = useConversationView();
  const { dateTime } = useDateFormatting();
  const { t } = useTranslation();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Threading state
  const [viewMode, setViewMode] = useState<'chronological' | 'threaded'>('chronological');
  const [collapsedThreads, setCollapsedThreads] = useState<Set<string>>(new Set());
  
  // Image lightbox state
  const [currentImageMessage, setCurrentImageMessage] = useState<any>(null);
  const { isOpen, currentIndex, open, close, next, previous } = useImageLightbox();
  
  // Normalize messages for threading
  const normalizedMessages = useMemo(() => {
    const ctx = createNormalizationContext({
      agentEmails: [],
      currentUserEmail: undefined,
    });
    return messages.map(msg => normalizeMessage(msg, ctx));
  }, [messages]);
  
  // Build thread tree
  const threadTree = useThreadTree(normalizedMessages);
  
  // Helper to check if attachment is an image
  const isImageAttachment = (attachment: EmailAttachment) => {
    return attachment.mimeType?.startsWith('image/');
  };

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
  
  const handleToggleThread = (messageId: string) => {
    setCollapsedThreads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };
  
  const handleImageClick = (message: any, imageIndex: number) => {
    setCurrentImageMessage(message);
    open(imageIndex);
  };
  
  // Get current message's images for lightbox
  const currentImages = useMemo(() => {
    if (!currentImageMessage?.attachments) return [];
    const attachments = JSON.parse(currentImageMessage.attachments);
    return attachments.filter(isImageAttachment);
  }, [currentImageMessage]);

  // Render threaded view if enabled
  if (viewMode === 'threaded') {
    return (
      <div className="flex-1 min-h-0 flex flex-col">
        {/* View mode toggle */}
        <div className="flex justify-end p-2 border-b">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode('chronological')}
          >
            <List className="h-4 w-4 mr-2" />
            Chronological View
          </Button>
        </div>
        
        <ScrollArea className="flex-1" ref={messagesContainerRef}>
          <div className="p-4">
            <ThreadedMessagesList
              threadTree={threadTree}
              conversation={conversation}
              collapsedThreads={collapsedThreads}
              onToggleThread={handleToggleThread}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
            />
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* View mode toggle */}
      <div className="flex justify-end p-2 border-b">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setViewMode('threaded')}
        >
          <Network className="h-4 w-4 mr-2" />
          Thread View
        </Button>
      </div>
      
      <ScrollArea className="flex-1" ref={messagesContainerRef}>
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
                    <EmailRender 
                      content={message.content}
                      contentType={message.content_type || 'text/plain'}
                      attachments={message.attachments ? JSON.parse(message.attachments) as EmailAttachment[] : []}
                    />
                    
                    {/* Image Gallery */}
                    {message.attachments && (() => {
                      const attachments = JSON.parse(message.attachments) as EmailAttachment[];
                      const imageAttachments = attachments.filter(isImageAttachment).filter(att => !att.isInline);
                      return imageAttachments.length > 0 ? (
                        <ImageGallery
                          images={imageAttachments}
                          messageId={message.id}
                          onImageClick={(index) => handleImageClick(message, index)}
                        />
                      ) : null;
                    })()}
                    
                    {/* Document Attachments */}
                    {message.attachments && (() => {
                      const attachments = JSON.parse(message.attachments) as EmailAttachment[];
                      const documentAttachments = attachments.filter(att => !isImageAttachment(att));
                      return documentAttachments.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {documentAttachments.map((attachment: EmailAttachment, i: number) => (
                            <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
                              <Paperclip className="w-4 h-4 text-muted-foreground" />
                              <span className="flex-1 truncate">{attachment.filename}</span>
                              <span className="text-xs text-muted-foreground">
                                {attachment.size ? `${Math.round(attachment.size / 1024)}KB` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null;
                    })()}
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
      
      {/* Image Lightbox */}
      {currentImages.length > 0 && (
        <ImageLightbox
          images={currentImages}
          currentIndex={currentIndex}
          isOpen={isOpen}
          messageId={currentImageMessage?.id}
          onClose={close}
          onNext={() => next(currentImages.length)}
          onPrevious={() => previous(currentImages.length)}
          onIndexChange={open}
        />
      )}
    </div>
  );
};