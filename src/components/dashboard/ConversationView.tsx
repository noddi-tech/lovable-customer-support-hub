import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { 
  MoreHorizontal, 
  Archive, 
  Clock, 
  UserPlus, 
  Star,
  Paperclip,
  Send,
  Smile,
  Bold,
  Italic,
  Link2,
  MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface ConversationViewProps {
  conversationId?: string;
}

// Mock conversation data
const mockConversation = {
  id: '1',
  customer: {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@email.com',
    avatar: '/placeholder-avatar.jpg',
    organization: 'Noddi Customer',
    customerSince: '2023-01-15'
  },
  subject: 'Issue with recent order delivery',
  channel: 'email',
  status: 'open',
  priority: 'high',
  assignee: {
    name: 'John Doe',
    avatar: '/placeholder-avatar.jpg'
  },
  messages: [
    {
      id: '1',
      sender: 'customer',
      content: 'Hi, I ordered a product last week and it still hasn\'t arrived. Could you please check the status of my order #12345? This is quite urgent as I need it for an important meeting tomorrow.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      isInternal: false
    },
    {
      id: '2',
      sender: 'agent',
      content: 'Hi Sarah, thank you for contacting us. I\'m looking into your order #12345 right now. I can see that it was shipped yesterday and should arrive by tomorrow morning. I\'ll send you the tracking information shortly.',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      isInternal: false,
      agentName: 'John Doe'
    },
    {
      id: '3',
      sender: 'agent',
      content: 'Internal note: Customer seems frustrated. Priority order due to business meeting. Follow up if not delivered by tomorrow.',
      timestamp: new Date(Date.now() - 1000 * 60 * 25),
      isInternal: true,
      agentName: 'John Doe'
    }
  ]
};

export const ConversationView: React.FC<ConversationViewProps> = ({ conversationId }) => {
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center space-y-6 max-w-md mx-auto px-4">
          {/* Email Icon */}
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
          
          {/* Empty State Text */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-foreground">No conversation selected</h3>
            <p className="text-muted-foreground">
              Choose a conversation from the list to start viewing messages
            </p>
          </div>
        </div>
      </div>
    );
  }

  const conversation = mockConversation;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Conversation Header */}
      <div className="p-3 md:p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={conversation.customer.avatar} />
              <AvatarFallback>{conversation.customer.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold text-foreground text-sm md:text-base line-clamp-1">{conversation.subject}</h2>
              <div className="flex items-center space-x-2 text-xs md:text-sm text-muted-foreground">
                <span className="truncate">{conversation.customer.name}</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline truncate">{conversation.customer.email}</span>
                <span className="hidden sm:inline">•</span>
                <Badge variant="outline" className="text-xs">
                  {conversation.channel}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 md:space-x-2">
            <Badge variant={conversation.status === 'open' ? 'default' : 'secondary'}>
              {conversation.status}
            </Badge>
            <Badge variant={conversation.priority === 'high' ? 'destructive' : 'secondary'}>
              {conversation.priority}
            </Badge>
            <div className="hidden sm:flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Assign
              </Button>
              <Button variant="outline" size="sm">
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
              <Button variant="outline" size="sm">
                <Clock className="h-4 w-4 mr-2" />
                Snooze
              </Button>
            </div>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-6">
            {conversation.messages.map((message, index) => {
              const showDate = index === 0 || 
                formatDate(message.timestamp) !== formatDate(conversation.messages[index - 1].timestamp);
              
              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="flex items-center justify-center my-6">
                      <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        {formatDate(message.timestamp)}
                      </div>
                    </div>
                  )}
                  
                  <div className={`flex ${message.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-2xl ${message.sender === 'agent' ? 'ml-6 md:ml-12' : 'mr-6 md:mr-12'}`}>
                      {message.isInternal && (
                        <div className="text-xs text-warning mb-1 flex items-center">
                          <Star className="h-3 w-3 mr-1" />
                          Internal Note
                        </div>
                      )}
                      
                      <Card className={`${
                        message.isInternal 
                          ? 'bg-warning-muted border-warning' 
                          : message.sender === 'agent' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-card'
                      }`}>
                        <CardContent className="p-4">
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                            <div className="flex items-center space-x-2">
                              {message.sender === 'agent' && (
                                <>
                                  <Avatar className="h-4 w-4">
                                    <AvatarFallback className="text-xs">
                                      {message.agentName?.[0] || 'A'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs opacity-70">
                                    {message.agentName}
                                  </span>
                                </>
                              )}
                            </div>
                            <span className="text-xs opacity-70">
                              {formatTime(message.timestamp)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reply Area */}
          <div className="border-t border-border bg-card p-3 md:p-4">
            <div className="space-y-3">
              {/* Toolbar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Link2 className="h-4 w-4" />
                  </Button>
                  <Separator orientation="vertical" className="h-4" />
                  <Button variant="ghost" size="sm">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Smile className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button 
                    variant={isInternalNote ? "default" : "ghost"} 
                    size="sm"
                    onClick={() => setIsInternalNote(!isInternalNote)}
                  >
                    Internal Note
                  </Button>
                  <Button variant="outline" size="sm">
                    Templates
                  </Button>
                </div>
              </div>

              {/* Text Area */}
              <div className="relative">
                <Textarea
                  placeholder={isInternalNote ? "Add an internal note..." : "Type your reply..."}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className={`min-h-[100px] resize-none ${
                    isInternalNote ? 'border-warning bg-warning-muted' : ''
                  }`}
                />
              </div>

              {/* Send Button */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {isInternalNote ? 'This note will only be visible to your team' : 'This reply will be sent to the customer'}
                </div>
                <Button 
                  className="bg-gradient-primary hover:bg-primary-hover text-primary-foreground"
                  disabled={!replyText.trim()}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isInternalNote ? 'Add Note' : 'Send Reply'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Info Sidebar - Hidden on mobile */}
        <div className="hidden lg:block w-80 border-l border-border bg-card p-4 overflow-y-auto">
          <div className="space-y-6">
            {/* Customer Details */}
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-foreground">Customer Details</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conversation.customer.avatar} />
                    <AvatarFallback>{conversation.customer.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-medium text-foreground">{conversation.customer.name}</h4>
                    <p className="text-sm text-muted-foreground">{conversation.customer.email}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Organization:</span>
                    <span className="text-foreground">{conversation.customer.organization}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer since:</span>
                    <span className="text-foreground">
                      {new Date(conversation.customer.customerSince).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <Button variant="outline" size="sm" className="w-full">
                  View Full Profile
                </Button>
              </CardContent>
            </Card>

            {/* Previous Conversations */}
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-foreground">Previous Conversations</h3>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground text-center py-4">
                  No previous conversations
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-foreground">Quick Actions</h3>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Star className="h-4 w-4 mr-2" />
                  Mark as Priority
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Archive className="h-4 w-4 mr-2" />
                  Archive Conversation
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Clock className="h-4 w-4 mr-2" />
                  Snooze for Later
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};