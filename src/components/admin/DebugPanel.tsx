import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveGrid, ResponsiveTabs, ResponsiveTabsList, ResponsiveTabsTrigger, ResponsiveTabsContent, LayoutItem } from '@/components/admin/design/components/layouts';
import { AuthContextDebugger } from '@/components/conversations/AuthContextDebugger';
import { SessionDebugPanel } from '@/components/conversations/SessionDebugPanel';
import { SessionHealthMonitor } from '@/components/conversations/SessionHealthMonitor';
import { Bug, Database, Activity } from 'lucide-react';

export const DebugPanel = () => {
  return (
    <ResponsiveGrid cols={{ sm: '1', lg: '2' }} gap="6">
      <LayoutItem className="lg:col-span-2">
        <Card className="bg-gradient-surface border-border/50 shadow-surface">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-primary" />
              <CardTitle>Authentication & Session Diagnostics</CardTitle>
            </div>
            <CardDescription>
              Monitor authentication state, session health, and database connectivity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveTabs defaultValue="context" variant="pills" size="md" equalWidth>
              <ResponsiveTabsList className="w-full mb-6">
                <ResponsiveTabsTrigger value="context">
                  <Bug className="h-4 w-4 mr-2" />
                  Auth Context
                </ResponsiveTabsTrigger>
                <ResponsiveTabsTrigger value="session">
                  <Database className="h-4 w-4 mr-2" />
                  Session Status
                </ResponsiveTabsTrigger>
                <ResponsiveTabsTrigger value="health">
                  <Activity className="h-4 w-4 mr-2" />
                  Session Health
                </ResponsiveTabsTrigger>
              </ResponsiveTabsList>
              
              <ResponsiveTabsContent value="context">
                <AuthContextDebugger />
              </ResponsiveTabsContent>
              
              <ResponsiveTabsContent value="session">
                <div className="flex justify-center">
                  <SessionDebugPanel />
                </div>
              </ResponsiveTabsContent>
              
              <ResponsiveTabsContent value="health">
                <div className="flex justify-center">
                  <SessionHealthMonitor showDetails={true} autoRecover={true} />
                </div>
              </ResponsiveTabsContent>
            </ResponsiveTabs>
          </CardContent>
        </Card>
      </LayoutItem>
    </ResponsiveGrid>
  );
};
