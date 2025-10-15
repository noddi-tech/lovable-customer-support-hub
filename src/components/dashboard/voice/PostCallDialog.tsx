import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Clock, Calendar, CheckCircle, FileText, Send } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Call {
  id: string;
  customer_phone?: string;
  customer_id?: string;
  direction: 'inbound' | 'outbound';
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  status: string;
  customer?: {
    full_name?: string;
    email?: string;
  };
}

interface PostCallDialogProps {
  call: Call | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PostCallDialog = ({ call, isOpen, onClose }: PostCallDialogProps) => {
  const [activeTab, setActiveTab] = useState<'note' | 'callback' | 'email'>('note');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  if (!call) return null;

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSave = async () => {
    if (!content.trim()) {
      toast({
        title: 'Content required',
        description: 'Please enter some content before saving.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      if (activeTab === 'note') {
        await supabase.from('call_notes').insert({
          call_id: call.id,
          content: content.trim(),
          organization_id: profile.organization_id,
          created_by_id: user.id,
        });

        toast({
          title: 'Note saved',
          description: 'Your call note has been saved successfully.',
        });
      } else if (activeTab === 'callback') {
        await supabase.from('internal_events').insert({
          organization_id: profile.organization_id,
          event_type: 'callback_scheduled',
          call_id: call.id,
          customer_phone: call.customer_phone,
          event_data: { note: content.trim() },
          status: 'pending',
        });

        toast({
          title: 'Callback scheduled',
          description: 'Callback has been added to your tasks.',
        });
      } else if (activeTab === 'email') {
        toast({
          title: 'Email draft created',
          description: 'Email draft has been prepared.',
        });
      }

      setContent('');
      onClose();
    } catch (error) {
      console.error('Error saving post-call action:', error);
      toast({
        title: 'Error',
        description: 'Failed to save. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    setContent('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Call Completed
          </DialogTitle>
          <DialogDescription>
            Quick actions and notes for this call
          </DialogDescription>
        </DialogHeader>

        {/* Call Summary */}
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {call.customer?.full_name || call.customer_phone || 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {call.direction === 'inbound' ? 'Incoming' : 'Outgoing'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{formatDuration(call.duration_seconds)}</p>
                  <p className="text-xs text-muted-foreground">Duration</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{format(new Date(call.started_at), 'p')}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(call.started_at), 'PP')}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="note" className="gap-2">
              <FileText className="h-4 w-4" />
              Note
            </TabsTrigger>
            <TabsTrigger value="callback" className="gap-2">
              <Phone className="h-4 w-4" />
              Callback
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-2">
              <Send className="h-4 w-4" />
              Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="note" className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Add notes about this call for future reference
            </div>
            <Textarea
              placeholder="What happened during the call? Any important details to remember..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-none"
              autoFocus
            />
            <div className="flex gap-2">
              <Badge variant="outline" className="cursor-pointer" onClick={() => setContent(content + '\n- ')}>
                + Bullet point
              </Badge>
              <Badge variant="outline" className="cursor-pointer" onClick={() => setContent(content + '\n[ ] ')}>
                + Task
              </Badge>
            </div>
          </TabsContent>

          <TabsContent value="callback" className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Schedule a follow-up call with this customer
            </div>
            <Textarea
              placeholder="When should we call back? What should we discuss?..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-none"
              autoFocus
            />
          </TabsContent>

          <TabsContent value="email" className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Draft a follow-up email to this customer
            </div>
            <Textarea
              placeholder="Hi [Customer Name],

Thanks for speaking with me today. Here's a summary of what we discussed..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-none"
              autoFocus
            />
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-between items-center pt-2">
          <Button variant="ghost" onClick={handleSkip} disabled={isLoading}>
            Skip for Now
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Saving...' : `Save ${activeTab === 'note' ? 'Note' : activeTab === 'callback' ? 'Callback' : 'Draft'}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
