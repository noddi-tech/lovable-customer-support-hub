import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Lightbulb, CheckCircle, Eye, AlertTriangle, TrendingUp } from 'lucide-react';

interface KnowledgeGapDetectionProps {
  organizationId: string | null;
}

interface KnowledgeGap {
  id: string;
  question: string;
  frequency: number;
  status: string;
  created_at: string;
  last_seen_at: string;
}

export const KnowledgeGapDetection: React.FC<KnowledgeGapDetectionProps> = ({ organizationId }) => {
  const queryClient = useQueryClient();

  const { data: gaps = [], isLoading } = useQuery({
    queryKey: ['knowledge-gaps', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('knowledge_gaps')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'open')
        .order('frequency', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as KnowledgeGap[];
    },
    enabled: !!organizationId,
  });

  const dismissMutation = useMutation({
    mutationFn: async (gapId: string) => {
      const { error } = await supabase
        .from('knowledge_gaps')
        .update({ status: 'dismissed', updated_at: new Date().toISOString() })
        .eq('id', gapId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-gaps'] });
      toast.success('Gap dismissed');
    },
  });

  if (!organizationId) return null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Knowledge Gaps</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-32 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Knowledge Gaps
            </CardTitle>
            <CardDescription>Questions the AI couldn't answer from the knowledge base</CardDescription>
          </div>
          {gaps.length > 0 && (
            <Badge variant="outline" className="text-amber-600 border-amber-600">
              {gaps.length} open
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {gaps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
            <CheckCircle className="h-8 w-8 mb-2 text-green-500 opacity-60" />
            No knowledge gaps detected
            <p className="text-xs mt-1">Your knowledge base is covering customer questions well</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {gaps.map(gap => (
                <div key={gap.id} className="flex items-start justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium">{gap.question}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Asked {gap.frequency}x
                      </span>
                      <span>Last: {format(new Date(gap.last_seen_at), 'MMM d')}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => dismissMutation.mutate(gap.id)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
