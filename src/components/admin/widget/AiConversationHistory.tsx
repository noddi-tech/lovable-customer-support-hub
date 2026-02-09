import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import {
  Bot, User, MessageCircle, Search, ArrowLeft,
  ThumbsUp, ThumbsDown, Phone, Mail, Clock,
  CheckCircle, ArrowRightLeft, XCircle,
} from 'lucide-react';
import { StarRatingInput } from '@/components/ui/star-rating-input';

interface AiConversationHistoryProps {
  organizationId: string | null;
}

interface Conversation {
  id: string;
  visitor_phone: string | null;
  visitor_email: string | null;
  status: string;
  resolved_by_ai: boolean | null;
  message_count: number;
  tools_used: string[] | null;
  primary_intent: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
  escalated_at: string | null;
}

interface Message {
  id: string;
  role: string;
  content: string;
  tools_used: string[] | null;
  feedback_rating: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Active', variant: 'default' },
  ended: { label: 'Ended', variant: 'secondary' },
  escalated: { label: 'Escalated', variant: 'destructive' },
};

export const AiConversationHistory: React.FC<AiConversationHistoryProps> = ({ organizationId }) => {
  const queryClient = useQueryClient();
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const rateMessageMutation = useMutation({
    mutationFn: async ({ messageId, rating }: { messageId: string; rating: 'positive' | 'negative' }) => {
      const { error } = await supabase
        .from('widget_ai_messages')
        .update({ feedback_rating: rating })
        .eq('id', messageId);
      if (error) throw error;

      // Also insert into widget_ai_feedback with admin source
      if (selectedConvoId && organizationId) {
        await supabase.from('widget_ai_feedback').insert({
          message_id: messageId,
          conversation_id: selectedConvoId,
          organization_id: organizationId,
          rating,
          source: 'admin',
        });
      }
    },
    onSuccess: (_, { rating }) => {
      toast.success(`Message rated ${rating}`);
      queryClient.invalidateQueries({ queryKey: ['ai-conversation-messages', selectedConvoId] });
    },
  });

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['ai-conversations', organizationId, statusFilter],
    queryFn: async () => {
      if (!organizationId) return [];
      let query = supabase
        .from('widget_ai_conversations')
        .select('id, visitor_phone, visitor_email, status, resolved_by_ai, message_count, tools_used, primary_intent, summary, created_at, updated_at, escalated_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Conversation[];
    },
    enabled: !!organizationId,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['ai-conversation-messages', selectedConvoId],
    queryFn: async () => {
      if (!selectedConvoId) return [];
      const { data, error } = await supabase
        .from('widget_ai_messages')
        .select('id, role, content, tools_used, feedback_rating, created_at')
        .eq('conversation_id', selectedConvoId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!selectedConvoId,
  });

  const filtered = conversations.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.visitor_phone?.toLowerCase().includes(q) ||
      c.visitor_email?.toLowerCase().includes(q) ||
      c.primary_intent?.toLowerCase().includes(q) ||
      c.summary?.toLowerCase().includes(q)
    );
  });

  const selectedConvo = conversations.find(c => c.id === selectedConvoId);

  if (!organizationId) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">No organization selected</div>;
  }

  return (
    <div className="flex gap-4 h-[600px]">
      {/* Conversation List */}
      <div className={`flex flex-col ${selectedConvoId ? 'w-1/3' : 'w-full'} transition-all`}>
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search phone, email, intent..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="ended">Ended</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1 border rounded-lg">
          {isLoading ? (
            <div className="p-3 space-y-3">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm">
              <Bot className="h-8 w-8 mb-2 opacity-50" />
              No conversations found
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(convo => (
                <button
                  key={convo.id}
                  onClick={() => setSelectedConvoId(convo.id)}
                  className={`w-full p-3 text-left hover:bg-muted/50 transition-colors ${selectedConvoId === convo.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {convo.visitor_phone && <><Phone className="h-3 w-3" />{convo.visitor_phone}</>}
                      {!convo.visitor_phone && convo.visitor_email && <><Mail className="h-3 w-3" />{convo.visitor_email}</>}
                      {!convo.visitor_phone && !convo.visitor_email && <span>Anonymous</span>}
                    </div>
                    <ConvoStatusBadge status={convo.status} resolvedByAi={convo.resolved_by_ai} />
                  </div>
                  <p className="text-sm truncate">{convo.summary || convo.primary_intent || 'No summary'}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <MessageCircle className="h-3 w-3" />{convo.message_count} msgs
                    <Clock className="h-3 w-3 ml-1" />{format(new Date(convo.created_at), 'MMM d, HH:mm')}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Conversation Detail */}
      {selectedConvoId && (
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedConvoId(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-base">Conversation</CardTitle>
                {selectedConvo && <ConvoStatusBadge status={selectedConvo.status} resolvedByAi={selectedConvo.resolved_by_ai} />}
              </div>
              {selectedConvo && (
                <div className="text-xs text-muted-foreground">
                  {format(new Date(selectedConvo.created_at), 'MMM d, yyyy HH:mm')}
                </div>
              )}
            </div>
            {selectedConvo && (
              <div className="flex gap-3 text-xs text-muted-foreground mt-2">
                {selectedConvo.visitor_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{selectedConvo.visitor_phone}</span>}
                {selectedConvo.visitor_email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{selectedConvo.visitor_email}</span>}
                {selectedConvo.tools_used && selectedConvo.tools_used.length > 0 && (
                  <span>Tools: {selectedConvo.tools_used.join(', ')}</span>
                )}
              </div>
            )}
          </CardHeader>

          <ScrollArea className="flex-1 p-4">
            {messagesLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-3/4" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                      <div className="flex items-center gap-1.5 mb-0.5 text-xs text-muted-foreground">
                        {msg.role === 'user' ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                        {msg.role === 'user' ? 'Customer' : 'AI Assistant'}
                        <span className="ml-auto">{format(new Date(msg.created_at), 'HH:mm')}</span>
                      </div>
                      <div className={`rounded-lg p-3 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        {msg.content}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {msg.tools_used && msg.tools_used.length > 0 && (
                          <span className="text-xs text-muted-foreground">🔧 {msg.tools_used.join(', ')}</span>
                        )}
                        {msg.role === 'assistant' && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => rateMessageMutation.mutate({ messageId: msg.id, rating: 'positive' })}
                              className={`p-0.5 rounded hover:bg-muted transition-colors ${msg.feedback_rating === 'positive' ? 'text-green-600' : 'text-muted-foreground/50 hover:text-green-600'}`}
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => rateMessageMutation.mutate({ messageId: msg.id, rating: 'negative' })}
                              className={`p-0.5 rounded hover:bg-muted transition-colors ${msg.feedback_rating === 'negative' ? 'text-red-600' : 'text-muted-foreground/50 hover:text-red-600'}`}
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>
      )}
    </div>
  );
};

const ConvoStatusBadge: React.FC<{ status: string; resolvedByAi: boolean | null }> = ({ status, resolvedByAi }) => {
  if (resolvedByAi) {
    return <Badge variant="outline" className="text-green-600 border-green-600 text-[10px] h-5"><CheckCircle className="h-3 w-3 mr-0.5" />AI Resolved</Badge>;
  }
  if (status === 'escalated') {
    return <Badge variant="destructive" className="text-[10px] h-5"><ArrowRightLeft className="h-3 w-3 mr-0.5" />Escalated</Badge>;
  }
  const config = STATUS_CONFIG[status] || { label: status, variant: 'secondary' as const };
  return <Badge variant={config.variant} className="text-[10px] h-5">{config.label}</Badge>;
};
