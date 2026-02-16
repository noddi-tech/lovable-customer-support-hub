import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, ChevronDown, ChevronRight, Bug, BookOpen, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

interface ErrorConversation {
  id: string;
  visitor_phone: string | null;
  visitor_email: string | null;
  tools_used: string[] | null;
  created_at: string;
  primary_intent: string | null;
  summary: string | null;
  status: string;
  error_details: string | null;
  last_message?: string;
  messages?: Array<{ role: string; content: string; created_at: string }>;
}

interface AiErrorTracesProps {
  organizationId: string;
}

const RUNBOOK_ENTRIES = [
  {
    title: 'Recovery call returns 400',
    symptom: 'ReferenceError: marker is not defined / "tool_choice" error',
    fix: 'Ensure `tools` array is included alongside `tool_choice: "none"` in the forced-text recovery call.',
  },
  {
    title: 'patchBookingEdit silent failure',
    symptom: 'Booking edit JSON never patched — placeholder IDs remain',
    fix: 'Verify `const marker = \'[BOOKING_EDIT]\';` is declared at the top of the function.',
  },
  {
    title: 'Loop exhaustion (safety break)',
    symptom: 'AI loops through tool calls without producing a final text response',
    fix: 'Check if the recovery call succeeds. If still failing, increase MAX_TOOL_ROUNDS or check tool response format.',
  },
  {
    title: 'YES/NO rendered as plain text',
    symptom: 'Confirmation question appears without interactive buttons',
    fix: 'Ensure patchYesNo post-processor is applied. Add new patterns for unrecognized question formats.',
  },
  {
    title: 'Time slot selection crash',
    symptom: '"Beklager" message after selecting a delivery window',
    fix: 'Usually caused by recovery call 400. Verify the fix above. Also check that delivery_window_id is correctly passed.',
  },
];

export const AiErrorTraces: React.FC<AiErrorTracesProps> = ({ organizationId }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: errorConversations = [], isLoading, refetch } = useQuery({
    queryKey: ['ai-error-traces', organizationId],
    queryFn: async () => {
      // Get conversations that likely had errors
      const { data: conversations, error } = await supabase
        .from('widget_ai_conversations')
        .select('id, visitor_phone, visitor_email, tools_used, created_at, primary_intent, summary, status, error_details')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      if (!conversations?.length) return [];

      // For each conversation, get the last assistant message to check for fallback
      const conversationIds = conversations.map(c => c.id);
      const { data: messages, error: msgError } = await supabase
        .from('widget_ai_messages')
        .select('conversation_id, role, content, created_at')
        .in('conversation_id', conversationIds)
        .eq('role', 'assistant')
        .order('created_at', { ascending: false });

      if (msgError) throw msgError;

      // Group messages by conversation
      const msgMap = new Map<string, typeof messages>();
      for (const msg of messages || []) {
        if (!msgMap.has(msg.conversation_id)) msgMap.set(msg.conversation_id, []);
        msgMap.get(msg.conversation_id)!.push(msg);
      }

      // Filter to only conversations with error indicators
      const fallbackPhrases = ['Beklager', 'noe gikk galt', 'prøv igjen', 'kontakt oss direkte'];
      const bookingTools = ['get_delivery_windows', 'update_booking', 'get_booking_details', 'lookup_customer'];

      return conversations
        .filter(conv => {
          // Match if error_details exists
          if (conv.error_details) return true;
          // Or if fallback phrases found in messages
          const msgs = msgMap.get(conv.id);
          if (!msgs?.length) return false;
          const lastMsg = msgs[0].content;
          const hasFallback = fallbackPhrases.some(p => lastMsg?.includes(p));
          const hasBookingTools = conv.tools_used?.some((t: string) => bookingTools.includes(t));
          return hasFallback && hasBookingTools;
        })
        .map(conv => ({
          ...conv,
          last_message: msgMap.get(conv.id)?.[0]?.content || '',
        }));
    },
    enabled: !!organizationId,
  });

  const loadMessages = async (conversationId: string) => {
    if (expandedId === conversationId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(conversationId);
  };

  const { data: expandedMessages = [] } = useQuery({
    queryKey: ['ai-error-messages', expandedId],
    queryFn: async () => {
      if (!expandedId) return [];
      const { data, error } = await supabase
        .from('widget_ai_messages')
        .select('role, content, created_at')
        .eq('conversation_id', expandedId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!expandedId,
  });

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 pr-4">
        {/* Error Traces Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bug className="h-4 w-4 text-destructive" />
                  Error Traces
                </CardTitle>
                <CardDescription>
                  Conversations where the booking flow failed and the fallback message was returned
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : errorConversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No error traces found. This is good!</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Visitor</TableHead>
                    <TableHead>Intent</TableHead>
                    <TableHead>Tools Used</TableHead>
                    <TableHead>Last Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errorConversations.map((conv) => (
                    <React.Fragment key={conv.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/80"
                        onClick={() => loadMessages(conv.id)}
                      >
                        <TableCell className="py-2">
                          {expandedId === conv.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="py-2 text-xs whitespace-nowrap">
                          {format(new Date(conv.created_at), 'dd.MM HH:mm')}
                        </TableCell>
                        <TableCell className="py-2 text-xs">
                          {conv.visitor_phone || conv.visitor_email || '—'}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className="text-xs">
                            {conv.primary_intent || 'unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex flex-wrap gap-1">
                            {conv.tools_used?.slice(0, 3).map((tool: string) => (
                              <Badge key={tool} variant="secondary" className="text-[10px]">
                                {tool}
                              </Badge>
                            ))}
                            {(conv.tools_used?.length || 0) > 3 && (
                              <Badge variant="secondary" className="text-[10px]">
                                +{conv.tools_used!.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-xs text-muted-foreground max-w-[200px] truncate">
                          {conv.last_message?.substring(0, 80)}...
                        </TableCell>
                      </TableRow>
                      {expandedId === conv.id && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/30 p-4">
                            {conv.error_details && (() => {
                              let errors: any[] = [];
                              try { errors = JSON.parse(conv.error_details!); } catch { /* ignore */ }
                              return errors.length > 0 ? (
                                <div className="mb-3 space-y-1.5">
                                  <p className="text-xs font-semibold text-destructive">Error Details:</p>
                                  {errors.map((e: any, i: number) => (
                                    <div key={i} className="text-xs rounded bg-destructive/10 border border-destructive/20 p-2">
                                      <Badge variant="destructive" className="text-[10px] mr-2">{e.type}</Badge>
                                      <span className="text-muted-foreground">{e.ts ? format(new Date(e.ts), 'HH:mm:ss') : ''}</span>
                                      <p className="mt-1 whitespace-pre-wrap break-words">{e.detail}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : null;
                            })()}
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                              {expandedMessages.map((msg, i) => (
                                <div
                                  key={i}
                                  className={`text-xs rounded-lg p-2 ${
                                    msg.role === 'assistant'
                                      ? 'bg-primary/10 border border-primary/20'
                                      : msg.role === 'user'
                                      ? 'bg-muted border'
                                      : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                                  }`}
                                >
                                  <span className="font-semibold capitalize">{msg.role}: </span>
                                  <span className="whitespace-pre-wrap break-words">
                                    {msg.content?.substring(0, 500)}
                                    {(msg.content?.length || 0) > 500 && '...'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Runbook */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Runbook: Common Failure Modes
            </CardTitle>
            <CardDescription>
              Quick reference for diagnosing and fixing recurring booking flow errors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {RUNBOOK_ENTRIES.map((entry, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <h4 className="font-medium text-sm">{entry.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="font-medium">Symptom:</span> {entry.symptom}
                  </p>
                  <p className="text-xs mt-1">
                    <span className="font-medium">Fix:</span> {entry.fix}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};
