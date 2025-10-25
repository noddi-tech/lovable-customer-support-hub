import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, TrendingUp, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface KnowledgeQuickStatsProps {
  organizationId: string;
}

export function KnowledgeQuickStats({ organizationId }: KnowledgeQuickStatsProps) {
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ['knowledge-quick-stats', organizationId],
    queryFn: async () => {
      const [entriesResult, trackingResult] = await Promise.all([
        supabase
          .from('knowledge_entries')
          .select('quality_score', { count: 'exact' })
          .eq('organization_id', organizationId),
        supabase
          .from('response_tracking')
          .select('id', { count: 'exact' })
          .eq('organization_id', organizationId)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      const totalEntries = entriesResult.count || 0;
      const avgQuality = entriesResult.data?.length
        ? entriesResult.data.reduce((sum, e) => sum + (e.quality_score || 0), 0) / entriesResult.data.length
        : 0;
      const weeklyUsage = trackingResult.count || 0;

      return { totalEntries, avgQuality, weeklyUsage };
    },
  });

  if (!stats || stats.totalEntries === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Knowledge Base
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Entries</p>
            <p className="text-2xl font-bold">{stats.totalEntries}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Avg Quality</p>
            <p className="text-2xl font-bold">{stats.avgQuality.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">7-Day Uses</p>
            <p className="text-2xl font-bold flex items-center gap-1">
              {stats.weeklyUsage}
              <TrendingUp className="w-4 h-4 text-green-600" />
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate('/admin/knowledge')}
        >
          Manage Knowledge Base
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
