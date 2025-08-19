import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Filter, Inbox, Star, Clock, MoreHorizontal, Archive, Trash2, CheckCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useDateFormatting } from '@/hooks/useDateFormatting';

type ConversationStatus = "open" | "pending" | "resolved" | "closed";
type ConversationPriority = "low" | "normal" | "high" | "urgent";
type ConversationChannel = "email" | "chat" | "phone" | "social" | "facebook" | "instagram" | "whatsapp";

interface Customer {
  id: string;
  full_name: string;
  email: string;
}

interface AssignedTo {
  id: string;
  full_name: string;
  avatar_url?: string;
}

interface Conversation {
  id: string;
  subject: string;
  status: ConversationStatus;
  priority: ConversationPriority;
  is_read: boolean;
  is_archived?: boolean;
  channel: ConversationChannel;
  updated_at: string;
  received_at?: string;
  inbox_id?: string;
  customer?: Customer;
  assigned_to?: AssignedTo;
  snooze_until?: string;
}

interface InboundRoute {
  id: string;
  inbox_id: string | null;
  address: string;
  group_email: string | null;
}


interface ConversationListProps {
  selectedTab: string;
  onSelectConversation: (conversation: Conversation) => void;
  selectedConversation?: Conversation;
  selectedInboxId: string;
}

const priorityColors = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-primary-muted text-primary",
  high: "bg-warning-muted text-warning",
  urgent: "bg-destructive-muted text-destructive",
};

const statusColors = {
  open: "bg-success-muted text-success",
  pending: "bg-warning-muted text-warning",
  resolved: "bg-primary-muted text-primary",
  closed: "bg-muted text-muted-foreground",
};

// All date formatting now handled by timezone-aware useDateFormatting hook

export const ConversationList = ({ selectedTab, onSelectConversation, selectedConversation, selectedInboxId }: ConversationListProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { conversation: formatConversationTime } = useDateFormatting();

  // Fetch inbound routes for empty-state guidance
  const { data: inboundRoutes = [] } = useQuery({
    queryKey: ['inbound_routes'],
    queryFn: async (): Promise<InboundRoute[]> => {
      const { data, error } = await supabase
        .from('inbound_routes')
        .select('id,inbox_id,address,group_email');
      if (error) throw error;
      return data as unknown as InboundRoute[];
    },
  });

  // Fetch inboxes available to the user

  // Sync dropdown with sidebar when a specific inbox tab is selected

  // Fetch real conversations from database
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_conversations');
      if (error) {
        console.error('Error fetching conversations:', error);
        return [];
      }
      // Transform the data to match our interface
      return (data as any[])?.map(conv => ({
        ...conv,
        customer: conv.customer ? {
          id: conv.customer.id,
          full_name: conv.customer.full_name,
          email: conv.customer.email,
        } : undefined,
        assigned_to: conv.assigned_to ? {
          id: conv.assigned_to.id,
          full_name: conv.assigned_to.full_name,
          avatar_url: conv.assigned_to.avatar_url,
        } : undefined,
      })) as Conversation[] || [];
    },
  });

  // Set up real-time subscription for new conversations and messages
  useEffect(() => {
    console.log('Setting up real-time subscription for conversations');
    
    const conversationsChannel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          console.log('New conversation created:', payload);
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          console.log('Conversation updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('New message created:', payload);
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(conversationsChannel);
    };
  }, [queryClient]);

  // Archive conversation mutation
  const archiveConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('conversations')
        .update({ 
          status: 'closed',
          is_archived: true 
        })
        .eq('id', conversationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation-counts'] });
      toast.success('Conversation archived successfully');
    },
    onError: (error) => {
      console.error('Error archiving conversation:', error);
      toast.error('Failed to archive conversation');
    }
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      // First delete all messages in the conversation
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);
      
      if (messagesError) throw messagesError;

      // Then delete the conversation
      const { error: conversationError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);
      
      if (conversationError) throw conversationError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation-counts'] });
      toast.success('Conversation deleted successfully');
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    },
    onError: (error) => {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    }
  });

  const handleArchiveConversation = (conversationId: string) => {
    archiveConversationMutation.mutate(conversationId);
  };

  const handleDeleteClick = (conversationId: string) => {
    setConversationToDelete(conversationId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (conversationToDelete) {
      deleteConversationMutation.mutate(conversationToDelete);
    }
  };

  const effectiveInboxId = selectedTab.startsWith('inbox-')
    ? selectedTab.replace('inbox-', '')
    : (selectedInboxId !== 'all' ? selectedInboxId : null);

  const filteredConversations = conversations.filter((conversation) => {
    const matchesSearch = conversation.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.customer?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.customer?.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || conversation.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || conversation.priority === priorityFilter;
    const matchesInbox = !effectiveInboxId || conversation.inbox_id === effectiveInboxId;
    
    const matchesTab = (() => {
      const isSnoozedActive = !!conversation.snooze_until && new Date(conversation.snooze_until) > new Date();
      switch (selectedTab) {
        case "snoozed":
          return isSnoozedActive;
        case "all":
          return conversation.status !== 'closed' && !isSnoozedActive;
        case "unread":
          return !conversation.is_read && !isSnoozedActive;
        case "assigned":
          return !!conversation.assigned_to && !isSnoozedActive;
        case "pending":
          return conversation.status === 'pending' && !isSnoozedActive;
        case "closed":
          return conversation.status === 'closed' && !isSnoozedActive;
        case "archived":
          return conversation.is_archived === true;
        case "email":
          return conversation.channel === "email" && !isSnoozedActive;
        case "facebook":
          return conversation.channel === "facebook" && !isSnoozedActive;
        case "instagram":
          return conversation.channel === "instagram" && !isSnoozedActive;
        case "whatsapp":
          return conversation.channel === "whatsapp" && !isSnoozedActive;
        default:
          if (selectedTab.startsWith('inbox-')) {
            const inboxId = selectedTab.replace('inbox-', '');
            return conversation.inbox_id === inboxId && !isSnoozedActive;
          }
          return !isSnoozedActive;
      }
    })();

    return matchesSearch && matchesStatus && matchesPriority && matchesInbox && matchesTab;
  });

  const unreadCount = filteredConversations.filter(c => !c.is_read).length;

  return (
    <div className="flex-1 flex flex-col bg-gradient-surface">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card/80 backdrop-blur-sm shadow-surface">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            <h2 className="font-semibold text-lg">{t('dashboard.conversationList.inbox')}</h2>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 px-2 text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            {t('dashboard.conversationList.filter')}
          </Button>
        </div>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder={t('dashboard.conversationList.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder={t('dashboard.conversationList.allStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('dashboard.conversationList.allStatus')}</SelectItem>
              <SelectItem value="open">{t('dashboard.conversationList.open')}</SelectItem>
              <SelectItem value="pending">{t('dashboard.conversationList.pending')}</SelectItem>
              <SelectItem value="resolved">{t('dashboard.conversationList.resolved')}</SelectItem>
              <SelectItem value="closed">{t('dashboard.conversationList.closed')}</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder={t('dashboard.conversationList.allPriority')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('dashboard.conversationList.allPriority')}</SelectItem>
              <SelectItem value="low">{t('dashboard.conversationList.low')}</SelectItem>
              <SelectItem value="normal">{t('dashboard.conversationList.normal')}</SelectItem>
              <SelectItem value="high">{t('dashboard.conversationList.high')}</SelectItem>
              <SelectItem value="urgent">{t('dashboard.conversationList.urgent')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50 animate-spin" />
            <p>{t('dashboard.conversationList.loadingConversations')}</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Inbox className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t('dashboard.conversationList.noConversations')}</p>
            <p className="text-sm">{(() => {
              const routes = (inboundRoutes || []).filter(r => effectiveInboxId && r.inbox_id === effectiveInboxId);
              if (effectiveInboxId && routes.length > 0) {
                const list = routes.map(r => r.group_email || r.address).join(", ");
                return t('dashboard.conversationList.sendEmailToCreateFirst', { address: list });
              }
              return t('dashboard.conversationList.connectInboundEmail');
            })()}</p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onSelectConversation(conversation);
              }}
              className={cn(
                "p-4 border-b border-border hover:bg-inbox-hover cursor-pointer transition-colors group",
                selectedConversation?.id === conversation.id && "bg-inbox-selected border-l-4 border-l-primary ring-1 ring-primary/20",
                !conversation.is_read && selectedConversation?.id !== conversation.id && "border-l-4 border-l-inbox-unread bg-primary-muted/30"
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {conversation.priority === "urgent" && (
                    <Star className="h-4 w-4 text-destructive flex-shrink-0" fill="currentColor" />
                  )}
                  <h3 className={cn(
                    "text-sm truncate",
                    !conversation.is_read ? "font-semibold" : "font-normal"
                  )}>
                    {conversation.subject}
                  </h3>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {conversation.is_read && (
                    <CheckCircle className="h-4 w-4 text-success" aria-label="Read" />
                  )}
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatConversationTime(conversation.received_at || conversation.updated_at)}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchiveConversation(conversation.id);
                        }}
                        disabled={archiveConversationMutation.isPending}
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        {t('dashboard.conversationList.archive')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(conversation.id);
                        }}
                        disabled={deleteConversationMutation.isPending}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('dashboard.conversationList.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs font-normal flex items-center gap-1",
                    (conversation.snooze_until && new Date(conversation.snooze_until) > new Date())
                      ? "bg-warning-muted text-warning"
                      : statusColors[conversation.status]
                  )}
                >
                  {(conversation.snooze_until && new Date(conversation.snooze_until) > new Date()) ? (
                    <>
                      <Clock className="h-3 w-3" />
                      {t('conversation.snoozed')}
                    </>
                  ) : (
                    <>{t(`conversation.${conversation.status}`)}</>
                  )}
                </Badge>
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs font-normal", priorityColors[conversation.priority])}
                >
                  {t(`conversation.${conversation.priority}`)}
                </Badge>
              </div>
              
              <div className="text-xs text-muted-foreground">
                <p>{t('conversation.from')}: {conversation.customer?.full_name || t('conversation.unknown')}</p>
                {conversation.assigned_to && (
                  <p>{t('conversation.assignedTo')}: {conversation.assigned_to.full_name}</p>
                )}
              </div>
            </div>
          ))
          )}
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboard.conversationList.deleteConfirmation')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dashboard.conversationList.deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              {t('dashboard.conversationList.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteConversationMutation.isPending}
            >
              {deleteConversationMutation.isPending ? t('dashboard.conversationList.deleting') : t('dashboard.conversationList.deleteButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};