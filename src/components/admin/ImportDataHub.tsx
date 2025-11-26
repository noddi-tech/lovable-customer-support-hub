import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpScoutImport } from "./HelpScoutImport";
import { ImportDataCleanup } from "./ImportDataCleanup";
import { Database, FileText, Mail, Upload } from "lucide-react";

export const ImportDataHub = () => {
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
