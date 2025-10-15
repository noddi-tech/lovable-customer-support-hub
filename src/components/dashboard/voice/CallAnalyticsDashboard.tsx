import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CallMetricsCard } from './CallMetricsCard';
import { CallVolumeChart } from './CallVolumeChart';
import { AgentPerformanceTable } from './AgentPerformanceTable';
import { useCallAnalytics } from '@/hooks/useCallAnalytics';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CallAnalyticsDashboardProps {
  dateRange?: { from: Date; to: Date };
}

export const CallAnalyticsDashboard = ({ dateRange }: CallAnalyticsDashboardProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();
  const { metrics, volumeData, agentStats, isLoading, refetch } = useCallAnalytics(dateRange);

  const handleExport = () => {
    toast({
      title: 'Export started',
      description: 'Your analytics report will be downloaded shortly.',
    });
    // Export logic would go here
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Call Analytics</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <CallMetricsCard
              title="Total Calls"
              value={metrics.totalCalls}
              trend={metrics.callsTrend}
              icon="phone"
            />
            <CallMetricsCard
              title="Avg Duration"
              value={`${metrics.avgDuration}m`}
              trend={metrics.durationTrend}
              icon="clock"
            />
            <CallMetricsCard
              title="Answer Rate"
              value={`${metrics.answerRate}%`}
              trend={metrics.answerRateTrend}
              icon="check"
            />
            <CallMetricsCard
              title="Missed Calls"
              value={metrics.missedCalls}
              trend={metrics.missedTrend}
              icon="x"
              variant="warning"
            />
          </div>

          <CallVolumeChart data={volumeData} />
        </TabsContent>

        <TabsContent value="agents" className="space-y-6">
          <AgentPerformanceTable data={agentStats} />
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Call Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <CallVolumeChart data={volumeData} showTrends />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
