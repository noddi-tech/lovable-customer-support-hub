import React, { useState } from 'react';
import { GitMerge, AlertCircle, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { extractMessageIds, normalizeSubject, canonicalizeEmail } from '@/lib/emailThreading';

interface ThreadMergerProps {
  inboxId?: string;
  onMergeComplete?: () => void;
}

interface SplitThread {
  threadId: string;
  conversationIds: string[];
  messageCount: number;
  subject: string;
  matchType: 'email-headers' | 'helpscout' | 'subject-participants';
  sampleMessageIds?: string[];
}

export const ThreadMerger: React.FC<ThreadMergerProps> = ({
  inboxId,
  onMergeComplete
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedThreads, setSelectedThreads] = useState<Set<string>>(new Set());

  // Detect split threads
  const { data: splitThreads, isLoading: isDetecting } = useQuery({
    queryKey: ['split-threads', inboxId],
    queryFn: async () => {
      // Fetch ALL conversations with their messages and headers
      let query = supabase
        .from('conversations')
        .select(`
          id,
          subject,
          external_id,
          customer_id,
          created_at,
          customers(email),
          messages(id, email_message_id, email_thread_id, email_headers, email_subject, created_at)
        `)
        .order('created_at', { ascending: true });

      if (inboxId && inboxId !== 'all') {
        query = query.eq('inbox_id', inboxId);
      }

      const { data: conversations, error } = await query;

      if (error) throw error;
      if (!conversations) return [];

      // Build thread groups using multiple strategies
      const threadGroups = new Map<string, { 
        conversationIds: string[], 
        messageCount: number, 
        subject: string,
        matchType: 'email-headers' | 'helpscout' | 'subject-participants',
        sampleMessageIds?: string[]
      }>();

      // Strategy 1: Email header-based threading (Message-ID, In-Reply-To, References)
      const messageIdToConvId = new Map<string, string>();
      const convToMessageIds = new Map<string, Set<string>>();
      const convToReferences = new Map<string, Set<string>>();

      conversations.forEach(conv => {
        const messageIds = new Set<string>();
        const references = new Set<string>();

        conv.messages?.forEach((msg: any) => {
          const threadInfo = extractMessageIds(msg.email_headers);
          
          if (threadInfo.messageId) {
            messageIds.add(threadInfo.messageId);
            messageIdToConvId.set(threadInfo.messageId, conv.id);
          }
          if (threadInfo.inReplyTo) {
            references.add(threadInfo.inReplyTo);
          }
          threadInfo.references.forEach(ref => references.add(ref));
        });

        // Use external_id as fallback Message-ID if it looks like one
        if (conv.external_id && conv.external_id.includes('@') && messageIds.size === 0) {
          messageIds.add(conv.external_id);
          messageIdToConvId.set(conv.external_id, conv.id);
        }

        convToMessageIds.set(conv.id, messageIds);
        convToReferences.set(conv.id, references);
      });

      // Find conversations that reference each other
      const emailThreadGroups = new Map<string, Set<string>>();
      
      conversations.forEach(conv => {
        const convRefs = convToReferences.get(conv.id) || new Set();
        const convMsgIds = convToMessageIds.get(conv.id) || new Set();
        
        let threadRoot = conv.id;
        const relatedConvs = new Set<string>([conv.id]);

        // Find conversations we reply to
        convRefs.forEach(refId => {
          const referencedConvId = messageIdToConvId.get(refId);
          if (referencedConvId && referencedConvId !== conv.id) {
            relatedConvs.add(referencedConvId);
            threadRoot = referencedConvId < threadRoot ? referencedConvId : threadRoot;
          }
        });

        // Find conversations that reply to us
        conversations.forEach(otherConv => {
          if (otherConv.id === conv.id) return;
          const otherRefs = convToReferences.get(otherConv.id) || new Set();
          
          convMsgIds.forEach(msgId => {
            if (otherRefs.has(msgId)) {
              relatedConvs.add(otherConv.id);
              threadRoot = otherConv.id < threadRoot ? otherConv.id : threadRoot;
            }
          });
        });

        if (relatedConvs.size > 1) {
          if (!emailThreadGroups.has(threadRoot)) {
            emailThreadGroups.set(threadRoot, new Set());
          }
          relatedConvs.forEach(id => emailThreadGroups.get(threadRoot)!.add(id));
        }
      });

      // Add email thread groups to results
      emailThreadGroups.forEach((convIds, threadRoot) => {
        if (convIds.size > 1) {
          const firstConv = conversations.find(c => c.id === threadRoot);
          const sampleMessageIds = Array.from(convToMessageIds.get(threadRoot) || []).slice(0, 2);
          
          threadGroups.set(`email-${threadRoot}`, {
            conversationIds: Array.from(convIds),
            messageCount: Array.from(convIds).reduce((sum, id) => {
              const conv = conversations.find(c => c.id === id);
              return sum + (conv?.messages?.length || 0);
            }, 0),
            subject: firstConv?.subject || 'No subject',
            matchType: 'email-headers',
            sampleMessageIds
          });
        }
      });

      // Strategy 2: HelpScout pattern (existing logic)
      conversations.forEach(conv => {
        const helpScoutPattern = /reply-(\d+)-(\d+)/;
        const match = conv.external_id?.match(helpScoutPattern);
        
        if (match) {
          const threadId = `helpscout-${match[1]}-${match[2]}`;
          
          if (!threadGroups.has(threadId)) {
            threadGroups.set(threadId, {
              conversationIds: [],
              messageCount: 0,
              subject: conv.subject || 'No subject',
              matchType: 'helpscout'
            });
          }
          
          const group = threadGroups.get(threadId)!;
          group.conversationIds.push(conv.id);
          group.messageCount += (conv.messages?.length || 0);
        }
      });

      // Strategy 3: Subject + Participants fallback
      const subjectGroups = new Map<string, any[]>();
      
      conversations.forEach(conv => {
        if (!conv.subject) return;
        
        const normalizedSub = normalizeSubject(conv.subject);
        const customerEmail = (conv.customers as any)?.email;
        
        // For empty normalized subjects (like "Re:"), use the original subject
        const groupKey = normalizedSub || conv.subject.toLowerCase();
        
        if (groupKey && customerEmail) {
          const key = `${groupKey}|||${canonicalizeEmail(customerEmail)}`;
          
          if (!subjectGroups.has(key)) {
            subjectGroups.set(key, []);
          }
          subjectGroups.get(key)!.push(conv);
        }
      });

      // Add subject-based groups (within 90 days)
      subjectGroups.forEach((convs, key) => {
        if (convs.length > 1) {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 90);
          
          const recentConvs = convs.filter(c => new Date(c.created_at) >= cutoff);
          
          if (recentConvs.length > 1) {
            const threadId = `subject-${recentConvs[0].id}`;
            const convIds = recentConvs.map(c => c.id);
            
            // Filter out conversations that are already in other groups
            const ungroupedConvIds = convIds.filter(id => 
              !Array.from(threadGroups.values()).some(g => 
                g.conversationIds.includes(id)
              )
            );
            
            // Only create a group if we have 2+ ungrouped conversations
            if (ungroupedConvIds.length > 1) {
              threadGroups.set(threadId, {
                conversationIds: ungroupedConvIds,
                messageCount: ungroupedConvIds.reduce((sum, id) => {
                  const conv = conversations.find(c => c.id === id);
                  return sum + (conv?.messages?.length || 0);
                }, 0),
                subject: recentConvs[0].subject || 'No subject',
                matchType: 'subject-participants'
              });
            }
          }
        }
      });

      // Convert to array format
      const splits: SplitThread[] = [];
      threadGroups.forEach((group, threadId) => {
        if (group.conversationIds.length > 1) {
          splits.push({
            threadId,
            conversationIds: group.conversationIds,
            messageCount: group.messageCount,
            subject: group.subject,
            matchType: group.matchType,
            sampleMessageIds: group.sampleMessageIds
          });
        }
      });

      return splits;
    },
    enabled: true
  });

  // Merge mutation
  const mergeMutation = useMutation({
    mutationFn: async (threads: SplitThread[]) => {
      const results = [];
      
      for (const thread of threads) {
        // Fetch full conversation details
        const { data: conversations, error: fetchError } = await supabase
          .from('conversations')
          .select('*')
          .in('id', thread.conversationIds)
          .order('created_at', { ascending: true });

        if (fetchError || !conversations || conversations.length === 0) {
          throw new Error(`Failed to fetch conversations for thread ${thread.threadId}`);
        }

        // Keep the oldest conversation as primary
        const primaryConversation = conversations[0];
        const duplicateIds = thread.conversationIds.filter(id => id !== primaryConversation.id);

        // Reassign all messages to primary conversation
        const { error: updateError } = await supabase
          .from('messages')
          .update({ conversation_id: primaryConversation.id })
          .in('conversation_id', duplicateIds);

        if (updateError) {
          throw new Error(`Failed to reassign messages: ${updateError.message}`);
        }

        // Update primary conversation's external_id to thread root
        const { error: convUpdateError } = await supabase
          .from('conversations')
          .update({ external_id: thread.threadId })
          .eq('id', primaryConversation.id);

        if (convUpdateError) {
          throw new Error(`Failed to update conversation: ${convUpdateError.message}`);
        }

        // Delete duplicate conversations
        const { error: deleteError } = await supabase
          .from('conversations')
          .delete()
          .in('id', duplicateIds);

        if (deleteError) {
          throw new Error(`Failed to delete duplicates: ${deleteError.message}`);
        }

        results.push({
          threadId: thread.threadId,
          merged: duplicateIds.length,
          primary: primaryConversation.id
        });
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['split-threads'] });
      queryClient.invalidateQueries({ queryKey: ['all-counts'] });
      
      toast({
        title: t('dashboard.mergeSuccess', 'Threads Merged Successfully'),
        description: t('dashboard.mergeSuccessDescription', `Merged ${results.length} split threads into single conversations.`)
      });
      
      setSelectedThreads(new Set());
      onMergeComplete?.();
    },
    onError: (error) => {
      console.error('Merge error:', error);
      toast({
        title: t('dashboard.mergeError', 'Merge Failed'),
        description: t('dashboard.mergeErrorDescription', error instanceof Error ? error.message : 'Failed to merge threads. Please try again.'),
        variant: 'destructive'
      });
    }
  });

  const handleSelectAll = () => {
    if (!splitThreads) return;
    
    if (selectedThreads.size === splitThreads.length) {
      setSelectedThreads(new Set());
    } else {
      setSelectedThreads(new Set(splitThreads.map(t => t.threadId)));
    }
  };

  const handleToggleThread = (threadId: string) => {
    const newSelected = new Set(selectedThreads);
    if (newSelected.has(threadId)) {
      newSelected.delete(threadId);
    } else {
      newSelected.add(threadId);
    }
    setSelectedThreads(newSelected);
  };

  const handleMerge = () => {
    if (!splitThreads || selectedThreads.size === 0) return;
    
    const threadsToMerge = splitThreads.filter(t => selectedThreads.has(t.threadId));
    mergeMutation.mutate(threadsToMerge);
  };

  if (isDetecting) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            {t('dashboard.detectingThreads', 'Detecting split threads...')}
          </span>
        </CardContent>
      </Card>
    );
  }

  if (!splitThreads || splitThreads.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitMerge className="w-5 h-5" />
            {t('dashboard.threadMerger', 'Thread Merger')}
          </CardTitle>
          <CardDescription>
            {t('dashboard.threadMergerDescription', 'Automatically detect and merge split email threads.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Check className="h-4 w-4" />
            <AlertDescription>
              {t('dashboard.noSplitThreads', 'No split threads detected. All conversations are properly threaded!')}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitMerge className="w-5 h-5" />
          {t('dashboard.threadMerger', 'Thread Merger')}
        </CardTitle>
        <CardDescription>
          {t('dashboard.foundSplitThreads', `Found ${splitThreads.length} split thread(s) that can be merged.`)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('dashboard.mergeWarning', 'This will permanently merge conversations. This action cannot be undone.')}
          </AlertDescription>
        </Alert>

        {/* Thread List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {splitThreads.map((thread) => (
            <div
              key={thread.threadId}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedThreads.has(thread.threadId)
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-accent'
              }`}
              onClick={() => handleToggleThread(thread.threadId)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{thread.subject}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge 
                      variant={
                        thread.matchType === 'email-headers' ? 'default' :
                        thread.matchType === 'helpscout' ? 'secondary' : 
                        'outline'
                      }
                      className="text-xs"
                    >
                      {thread.matchType === 'email-headers' ? '✉️ Email headers' :
                       thread.matchType === 'helpscout' ? '🔧 HelpScout' :
                       '📝 Subject + participants'}
                    </Badge>
                  </div>
                  {thread.sampleMessageIds && thread.sampleMessageIds.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      Message-ID: {thread.sampleMessageIds[0].substring(0, 40)}...
                    </p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {thread.conversationIds.length} conversations
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {thread.messageCount} messages
                    </Badge>
                  </div>
                </div>
                <Checkbox
                  checked={selectedThreads.has(thread.threadId)}
                  onCheckedChange={() => handleToggleThread(thread.threadId)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
          >
            {selectedThreads.size === splitThreads.length
              ? t('dashboard.deselectAll', 'Deselect All')
              : t('dashboard.selectAll', 'Select All')}
          </Button>
          
          <Button
            onClick={handleMerge}
            disabled={mergeMutation.isPending || selectedThreads.size === 0}
          >
            {mergeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('dashboard.merging', 'Merging...')}
              </>
            ) : (
              <>
                <GitMerge className="w-4 h-4 mr-2" />
                {t('dashboard.mergeSelected', `Merge ${selectedThreads.size} Thread(s)`)}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
