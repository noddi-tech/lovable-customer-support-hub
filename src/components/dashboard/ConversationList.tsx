import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Filter, Inbox, Star, Clock, MoreHorizontal, Archive, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  channel: ConversationChannel;
  updated_at: string;
  inbox_id?: string;
  customer?: Customer;
  assigned_to?: AssignedTo;
}

interface ConversationListProps {
  selectedTab: string;
  onSelectConversation: (conversation: Conversation) => void;
  selectedConversation?: Conversation;
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

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
};

export const ConversationList = ({ selectedTab, onSelectConversation, selectedConversation }: ConversationListProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();

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

  const filteredConversations = conversations.filter((conversation) => {
    const matchesSearch = conversation.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.customer?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.customer?.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || conversation.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || conversation.priority === priorityFilter;
    
    const matchesTab = (() => {
      switch (selectedTab) {
        case "all":
          return true;
        case "unread":
          return !conversation.is_read;
        case "assigned":
          return !!conversation.assigned_to;
        case "archived":
          return conversation.status === "closed";
        case "snoozed":
          return false; // Placeholder for snoozed conversations
        case "email":
          return conversation.channel === "email";
        case "facebook":
          return conversation.channel === "facebook";
        case "instagram":
          return conversation.channel === "instagram";
        case "whatsapp":
          return conversation.channel === "whatsapp";
        default:
          // Handle inbox-specific filtering
          if (selectedTab.startsWith('inbox-')) {
            const inboxId = selectedTab.replace('inbox-', '');
            return conversation.inbox_id === inboxId;
          }
          return true;
      }
    })();

    return matchesSearch && matchesStatus && matchesPriority && matchesTab;
  });

  const unreadCount = filteredConversations.filter(c => !c.is_read).length;

  return (
    <div className="flex-1 flex flex-col bg-gradient-surface">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card/80 backdrop-blur-sm shadow-surface">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            <h2 className="font-semibold text-lg">Inbox</h2>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 px-2 text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50 animate-spin" />
            <p>Loading conversations...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Inbox className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No conversations found</p>
            <p className="text-sm">Send an email to {`joachim@noddi.no`} to create your first conversation</p>
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
                "p-4 border-b border-border hover:bg-accent/50 cursor-pointer transition-colors group",
                selectedConversation?.id === conversation.id && "bg-accent",
                !conversation.is_read && "border-l-4 border-l-primary bg-primary-muted/30"
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
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimeAgo(conversation.updated_at)}
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
                        Archive
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
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs font-normal", statusColors[conversation.status])}
                >
                  {conversation.status}
                </Badge>
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs font-normal", priorityColors[conversation.priority])}
                >
                  {conversation.priority}
                </Badge>
              </div>
              
              <div className="text-xs text-muted-foreground">
                <p>From: {conversation.customer?.full_name || "Unknown"}</p>
                {conversation.assigned_to && (
                  <p>Assigned to: {conversation.assigned_to.full_name}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone and will permanently delete all messages in this conversation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteConversationMutation.isPending}
            >
              {deleteConversationMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};