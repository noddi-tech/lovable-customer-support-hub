import React, { useState } from 'react';
import { ModernLayout } from '@/components/layout/ModernLayout';
import { CallAnalyticsDashboard } from '@/components/dashboard/voice/CallAnalyticsDashboard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { LiveDataIndicator } from '@/components/dashboard/voice/LiveDataIndicator';

export default function VoiceAnalyticsPage() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [isLive, setIsLive] = useState(true);

  return (
    <ModernLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Voice Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Insights and performance metrics for your voice operations
            </p>
          </div>

          <div className="flex items-center gap-2">
            <LiveDataIndicator 
              isLive={isLive} 
              lastUpdated={new Date()}
              onRefresh={() => window.location.reload()}
            />
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3 space-y-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Date Range</p>
                    <p className="text-xs text-muted-foreground">
                      Select a range to filter analytics
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setDateRange({
                          from: new Date(new Date().setDate(new Date().getDate() - 7)),
                          to: new Date(),
                        })
                      }
                    >
                      Last 7 days
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setDateRange({
                          from: new Date(new Date().setDate(new Date().getDate() - 30)),
                          to: new Date(),
                        })
                      }
                    >
                      Last 30 days
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setDateRange({
                          from: new Date(new Date().setDate(new Date().getDate() - 90)),
                          to: new Date(),
                        })
                      }
                    >
                      Last 90 days
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <CallAnalyticsDashboard dateRange={dateRange} />
      </div>
    </ModernLayout>
  );
}
