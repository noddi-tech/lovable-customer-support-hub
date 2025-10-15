import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Phone, 
  PhoneIncoming, 
  PhoneMissed, 
  Voicemail, 
  PhoneCall,
  Calendar,
  BarChart3,
  Settings,
  ArrowRight
} from 'lucide-react';
import { CallsList } from './CallsList';
import { CallbackRequestsList } from './CallbackRequestsList';
import { VoicemailsList } from './VoicemailsList';
import { CallMetricsCard } from './CallMetricsCard';
import { LiveDataIndicator } from './LiveDataIndicator';
import { useNavigate } from 'react-router-dom';
import { useCallAnalytics } from '@/hooks/useCallAnalytics';
import { subDays } from 'date-fns';

export const VoiceDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('recent');
  
  const { metrics, isLoading } = useCallAnalytics({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Voice Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage calls, voicemails, and callbacks in one place
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <LiveDataIndicator 
            isLive={true} 
            lastUpdated={new Date()}
            onRefresh={() => window.location.reload()}
          />
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/voice/analytics')}
            className="gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            View Analytics
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/voice/settings')}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CallMetricsCard
          title="Recent Calls"
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
          variant="success"
        />
        <CallMetricsCard
          title="Missed Calls"
          value={metrics.missedCalls}
          trend={metrics.missedTrend}
          icon="x"
          variant="warning"
        />
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recent" className="gap-2">
            <Phone className="h-4 w-4" />
            Recent Calls
          </TabsTrigger>
          <TabsTrigger value="callbacks" className="gap-2">
            <PhoneCall className="h-4 w-4" />
            Callbacks
          </TabsTrigger>
          <TabsTrigger value="voicemails" className="gap-2">
            <Voicemail className="h-4 w-4" />
            Voicemails
          </TabsTrigger>
          <TabsTrigger value="missed" className="gap-2">
            <PhoneMissed className="h-4 w-4" />
            Missed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
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
            <CardContent>
              <CallsList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="callbacks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
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
            <CardContent>
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
            <CardContent>
              <VoicemailsList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="missed" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
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
            <CardContent>
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
          <div className="grid gap-3 md:grid-cols-3">
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
