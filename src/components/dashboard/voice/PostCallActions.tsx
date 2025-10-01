/**
 * PostCallActions Component
 * 
 * Dialog that appears after a call ends, providing quick actions
 * for post-call workflows without leaving the context
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, Mail, CheckSquare, X, Save, Clock, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { Call } from '@/hooks/useCalls';

interface PostCallActionsProps {
  call: Call | null;
  isOpen: boolean;
  onClose: () => void;
}

type ActionType = 'callback' | 'email' | 'task' | 'note' | null;

export const PostCallActions: React.FC<PostCallActionsProps> = ({
  call,
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const [selectedAction, setSelectedAction] = useState<ActionType>(null);
  const [actionContent, setActionContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveAction = async () => {
    if (!call || !actionContent.trim()) return;

    setIsSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.user.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization found');

      switch (selectedAction) {
        case 'note':
          // Save call note
          await supabase.from('call_notes').insert([{
            call_id: call.id,
            content: actionContent.trim(),
            is_private: false,
            created_by_id: user.user.id,
            organization_id: profile.organization_id
          }]);
          toast({ title: 'Note saved successfully' });
          break;

        case 'callback':
          // Create callback event
          await supabase.from('internal_events').insert([{
            organization_id: profile.organization_id,
            event_type: 'callback_requested',
            call_id: call.id,
            customer_phone: call.customer_phone,
            event_data: {
              note: actionContent.trim(),
              requested_at: new Date().toISOString()
            },
            status: 'pending'
          }]);
          toast({ title: 'Callback scheduled' });
          break;

        case 'task':
          // Create notification as task
          await supabase.from('notifications').insert([{
            user_id: user.user.id,
            title: 'Follow-up Task',
            message: actionContent.trim(),
            type: 'info',
            data: {
              call_id: call.id,
              customer_phone: call.customer_phone,
              task_type: 'follow_up'
            }
          }]);
          toast({ title: 'Task created' });
          break;

        case 'email':
          toast({
            title: 'Email draft ready',
            description: 'Opening email composer...',
          });
          // This would integrate with email system
          break;
      }

      setActionContent('');
      setSelectedAction(null);
      onClose();
    } catch (error: any) {
      console.error('Error saving action:', error);
      toast({
        title: 'Failed to save',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    setSelectedAction(null);
    setActionContent('');
    onClose();
  };

  if (!call) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Call Completed - What's Next?
          </DialogTitle>
          <DialogDescription>
            Call with {call.customer_phone} lasted {formatDuration(call.duration_seconds)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Call Summary */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="space-y-1">
              <p className="text-sm font-medium">{call.customer_phone}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {call.direction === 'inbound' ? 'Incoming' : 'Outgoing'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  <Clock className="inline h-3 w-3 mr-1" />
                  {formatDuration(call.duration_seconds)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Selection */}
          {!selectedAction ? (
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => setSelectedAction('note')}
                variant="outline"
                className="h-auto flex-col gap-2 py-4"
              >
                <Save className="h-5 w-5" />
                <span className="text-sm">Add Note</span>
              </Button>
              <Button
                onClick={() => setSelectedAction('callback')}
                variant="outline"
                className="h-auto flex-col gap-2 py-4"
              >
                <Calendar className="h-5 w-5" />
                <span className="text-sm">Schedule Callback</span>
              </Button>
              <Button
                onClick={() => setSelectedAction('task')}
                variant="outline"
                className="h-auto flex-col gap-2 py-4"
              >
                <CheckSquare className="h-5 w-5" />
                <span className="text-sm">Create Task</span>
              </Button>
              <Button
                onClick={() => setSelectedAction('email')}
                variant="outline"
                className="h-auto flex-col gap-2 py-4"
              >
                <Mail className="h-5 w-5" />
                <span className="text-sm">Send Email</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base capitalize">{selectedAction}</Label>
                <Button
                  onClick={() => {
                    setSelectedAction(null);
                    setActionContent('');
                  }}
                  variant="ghost"
                  size="sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                value={actionContent}
                onChange={(e) => setActionContent(e.target.value)}
                placeholder={`Enter ${selectedAction} details...`}
                rows={4}
                className="resize-none"
              />
              <Button
                onClick={handleSaveAction}
                disabled={!actionContent.trim() || isSaving}
                className="w-full"
              >
                {isSaving ? 'Saving...' : `Save ${selectedAction}`}
              </Button>
            </div>
          )}

          {/* Quick Dismiss */}
          <Button
            onClick={handleClose}
            variant="ghost"
            className="w-full"
          >
            Skip for Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
