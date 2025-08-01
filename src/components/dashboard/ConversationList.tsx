import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Inbox, Clock, Archive, Star, AlertCircle } from "lucide-react";
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
  low: "bg-gray-100 text-gray-800",
  normal: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

const statusColors = {
  open: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  resolved: "bg-blue-100 text-blue-800",
  closed: "bg-gray-100 text-gray-800",
};

const channelIcons = {
  email: "📧",
  chat: "💬",
  phone: "📞",
  social: "📱",
};

const getTabIcon = (tab: string) => {
  switch (tab) {
    case "inbox":
      return <Inbox className="w-4 h-4" />;
    case "pending":
      return <Clock className="w-4 h-4" />;
    case "archived":
      return <Archive className="w-4 h-4" />;
    case "starred":
      return <Star className="w-4 h-4" />;
    case "urgent":
      return <AlertCircle className="w-4 h-4" />;
    default:
      return <Inbox className="w-4 h-4" />;
  }
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
      channel: "chat",
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
        case "inbox":
          return conversation.status === "open" || conversation.status === "pending";
        case "pending":
          return conversation.status === "pending";
        case "archived":
          return conversation.status === "closed";
        case "starred":
          return false; // Placeholder for starred conversations
        case "urgent":
          return conversation.priority === "urgent";
        default:
          return true;
      }
    })();

    return matchesSearch && matchesStatus && matchesPriority && matchesTab;
  });

  const unreadCount = filteredConversations.filter(c => !c.is_read).length;

  return (
    <div className="flex flex-col h-full">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {getTabIcon(selectedTab || 'inbox')}
              {(selectedTab || 'inbox').charAt(0).toUpperCase() + (selectedTab || 'inbox').slice(1)}
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">{unreadCount}</Badge>
              )}
            </CardTitle>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="relative">
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
                  <SelectValue placeholder="Status" />
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
                  <SelectValue placeholder="Priority" />
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
        </CardHeader>
        
        <CardContent className="flex-1 p-0">
          <div className="space-y-0">
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
                    !conversation.is_read && "border-l-4 border-l-primary"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{channelIcons[conversation.channel]}</span>
                        <h3 className={cn(
                          "text-sm truncate",
                          !conversation.is_read ? "font-semibold" : "font-normal"
                        )}>
                          {conversation.subject}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          variant="secondary" 
                          className={cn("text-xs", statusColors[conversation.status])}
                        >
                          {conversation.status}
                        </Badge>
                        <Badge 
                          variant="secondary" 
                          className={cn("text-xs", priorityColors[conversation.priority])}
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
                    
                    <div className="text-xs text-muted-foreground ml-2">
                      {formatTimeAgo(conversation.updated_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};