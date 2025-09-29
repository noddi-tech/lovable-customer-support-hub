import React, { useState } from 'react';
import { GitMerge, AlertCircle, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface ThreadMergerProps {
  inboxId?: string;
  onMergeComplete?: () => void;
}

interface SplitThread {
  threadId: string;
  conversationIds: string[];
  messageCount: number;
  subject: string;
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
      // Fetch conversations with their messages
      let query = supabase
        .from('conversations')
        .select(`
          id,
          subject,
          external_id,
          messages!inner(id, email_message_id, email_thread_id, email_headers)
        `)
        .not('external_id', 'is', null);

      if (inboxId && inboxId !== 'all') {
        query = query.eq('inbox_id', inboxId);
      }

      const { data: conversations, error } = await query;

      if (error) throw error;

      // Group by HelpScout thread pattern (reply-{id1}-{id2})
      const threadGroups = new Map<string, { conversationIds: string[], messageCount: number, subject: string }>();

      conversations?.forEach(conv => {
        // Extract HelpScout pattern from external_id
        const helpScoutPattern = /reply-(\d+)-(\d+)/;
        const match = conv.external_id?.match(helpScoutPattern);
        
        if (match) {
          const threadId = `reply-${match[1]}-${match[2]}`;
          
          if (!threadGroups.has(threadId)) {
            threadGroups.set(threadId, {
              conversationIds: [],
              messageCount: 0,
              subject: conv.subject || 'No subject'
            });
          }
          
          const group = threadGroups.get(threadId)!;
          group.conversationIds.push(conv.id);
          group.messageCount += (conv.messages?.length || 0);
        }
      });

      // Filter to only split threads (multiple conversations)
      const splits: SplitThread[] = [];
      threadGroups.forEach((group, threadId) => {
        if (group.conversationIds.length > 1) {
          splits.push({
            threadId,
            conversationIds: group.conversationIds,
            messageCount: group.messageCount,
            subject: group.subject
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Thread: {thread.threadId.substring(0, 40)}...
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {thread.conversationIds.length} conversations
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {thread.messageCount} messages
                    </Badge>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={selectedThreads.has(thread.threadId)}
                  onChange={() => handleToggleThread(thread.threadId)}
                  className="mt-1"
                  onClick={(e) => e.stopPropagation()}
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
