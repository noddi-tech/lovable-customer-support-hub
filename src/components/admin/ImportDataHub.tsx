import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpScoutImport } from "./HelpScoutImport";
import { ImportDataCleanup } from "./ImportDataCleanup";
import { DataWipeConfirmation } from "./DataWipeConfirmation";
import { Database, FileText, Mail, Upload } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const ImportDataHub = () => {
  // Get user's organization for wipe tool
  const { data: userOrg } = useQuery({
    queryKey: ['user-organization'],
    queryFn: async () => {
      // Step 1: Get the user's profile with organization_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .single();
      
      if (!profile?.organization_id) return null;
      
      // Step 2: Fetch the organization details separately
      const { data: org } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('id', profile.organization_id)
        .single();
      
      return org;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Data</h1>
        <p className="text-muted-foreground mt-2">
          Import historical conversations and customer data from external platforms
        </p>
      </div>

      <Tabs defaultValue="helpscout" className="space-y-4">
        <TabsList>
          <TabsTrigger value="helpscout" className="gap-2">
            <Mail className="h-4 w-4" />
            HelpScout
          </TabsTrigger>
          <TabsTrigger value="zendesk" disabled className="gap-2">
            <Database className="h-4 w-4" />
            Zendesk
          </TabsTrigger>
          <TabsTrigger value="intercom" disabled className="gap-2">
            <FileText className="h-4 w-4" />
            Intercom
          </TabsTrigger>
          <TabsTrigger value="csv" disabled className="gap-2">
            <Upload className="h-4 w-4" />
            CSV Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="helpscout" className="space-y-4">
          {userOrg && (
            <DataWipeConfirmation 
              organizationId={userOrg.id} 
              organizationName={userOrg.name} 
            />
          )}
          <ImportDataCleanup />
          <HelpScoutImport />
        </TabsContent>

        <TabsContent value="zendesk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Zendesk Import</CardTitle>
              <CardDescription>
                Import tickets and conversations from Zendesk
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Coming soon. This feature will allow you to import historical data from Zendesk.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intercom" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Intercom Import</CardTitle>
              <CardDescription>
                Import conversations and customer data from Intercom
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Coming soon. This feature will allow you to import historical data from Intercom.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="csv" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>CSV Import</CardTitle>
              <CardDescription>
                Import customer data and conversations from CSV files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Coming soon. This feature will allow you to import data via CSV upload.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
