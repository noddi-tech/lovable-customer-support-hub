import React, { useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw,
  ArrowLeft,
  ChevronsDown,
  ChevronsUp,
} from 'lucide-react';
import { getCustomerDisplayWithNoddi, getCustomerInitial } from '@/utils/customerDisplayName';
import { useNoddihKundeData } from '@/hooks/useNoddihKundeData';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '@/hooks/use-responsive';
import { ProgressiveMessagesList, ProgressiveMessagesListRef } from '@/components/conversations/ProgressiveMessagesList';
import { LazyReplyArea } from '@/components/conversations/LazyReplyArea';
import { CustomerSidePanel } from './CustomerSidePanel';
import { useConversationShortcuts } from '@/hooks/useConversationShortcuts';
import { cn } from '@/lib/utils';
import { useConversationView } from '@/contexts/ConversationViewContext';
import { useConversationPresenceSafe } from '@/contexts/ConversationPresenceContext';
import { PresenceAvatarStack } from '@/components/conversations/PresenceAvatarStack';
import { TagDialog } from './TagDialog';
import { SnoozeDialog } from './SnoozeDialog';
import { useVisitorOnlineStatus } from '@/hooks/useVisitorOnlineStatus';
import { formatDistanceToNow } from 'date-fns';
import { 
  Dialog,
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';

interface ConversationViewContentProps {
  conversationId: string;
  conversation: any;
  showSidePanel?: boolean;
}

export const ConversationViewContent: React.FC<ConversationViewContentProps> = ({ 
  conversationId,
  conversation,
  showSidePanel = true
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const messagesListRef = useRef<ProgressiveMessagesListRef>(null);
  const [allExpanded, setAllExpanded] = React.useState(false);
  
  // Get conversationIds from context for thread viewing
  const { conversationIds } = useConversationView();

  // Presence tracking - extract stable function references
  const presenceContext = useConversationPresenceSafe();
  const trackConversation = presenceContext?.trackConversation;
  const untrackConversation = presenceContext?.untrackConversation;
  const isPresenceConnected = presenceContext?.isConnected;
  
  useEffect(() => {
    console.log('[ConversationView] Presence tracking effect:', { 
      conversationId, 
      hasTrackFn: !!trackConversation, 
      isConnected: isPresenceConnected 
    });
    
    // Only track when channel is connected AND we have a conversation ID
    if (trackConversation && conversationId && isPresenceConnected) {
      console.log('[ConversationView] Calling trackConversation for:', conversationId);
      trackConversation(conversationId);
      return () => {
        console.log('[ConversationView] Cleanup: untracking conversation');
        untrackConversation?.();
      };
    }
  }, [conversationId, trackConversation, untrackConversation, isPresenceConnected]);

  // Enable keyboard shortcuts for status changes
  useConversationShortcuts();

  const [sidePanelCollapsed, setSidePanelCollapsed] = React.useState(false);

  // Fetch Noddi data for customer display
  const { data: noddiData } = useNoddihKundeData(conversation.customer || null);

  // Smart customer display - prioritize Noddi data for the name
  const customerDisplay = useMemo(() => 
    getCustomerDisplayWithNoddi(noddiData, conversation.customer?.full_name, conversation.customer?.email),
    [noddiData, conversation.customer?.full_name, conversation.customer?.email]
  );

  const handleToggleAll = () => {
    messagesListRef.current?.toggleAllMessages();
    setAllExpanded(messagesListRef.current?.allExpanded ?? false);
  };
  
  // Get conversation view context
  const {
    state,
    dispatch,
    assignUsers,
    moveInboxes,
    assignConversation,
    moveConversation,
    snoozeConversation,
    addTag,
    removeTag,
  } = useConversationView();

  // Check if this is a live chat (widget channel)
  const isLiveChat = conversation?.channel === 'widget';
  
  // Track visitor online status for live chat
  const { data: onlineStatus } = useVisitorOnlineStatus(isLiveChat ? conversationId : null);

  // Handle back navigation
  const handleBack = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('c');
    setSearchParams(newParams);
  };

  // ============ LIVE CHAT UI (WhatsApp-style) ============
  if (isLiveChat) {
    return (
      <div className="flex h-full bg-background">
        {/* Full-width chat container - no side panel */}
        <div className="flex flex-col flex-1 min-h-0">
          {/* Compact Chat Header */}
          <div className="flex-shrink-0 px-4 py-3 border-b flex items-center gap-3 bg-background shadow-sm">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleBack}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            {/* Small avatar */}
            <Avatar className="h-9 w-9 ring-1 ring-border shrink-0">
              <AvatarFallback className="text-sm">
                {getCustomerInitial(customerDisplay.displayName, customerDisplay.email)}
              </AvatarFallback>
            </Avatar>
            
            {/* Customer info + online status */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">
                  {customerDisplay.displayName}
                </span>
                {/* Online status dot */}
                <div className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  onlineStatus?.isOnline 
                    ? "bg-green-500 animate-pulse" 
                    : "bg-gray-400"
                )} />
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs shrink-0",
                    onlineStatus?.isOnline 
                      ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                      : "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700"
                  )}
                >
                  {onlineStatus?.isOnline ? 'Online' : 'Offline'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {customerDisplay.showEmail && customerDisplay.email && (
                  <span className="text-xs text-muted-foreground truncate">
                    {customerDisplay.email}
                  </span>
                )}
                {!onlineStatus?.isOnline && onlineStatus?.lastSeenAt && (
                  <span className="text-xs text-muted-foreground">
                    · Last seen {formatDistanceToNow(new Date(onlineStatus.lastSeenAt), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
            
            {/* Team presence */}
            <PresenceAvatarStack 
              conversationId={conversationId} 
              size="sm" 
              maxAvatars={2}
              className="shrink-0"
            />
          </div>
          
          {/* Chat Messages Area - full height, compact mode skips duplicate header */}
          <ProgressiveMessagesList 
            ref={messagesListRef}
            conversationId={conversationId}
            conversationIds={conversationIds}
            conversation={conversation}
            compactChatMode={true}
          />
        </div>
        
        {/* Dialogs still needed for chat */}
        <TagDialog
          open={state.tagDialogOpen}
          onOpenChange={(open) => dispatch({ type: 'SET_TAG_DIALOG', payload: open })}
          currentTags={((conversation.metadata as Record<string, any> || {}).tags || []) as string[]}
          onAddTag={addTag}
          onRemoveTag={removeTag}
        />
      </div>
    );
  }

  // ============ EMAIL UI (Original layout) ============
  return (
    <div className="flex h-full">
      {/* Main conversation area */}
      <div className="flex flex-col min-h-0 flex-1 bg-white">
        {/* Enhanced Conversation Header */}
        <div className="flex-shrink-0 p-5 border-b-2 border-border bg-white shadow-sm transition-colors duration-200">
          <div className="flex items-center gap-4">
            {/* Left Section: Back + Customer Info */}
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleBack}
                className="flex items-center gap-2 shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                {!isMobile && <span className="text-sm">Back</span>}
              </Button>
              
              <div className="flex items-center gap-4 min-w-0">
                <Avatar className="h-14 w-14 ring-2 ring-border shrink-0">
                  <AvatarFallback className="text-xl font-bold">
                    {getCustomerInitial(conversation.customer?.full_name, conversation.customer?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold mb-1">
                    {customerDisplay.displayName}
                  </h1>
                  {customerDisplay.showEmail && customerDisplay.email && (
                    <p className="text-sm text-muted-foreground">
                      {customerDisplay.email}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Center Section: Subject (if exists) */}
            {conversation.subject && !isMobile && (
              <div className="flex-1 text-center">
                <p className="text-sm font-medium text-muted-foreground">Subject</p>
                <h2 className="text-base font-semibold">
                  {conversation.subject}
                </h2>
              </div>
            )}
            
            {/* Right Section: Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Presence Avatars */}
              <PresenceAvatarStack 
                conversationId={conversationId} 
                size="md"
                maxAvatars={3}
                className="mr-2"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['conversation-messages', conversationId] });
                  queryClient.invalidateQueries({ queryKey: ['conversation-meta', conversationId] });
                  toast.success('Conversation refreshed');
                }}
                className="gap-2"
                title="Refresh (Ctrl+R)"
              >
                <RefreshCw className="h-4 w-4" />
                {!isMobile && <span className="text-xs">Refresh</span>}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleAll}
                className="gap-2"
                title={allExpanded ? "Collapse all messages" : "Expand all messages"}
              >
                {allExpanded ? (
                  <>
                    <ChevronsUp className="h-4 w-4" />
                    {!isMobile && <span className="text-xs">Collapse All</span>}
                  </>
                ) : (
                  <>
                    <ChevronsDown className="h-4 w-4" />
                    {!isMobile && <span className="text-xs">Expand All</span>}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Conversation Metadata Header */}
        {conversation.subject && (
          <div className="flex-shrink-0 px-4 py-3 bg-muted/20 border-b">
            <div className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-2 text-sm max-w-4xl">
              <span className="text-muted-foreground font-medium">Subject:</span>
              <span className="font-semibold text-foreground">{conversation.subject}</span>
            </div>
          </div>
        )}

        {/* Messages Area with Progressive Loading */}
        <div className="flex-1 min-h-0 w-full flex flex-col bg-white">
          <ProgressiveMessagesList 
            ref={messagesListRef}
            conversationId={conversationId}
            conversationIds={conversationIds}
            conversation={conversation}
          />
        </div>
      </div>

      {/* Side panel - Responsive with collapse feature */}
      {showSidePanel && !isMobile && (
        <div className={cn(
          "flex-shrink-0 border-l border-border transition-all duration-300 ease-in-out",
          sidePanelCollapsed ? "w-12" : "w-80 lg:w-[340px] xl:w-[380px] 2xl:w-[420px]"
        )}>
          <CustomerSidePanel 
            conversation={conversation}
            isCollapsed={sidePanelCollapsed}
            onToggleCollapse={() => setSidePanelCollapsed(!sidePanelCollapsed)}
          />
        </div>
      )}

      {/* Dialogs */}
      <TagDialog
        open={state.tagDialogOpen}
        onOpenChange={(open) => dispatch({ type: 'SET_TAG_DIALOG', payload: open })}
        currentTags={((conversation.metadata as Record<string, any> || {}).tags || []) as string[]}
        onAddTag={addTag}
        onRemoveTag={removeTag}
      />

      <SnoozeDialog
        open={state.snoozeDialogOpen}
        onOpenChange={(open) => 
          dispatch({ type: 'SET_SNOOZE_DIALOG', payload: { open, date: new Date(), time: '09:00' } })
        }
        onSnooze={async (date: Date, time: string) => {
          dispatch({ type: 'SET_SNOOZE_DIALOG', payload: { open: true, date, time } });
          await snoozeConversation();
        }}
      />

      {/* Assign Dialog */}
      <Dialog 
        open={state.assignDialogOpen}
        onOpenChange={(open) => 
          dispatch({ type: 'SET_ASSIGN_DIALOG', payload: { open, userId: '', loading: false } })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              value={state.assignSelectedUserId}
              onValueChange={(userId) =>
                dispatch({ type: 'SET_ASSIGN_DIALOG', payload: { 
                  open: true, 
                  userId, 
                  loading: false 
                }})
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {assignUsers.map((user: any) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => 
                dispatch({ type: 'SET_ASSIGN_DIALOG', payload: { open: false, userId: '', loading: false } })
              }
            >
              Cancel
            </Button>
            <Button 
              onClick={() => assignConversation(state.assignSelectedUserId)}
              disabled={!state.assignSelectedUserId || state.assignLoading}
            >
              {state.assignLoading ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Dialog */}
      <Dialog 
        open={state.moveDialogOpen}
        onOpenChange={(open) => 
          dispatch({ type: 'SET_MOVE_DIALOG', payload: { open, inboxId: '', loading: false } })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              value={state.moveSelectedInboxId}
              onValueChange={(inboxId) =>
                dispatch({ type: 'SET_MOVE_DIALOG', payload: { 
                  open: true, 
                  inboxId, 
                  loading: false 
                }})
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select inbox" />
              </SelectTrigger>
              <SelectContent>
                {moveInboxes.map((inbox: any) => (
                  <SelectItem key={inbox.id} value={inbox.id}>
                    {inbox.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => 
                dispatch({ type: 'SET_MOVE_DIALOG', payload: { open: false, inboxId: '', loading: false } })
              }
            >
              Cancel
            </Button>
            <Button 
              onClick={() => moveConversation(state.moveSelectedInboxId)}
              disabled={!state.moveSelectedInboxId || state.moveLoading}
            >
              {state.moveLoading ? 'Moving...' : 'Move'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Conversation Dialog */}
      <AlertDialog 
        open={state.deleteDialogOpen && !state.messageToDelete}
        onOpenChange={(open) => 
          dispatch({ type: 'SET_DELETE_DIALOG', payload: { open, messageId: null } })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the conversation and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                const { error } = await supabase
                  .from('conversations')
                  .delete()
                  .eq('id', conversationId);
                
                if (error) {
                  toast.error('Failed to delete conversation');
                } else {
                  toast.success('Conversation deleted');
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('c');
                  setSearchParams(newParams);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
