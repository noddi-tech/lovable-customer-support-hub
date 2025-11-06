import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Trash2, AlertTriangle, RefreshCw } from 'lucide-react';

interface LargeConversation {
  conversation_id: string;
  subject: string;
  message_count: number;
  inbox_name: string;
  created_at: string;
}

export const ConversationCleanup = () => {
  const [threshold, setThreshold] = useState(1000);
  const queryClient = useQueryClient();
  
  // Find conversations with excessive messages
  const { data: problematicConversations, isLoading, refetch } = useQuery({
    queryKey: ['problematic-conversations', threshold],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('find_large_conversations', {
        message_threshold: threshold
      });
      if (error) throw error;
      return data as LargeConversation[];
    }
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problematic-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['inboxes'] });
      toast.success('Conversation deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete conversation: ' + error.message);
    }
  });

  const handleDeleteConversation = (conversationId: string) => {
    deleteConversationMutation.mutate(conversationId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Conversation Cleanup Tool
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Find and delete conversations with excessive messages that may cause performance issues.
        </p>
        
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Label htmlFor="threshold">Message Threshold</Label>
            <Input
              id="threshold"
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              min={100}
              max={10000}
              step={100}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Find conversations with more than this many messages
            </p>
          </div>
          <Button 
            onClick={() => refetch()} 
            disabled={isLoading}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Scan
          </Button>
        </div>

        {isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            Scanning conversations...
          </div>
        )}

        {!isLoading && problematicConversations && problematicConversations.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No conversations found with more than {threshold} messages. Your database is healthy!
          </div>
        )}

        {!isLoading && problematicConversations && problematicConversations.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">
              Found {problematicConversations.length} conversation(s) with excessive messages
            </p>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {problematicConversations.map((conv) => (
                <div 
                  key={conv.conversation_id} 
                  className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="font-medium truncate">
                      {conv.subject || 'No Subject'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {conv.inbox_name || 'No Inbox'}
                      </Badge>
                      <Badge variant="destructive" className="text-xs">
                        {conv.message_count.toLocaleString()} messages
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(conv.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Large Conversation</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this conversation with {conv.message_count.toLocaleString()} messages?
                          This action cannot be undone and will permanently delete all messages.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDeleteConversation(conv.conversation_id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Delete Conversation
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
