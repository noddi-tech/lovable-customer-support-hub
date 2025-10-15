import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileText, Send, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface QuickNoteWidgetProps {
  callId: string;
  onSaved?: () => void;
  className?: string;
}

export const QuickNoteWidget = ({ callId, onSaved, className }: QuickNoteWidgetProps) => {
  const [note, setNote] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const quickTemplates = [
    '✅ Issue resolved',
    '📞 Callback needed',
    '📧 Follow-up required',
    '❓ More info needed',
    '⭐ VIP customer',
  ];

  const handleSave = async () => {
    if (!note.trim()) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      await supabase.from('call_notes').insert({
        call_id: callId,
        content: note.trim(),
        organization_id: profile.organization_id,
        created_by_id: user.id,
      });

      toast({
        title: 'Note saved',
        description: 'Your note has been added to the call.',
      });

      setNote('');
      setIsExpanded(false);
      onSaved?.();
    } catch (error) {
      console.error('Error saving note:', error);
      toast({
        title: 'Error',
        description: 'Failed to save note. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isExpanded) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(true)}
        className={cn("gap-2", className)}
      >
        <FileText className="h-4 w-4" />
        Quick Note
      </Button>
    );
  }

  return (
    <Card className={cn("border-primary/20 shadow-sm", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Quick Note
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          placeholder="Add a quick note about this call..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="min-h-[80px] resize-none"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSave();
            }
          }}
        />
        
        <div className="flex flex-wrap gap-1">
          {quickTemplates.map((template) => (
            <Badge
              key={template}
              variant="outline"
              className="cursor-pointer hover:bg-accent text-xs"
              onClick={() => setNote(note ? `${note}\n${template}` : template)}
            >
              {template}
            </Badge>
          ))}
        </div>

        <div className="flex justify-between items-center pt-1">
          <div className="text-xs text-muted-foreground">
            Cmd/Ctrl + Enter to save
          </div>
          <Button
            onClick={handleSave}
            disabled={!note.trim() || isSaving}
            size="sm"
            className="gap-2"
          >
            <Send className="h-3 w-3" />
            {isSaving ? 'Saving...' : 'Save Note'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
