import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-responsive';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Phone, 
  PhoneIncoming, 
  PhoneMissed, 
  Voicemail, 
  PhoneCall,
  Calendar,
  BarChart3,
  Settings,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { CallsList } from './CallsList';
import { CallbackRequestsList } from './CallbackRequestsList';
import { VoicemailsList } from './VoicemailsList';
import { CallMetricsCard } from './CallMetricsCard';
import { LiveDataIndicator } from './LiveDataIndicator';
import { AircallConnectionPrompt } from './AircallConnectionPrompt';
import { useNavigate } from 'react-router-dom';
import { useDailyCallMetrics } from '@/hooks/useDailyCallMetrics';
import { useAircallPhone } from '@/hooks/useAircallPhone';
import { useRealtimeConnectionManager } from '@/hooks/useRealtimeConnectionManager';
import { useQueryClient } from '@tanstack/react-query';

export const VoiceDashboard = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('recent');
  const [metricsCollapsed, setMetricsCollapsed] = useState(() => {
    const saved = localStorage.getItem('voiceDashboardMetricsCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  
  const { isInitialized, isConnected, initializePhone, showAircallWorkspace } = useAircallPhone();
  const { isConnected: realtimeConnected, lastConnected } = useRealtimeConnectionManager();
  
  const { metrics, isLoading } = useDailyCallMetrics();

  useEffect(() => {
    localStorage.setItem('voiceDashboardMetricsCollapsed', JSON.stringify(metricsCollapsed));
  }, [metricsCollapsed]);

  const handleLoadPhone = async () => {
    if (!isInitialized) {
      await initializePhone();
    }
    showAircallWorkspace();
  };

  const handleRefresh = () => {
    console.log('[VoiceDashboard] 🔄 Manual refresh triggered');
    queryClient.invalidateQueries({ queryKey: ['calls'] });
    queryClient.invalidateQueries({ queryKey: ['call-events'] });
    queryClient.invalidateQueries({ queryKey: ['callback-requests'] });
    queryClient.invalidateQueries({ queryKey: ['voicemails'] });
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Aircall Connection Prompt */}
      {!isConnected && (
        <AircallConnectionPrompt
          onLoadPhone={handleLoadPhone}
          variant="inline"
          message="Load the Aircall phone system to make and receive calls"
        />
      )}
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <SidebarTrigger className="mt-1 shrink-0 md:hidden" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold sm:text-3xl">Voice Dashboard</h1>
            <p className="hidden text-muted-foreground mt-1 sm:block">
              Manage calls, voicemails, and callbacks in one place
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <LiveDataIndicator 
            isLive={realtimeConnected} 
            lastUpdated={lastConnected || new Date()}
            onRefresh={handleRefresh}
          />
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/voice/analytics')}
            className="h-10 flex-1 gap-2 sm:h-9 sm:flex-none"
          >
            <BarChart3 className="h-4 w-4" />
            View Analytics
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/voice/settings')}
            className="h-10 flex-1 gap-2 sm:h-9 sm:flex-none"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Quick Stats - Collapsible */}
      <Collapsible
        open={!metricsCollapsed}
        onOpenChange={(open) => setMetricsCollapsed(!open)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              Today's Metrics
            </h2>
            {metricsCollapsed && (
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span>{metrics.totalCalls} calls</span>
                <span>•</span>
                <span>{metrics.answerRate}% answered</span>
                <span>•</span>
                <span>{metrics.missedCalls} missed</span>
              </div>
            )}
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              {metricsCollapsed ? (
                <>
                  <span className="text-xs">Show Metrics</span>
                  <ChevronDown className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span className="text-xs">Hide Metrics</span>
                  <ChevronUp className="h-4 w-4" />
                </>
              )}
            </Button>
          </CollapsibleTrigger>
        </div>
        
        <CollapsibleContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-4 pb-2 sm:gap-4">
            <CallMetricsCard
              title="Calls Today"
              value={metrics.totalCalls}
              trend={metrics.callsTrend}
              icon="phone"
              periodLengthDays={1}
            />
            <CallMetricsCard
              title="Avg Duration"
              value={`${metrics.avgDuration}m`}
              trend={metrics.durationTrend}
              icon="clock"
              periodLengthDays={1}
            />
            <CallMetricsCard
              title="Answer Rate"
              value={`${metrics.answerRate}%`}
              trend={metrics.answerRateTrend}
              icon="check"
              variant="success"
              periodLengthDays={1}
            />
            <CallMetricsCard
              title="Missed Today"
              value={metrics.missedCalls}
              trend={metrics.missedTrend}
              icon="x"
              variant="warning"
              periodLengthDays={1}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1">
          <TabsTrigger value="recent" className="gap-1.5 px-1 text-xs sm:gap-2 sm:px-3 sm:text-sm">
            <Phone className="h-4 w-4 shrink-0" />
            <span className="truncate">{isMobile ? 'Recent' : 'Recent Calls'}</span>
          </TabsTrigger>
          <TabsTrigger value="callbacks" className="gap-1.5 px-1 text-xs sm:gap-2 sm:px-3 sm:text-sm">
            <PhoneCall className="h-4 w-4 shrink-0" />
            <span className="truncate">Callbacks</span>
          </TabsTrigger>
          <TabsTrigger value="voicemails" className="gap-1.5 px-1 text-xs sm:gap-2 sm:px-3 sm:text-sm">
            <Voicemail className="h-4 w-4 shrink-0" />
            <span className="truncate">{isMobile ? 'Voicemail' : 'Voicemails'}</span>
          </TabsTrigger>
          <TabsTrigger value="missed" className="gap-1.5 px-1 text-xs sm:gap-2 sm:px-3 sm:text-sm">
            <PhoneMissed className="h-4 w-4 shrink-0" />
            <span className="truncate">Missed</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Recent Calls</CardTitle>
                  <CardDescription>
                    Your latest call activity
                  </CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/voice?view=all-calls')}
                  className="gap-2"
                >
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 sm:pt-0">
              <CallsList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="callbacks" className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Callback Requests</CardTitle>
                  <CardDescription>
                    Customers waiting for a callback
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Schedule New
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 sm:pt-0">
              <CallbackRequestsList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="voicemails" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Voicemails</CardTitle>
              <CardDescription>
                Unread voicemail messages
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 sm:pt-0">
              <VoicemailsList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="missed" className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Missed Calls</CardTitle>
                  <CardDescription>
                    Calls that weren't answered
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  Call Back All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 sm:pt-0">
              <CallsList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate('/voice/analytics')}
            >
              <BarChart3 className="h-6 w-6" />
              <span className="text-sm">View Full Analytics</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate('/voice/settings')}
            >
              <Settings className="h-6 w-6" />
              <span className="text-sm">Configure Settings</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
            >
              <PhoneIncoming className="h-6 w-6" />
              <span className="text-sm">Test Call Flow</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
