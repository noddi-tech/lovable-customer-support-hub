import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, Trash2, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface InboxWithCount {
  id: string;
  name: string;
  conversation_count: number;
}

export const ImportDataCleanup = () => {
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();
  const [inboxes, setInboxes] = useState<InboxWithCount[]>([]);
  const [sourceInboxId, setSourceInboxId] = useState<string>('');
  const [targetInboxId, setTargetInboxId] = useState<string>('');
  const [isMoving, setIsMoving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [inboxToDelete, setInboxToDelete] = useState<string>('');

  useEffect(() => {
    fetchInboxes();
  }, []);

  const fetchInboxes = async () => {
    const { data: orgId } = await supabase.rpc('get_user_organization_id');
    if (!orgId) return;

    const { data } = await supabase
      .from('inboxes')
      .select('id, name')
      .eq('organization_id', orgId)
      .order('name');

    if (data) {
      // Get conversation counts for each inbox
      const inboxesWithCounts = await Promise.all(
        data.map(async (inbox) => {
          const { count } = await supabase
            .from('conversations')
            .select('*', { count: 'exact', head: true })
            .eq('inbox_id', inbox.id);

          return {
            ...inbox,
            conversation_count: count || 0,
          };
        })
      );

      setInboxes(inboxesWithCounts);
    }
  };

  const handleMoveConversations = async () => {
    if (!sourceInboxId || !targetInboxId) {
      toast({
        title: 'Error',
        description: 'Please select both source and target inboxes',
        variant: 'destructive',
      });
      return;
    }

    if (sourceInboxId === targetInboxId) {
      toast({
        title: 'Error',
        description: 'Source and target inboxes must be different',
        variant: 'destructive',
      });
      return;
    }

    setIsMoving(true);
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ inbox_id: targetInboxId })
        .eq('inbox_id', sourceInboxId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Conversations moved successfully',
      });

      // Refresh inbox counts
      await fetchInboxes();
      setSourceInboxId('');
      setTargetInboxId('');
    } catch (error: any) {
      toast({
        title: 'Failed to Move Conversations',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsMoving(false);
    }
  };

  const handleDeleteInbox = async () => {
    if (!inboxToDelete) {
      toast({
        title: 'Error',
        description: 'Please select an inbox to delete',
        variant: 'destructive',
      });
      return;
    }

    const inbox = inboxes.find((i) => i.id === inboxToDelete);
    if (inbox && inbox.conversation_count > 0) {
      toast({
        title: 'Cannot Delete Inbox',
        description: 'This inbox still has conversations. Move them first.',
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase.from('inboxes').delete().eq('id', inboxToDelete);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Inbox deleted successfully',
      });

      // Refresh inbox list
      await fetchInboxes();
      setInboxToDelete('');
    } catch (error: any) {
      toast({
        title: 'Failed to Delete Inbox',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isSuperAdmin) {
    return null;
  }

  const sourceInbox = inboxes.find((i) => i.id === sourceInboxId);
  const targetInbox = inboxes.find((i) => i.id === targetInboxId);
  const inboxForDeletion = inboxes.find((i) => i.id === inboxToDelete);

  return (
    <Card className="bg-gradient-surface border-border/50 shadow-surface">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <AlertTriangle className="w-5 h-5" />
          Data Cleanup Tools
        </CardTitle>
        <CardDescription>
          Move conversations between inboxes or delete empty inboxes (Super Admin only)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Move Conversations */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm">Move Conversations</h3>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This will move all conversations from the source inbox to the target inbox. This action
              cannot be undone.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium">From Inbox</label>
              <Select value={sourceInboxId} onValueChange={setSourceInboxId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source inbox" />
                </SelectTrigger>
                <SelectContent>
                  {inboxes
                    .filter((i) => i.conversation_count > 0)
                    .map((inbox) => (
                      <SelectItem key={inbox.id} value={inbox.id}>
                        {inbox.name} ({inbox.conversation_count} conversations)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium">To Inbox</label>
              <Select value={targetInboxId} onValueChange={setTargetInboxId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target inbox" />
                </SelectTrigger>
                <SelectContent>
                  {inboxes
                    .filter((i) => i.id !== sourceInboxId)
                    .map((inbox) => (
                      <SelectItem key={inbox.id} value={inbox.id}>
                        {inbox.name} ({inbox.conversation_count} conversations)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {sourceInbox && targetInbox && (
            <Alert className="border-blue-500/50 bg-blue-500/10">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900 dark:text-blue-100">
                This will move <strong>{sourceInbox.conversation_count} conversations</strong> from "
                {sourceInbox.name}" to "{targetInbox.name}"
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleMoveConversations}
            disabled={!sourceInboxId || !targetInboxId || isMoving}
            className="w-full"
          >
            {isMoving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Moving...
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4 mr-2" />
                Move Conversations
              </>
            )}
          </Button>
        </div>

        <div className="border-t pt-6 space-y-4">
          <h3 className="font-medium text-sm">Delete Empty Inbox</h3>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Only empty inboxes (0 conversations) can be deleted. This action cannot be undone.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <label className="text-sm font-medium">Select Inbox to Delete</label>
            <Select value={inboxToDelete} onValueChange={setInboxToDelete}>
              <SelectTrigger>
                <SelectValue placeholder="Select inbox to delete" />
              </SelectTrigger>
              <SelectContent>
                {inboxes.map((inbox) => (
                  <SelectItem key={inbox.id} value={inbox.id} disabled={inbox.conversation_count > 0}>
                    {inbox.name} ({inbox.conversation_count} conversations)
                    {inbox.conversation_count === 0 && ' ✓ Can delete'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {inboxForDeletion && inboxForDeletion.conversation_count > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Cannot delete "{inboxForDeletion.name}" - it has {inboxForDeletion.conversation_count}{' '}
                conversations. Move them first.
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleDeleteInbox}
            disabled={!inboxToDelete || isDeleting || (inboxForDeletion?.conversation_count || 0) > 0}
            variant="destructive"
            className="w-full"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Inbox
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
