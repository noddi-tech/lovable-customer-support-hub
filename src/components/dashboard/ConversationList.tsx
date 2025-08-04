import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Inbox, Star, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type ConversationStatus = "open" | "pending" | "resolved" | "closed";
type ConversationPriority = "low" | "normal" | "high" | "urgent";
type ConversationChannel = "email" | "chat" | "phone" | "social";

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
  customer?: Customer;
  assigned_to?: AssignedTo;
}

interface ConversationListProps {
  selectedTab: string;
  onSelectConversation: (conversation: Conversation) => void;
  selectedConversation?: Conversation;
}

const priorityColors = {
  low: "bg-gray-100 text-gray-700",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const statusColors = {
  open: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  resolved: "bg-blue-100 text-blue-700",
  closed: "bg-gray-100 text-gray-700",
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

  // Mock data for now - will be replaced with actual data fetching
  const mockConversations: Conversation[] = [
    {
      id: "1",
      subject: "Need help with order #12345",
      status: "open",
      priority: "high",
      is_read: false,
      channel: "email",
      updated_at: new Date(Date.now() - 3600000).toISOString(),
      customer: {
        id: "c1",
        full_name: "John Doe",
        email: "john@example.com",
      },
      assigned_to: {
        id: "a1",
        full_name: "Alice Smith",
        avatar_url: "https://avatar.iran.liara.run/public/1",
      },
    },
    {
      id: "2",
      subject: "Product inquiry",
      status: "pending",
      priority: "normal",
      is_read: true,
      channel: "email",
      updated_at: new Date(Date.now() - 7200000).toISOString(),
      customer: {
        id: "c2",
        full_name: "Jane Wilson",
        email: "jane@example.com",
      },
    },
    {
      id: "3",
      subject: "Urgent: Payment issue",
      status: "open",
      priority: "urgent",
      is_read: false,
      channel: "email",
      updated_at: new Date(Date.now() - 1800000).toISOString(),
      customer: {
        id: "c3",
        full_name: "Bob Johnson",
        email: "bob@example.com",
      },
    },
  ];

  const conversations = mockConversations;

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
        default:
          return true;
      }
    })();

    return matchesSearch && matchesStatus && matchesPriority && matchesTab;
  });

  const unreadCount = filteredConversations.filter(c => !c.is_read).length;

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-background">
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
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Inbox className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No conversations found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => onSelectConversation(conversation)}
              className={cn(
                "p-4 border-b border-border hover:bg-muted/50 cursor-pointer transition-colors",
                selectedConversation?.id === conversation.id && "bg-muted",
                !conversation.is_read && "border-l-4 border-l-blue-500 bg-blue-50/30"
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {conversation.priority === "urgent" && (
                    <Star className="h-4 w-4 text-red-500" fill="currentColor" />
                  )}
                  <h3 className={cn(
                    "text-sm font-medium truncate max-w-64",
                    !conversation.is_read ? "font-semibold" : "font-normal"
                  )}>
                    {conversation.subject}
                  </h3>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                  {formatTimeAgo(conversation.updated_at)}
                </span>
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
    </div>
  );
};