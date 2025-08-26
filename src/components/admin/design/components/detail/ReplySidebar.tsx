import React, { useState, useCallback, KeyboardEvent } from 'react';
import { Send, Paperclip, MoreVertical, Tag, UserPlus, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ReplySidebarProps {
  // Content state
  conversationId?: string;
  replyText?: string;
  onReplyChange?: (text: string) => void;
  onSendReply?: (text: string) => Promise<void>;
  
  // Simple interface for tests/stories
  onSend?: (message: string) => void;  // Add this for compatibility
  title?: string;                      // Add this for compatibility
  recipientLabel?: string;             // Add this for compatibility
  actions?: React.ReactNode;           // Add this for compatibility
  
  // Conversation metadata
  status?: 'open' | 'pending' | 'resolved' | 'closed';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  assignedTo?: {
    id: string;
    name: string;
    avatar?: string;
  };
  tags?: string[];
  
  // Actions
  onStatusChange?: (status: string) => void;
  onPriorityChange?: (priority: string) => void;
  onAssigneeChange?: (assigneeId: string) => void;
  onAddTag?: (tag: string) => void;
  onRemoveTag?: (tag: string) => void;
  
  // UI state
  isLoading?: boolean;
  className?: string;
  
  // Customization
  showActions?: boolean;
  showMetadata?: boolean;
  placeholder?: string;
}

export const ReplySidebar: React.FC<ReplySidebarProps> = ({
  conversationId,
  replyText = '',
  onReplyChange,
  onSendReply,
  onSend,  // Add this for compatibility
  title,   // Add this for compatibility
  recipientLabel, // Add this for compatibility
  actions, // Add this for compatibility
  status = 'open',
  priority = 'normal',
  assignedTo,
  tags = [],
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onAddTag,
  onRemoveTag,
  isLoading = false,
  className,
  showActions = true,
  showMetadata = true,
  placeholder = "Type your reply..."
}) => {
  const [internalReplyText, setInternalReplyText] = useState(replyText);
  const [isSending, setIsSending] = useState(false);

  const currentReplyText = onReplyChange ? replyText : internalReplyText;
  const setCurrentReplyText = onReplyChange || setInternalReplyText;

  const handleSendReply = useCallback(async () => {
    if (!currentReplyText.trim() || isSending) return;
    
    setIsSending(true);
    try {
      // Use onSend if provided (for compatibility), otherwise onSendReply
      if (onSend) {
        onSend(currentReplyText.trim());
      } else {
        await onSendReply?.(currentReplyText.trim());
      }
      setCurrentReplyText('');
    } catch (error) {
      console.error('Failed to send reply:', error);
    } finally {
      setIsSending(false);
    }
  }, [currentReplyText, onSend, onSendReply, isSending, setCurrentReplyText]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Cmd+Enter or Ctrl+Enter
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      handleSendReply();
    }
  }, [handleSendReply]);

  const getStatusColor = (status: string) => {
    const colors = {
      open: 'bg-blue-100 text-blue-800 border-blue-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      resolved: 'bg-green-100 text-green-800 border-green-200',
      closed: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[status as keyof typeof colors] || colors.open;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800 border-gray-200',
      normal: 'bg-blue-100 text-blue-800 border-blue-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      urgent: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[priority as keyof typeof colors] || colors.normal;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Custom actions from props */}
      {actions && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{title || 'Actions'}</CardTitle>
          </CardHeader>
          <CardContent>
            {actions}
          </CardContent>
        </Card>
      )}
      
      {/* Conversation Metadata */}
      {showMetadata && !actions && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Conversation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={status} onValueChange={onStatusChange}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Priority</label>
              <Select value={priority} onValueChange={onPriorityChange}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assigned To */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Assigned To</label>
              {assignedTo ? (
                <div className="flex items-center gap-2 p-2 rounded-md border border-border">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={assignedTo.avatar} />
                    <AvatarFallback className="text-xs">
                      {assignedTo.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{assignedTo.name}</span>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => onAssigneeChange?.('current-user')}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign to me
                </Button>
              )}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Tags</label>
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs px-2 py-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => onRemoveTag?.(tag)}
                      title={`Remove ${tag} tag`}
                    >
                      {tag}×
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      {showActions && !actions && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Tag className="h-4 w-4 mr-2" />
              Add Tag
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Clock className="h-4 w-4 mr-2" />
              Snooze
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <MoreVertical className="h-4 w-4 mr-2" />
              More Actions
            </Button>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Reply Area */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">{title || 'Reply'}</CardTitle>
          {recipientLabel && (
            <div className="text-sm text-muted-foreground">
              To: {recipientLabel}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Textarea
              value={currentReplyText}
              onChange={(e) => setCurrentReplyText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="min-h-[120px] resize-none"
              disabled={isLoading || isSending}
            />
            <div className="text-xs text-muted-foreground">
              Press ⌘+Enter to send
            </div>
          </div>

          <div className="flex items-center justify-between">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" disabled={isLoading || isSending}>
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Attach file</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              onClick={handleSendReply}
              disabled={!currentReplyText.trim() || isLoading || isSending}
              size="sm"
              className="ml-auto"
            >
              {isSending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Reply
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};