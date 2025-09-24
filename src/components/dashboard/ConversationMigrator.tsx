import React, { useState } from 'react';
import { ArrowRight, Move, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOptimizedCounts } from '@/hooks/useOptimizedCounts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface ConversationMigratorProps {
  sourceInboxId?: string;
  onMigrationComplete?: () => void;
}

export const ConversationMigrator: React.FC<ConversationMigratorProps> = ({
  sourceInboxId,
  onMigrationComplete
}) => {
  const [fromInbox, setFromInbox] = useState(sourceInboxId || '9255819b-e8a5-44e9-bcbd-38ca5445663f');
  const [toInbox, setToInbox] = useState('7641f399-9e93-4005-a35c-ff27114e5f9e');
  const { inboxes } = useOptimizedCounts();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const migrationMutation = useMutation({
    mutationFn: async ({ fromInboxId, toInboxId }: { fromInboxId: string; toInboxId: string }) => {
      // Update conversations from source inbox to target inbox
      const { data, error } = await supabase
        .from('conversations')
        .update({ 
          inbox_id: toInboxId,
          updated_at: new Date().toISOString()
        })
        .eq('inbox_id', fromInboxId)
        .select('id');

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['all-counts'] });
      queryClient.invalidateQueries({ queryKey: ['inbox-counts'] });
      
      toast({
        title: t('dashboard.migrationSuccess', 'Migration Successful'),
        description: t('dashboard.migrationDescription', `Moved ${data?.length || 0} conversations to the target inbox.`)
      });
      
      onMigrationComplete?.();
    },
    onError: (error) => {
      console.error('Migration error:', error);
      toast({
        title: t('dashboard.migrationError', 'Migration Failed'),
        description: t('dashboard.migrationErrorDescription', 'Failed to move conversations. Please try again.'),
        variant: 'destructive'
      });
    }
  });

  const getInboxName = (inboxId: string) => {
    const inbox = inboxes.find(i => i.id === inboxId);
    return inbox?.name || t('dashboard.unknownInbox', 'Unknown Inbox');
  };

  const getInboxColor = (inboxId: string) => {
    const inbox = inboxes.find(i => i.id === inboxId);
    return inbox?.color || '#6B7280';
  };

  const getInboxCount = (inboxId: string) => {
    const inbox = inboxes.find(i => i.id === inboxId);
    return inbox?.conversation_count || 0;
  };

  const handleMigrate = () => {
    if (fromInbox === toInbox) {
      toast({
        title: t('dashboard.migrationSameInbox', 'Same Inbox Selected'),
        description: t('dashboard.migrationSameInboxDescription', 'Please select different source and target inboxes.'),
        variant: 'destructive'
      });
      return;
    }

    migrationMutation.mutate({ fromInboxId: fromInbox, toInboxId: toInbox });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Move className="w-5 h-5" />
          {t('dashboard.conversationMigrator', 'Conversation Migrator')}
        </CardTitle>
        <CardDescription>
          {t('dashboard.migratorDescription', 'Move conversations from one inbox to another. This action cannot be undone.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* From Inbox */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t('dashboard.fromInbox', 'From Inbox')}
          </label>
          <Select value={fromInbox} onValueChange={setFromInbox}>
            <SelectTrigger>
              <SelectValue>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getInboxColor(fromInbox) }}
                  />
                  <span>{getInboxName(fromInbox)}</span>
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {getInboxCount(fromInbox)}
                  </Badge>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {inboxes.map((inbox) => (
                <SelectItem key={inbox.id} value={inbox.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: inbox.color }}
                    />
                    <span>{inbox.name}</span>
                    <Badge variant="secondary" className="text-xs ml-auto">
                      {inbox.conversation_count}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <ArrowRight className="w-5 h-5 text-muted-foreground" />
        </div>

        {/* To Inbox */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t('dashboard.toInbox', 'To Inbox')}
          </label>
          <Select value={toInbox} onValueChange={setToInbox}>
            <SelectTrigger>
              <SelectValue>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getInboxColor(toInbox) }}
                  />
                  <span>{getInboxName(toInbox)}</span>
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {getInboxCount(toInbox)}
                  </Badge>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {inboxes.map((inbox) => (
                <SelectItem key={inbox.id} value={inbox.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: inbox.color }}
                    />
                    <span>{inbox.name}</span>
                    <Badge variant="secondary" className="text-xs ml-auto">
                      {inbox.conversation_count}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Migration Button */}
        <Button 
          onClick={handleMigrate}
          disabled={migrationMutation.isPending || fromInbox === toInbox}
          className="w-full"
        >
          {migrationMutation.isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              {t('dashboard.migrating', 'Migrating...')}
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              {t('dashboard.migrateConversations', 'Migrate Conversations')}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};