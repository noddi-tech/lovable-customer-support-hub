import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPortalLayout } from "@/components/admin/AdminPortalLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KnowledgeAnalytics } from "@/components/dashboard/KnowledgeAnalytics";
import { SystemHealthMonitor } from "@/components/dashboard/SystemHealthMonitor";
import { SuggestionPerformance } from "@/components/dashboard/SuggestionPerformance";
import { KnowledgeEntriesManager } from "@/components/dashboard/knowledge/KnowledgeEntriesManager";
import { Brain, Activity, TrendingUp, Database } from "lucide-react";

export default function KnowledgeManagement() {
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (!profile?.organization_id) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <AdminPortalLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
            <Brain className="w-10 h-10" />
            Knowledge Management System
          </h1>
          <p className="text-lg text-muted-foreground">
            Manage your AI-powered knowledge base, track performance, and optimize suggestions
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="entries" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Entries
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              System Health
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <KnowledgeAnalytics organizationId={profile.organization_id} />
            <div className="grid gap-6 md:grid-cols-2">
              <SuggestionPerformance organizationId={profile.organization_id} />
            </div>
          </TabsContent>

          <TabsContent value="entries">
            <KnowledgeEntriesManager organizationId={profile.organization_id} />
          </TabsContent>

          <TabsContent value="performance">
            <SuggestionPerformance organizationId={profile.organization_id} />
          </TabsContent>

          <TabsContent value="health">
            <SystemHealthMonitor organizationId={profile.organization_id} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminPortalLayout>
  );
}
