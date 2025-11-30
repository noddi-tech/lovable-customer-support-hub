import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HelpScoutImport } from "./HelpScoutImport";
import { ImportDataCleanup } from "./ImportDataCleanup";
import { DataWipeConfirmation } from "./DataWipeConfirmation";
import { Database, FileText, Mail, Upload, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const ImportDataHub = () => {
  const { isSuperAdmin } = useAuth();
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<{ id: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch organizations - all for super admin, just user's own for regular admin
  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        // Get user's own org first
        const { data: orgId, error: rpcError } = await supabase.rpc('get_user_organization_id');
        
        console.log('[ImportDataHub] RPC result:', { orgId, rpcError, isSuperAdmin });
        
        if (isSuperAdmin) {
          // Super admins can see all organizations
          const { data: orgs, error: orgsError } = await supabase
            .from('organizations')
            .select('id, name')
            .order('name');
          
          console.log('[ImportDataHub] All orgs result:', { orgs, orgsError });
          
          setOrganizations(orgs || []);
          
          // Default to user's own org if available
          if (orgId && orgs) {
            const userOrg = orgs.find(o => o.id === orgId);
            setSelectedOrg(userOrg || orgs[0] || null);
          }
        } else {
          // Regular users only see their own org
          if (!orgId || rpcError) {
            setIsLoading(false);
            return;
          }
          
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id, name')
            .eq('id', orgId)
            .single();
          
          console.log('[ImportDataHub] Org result:', { org, orgError });
          
          if (org) {
            setSelectedOrg(org);
            setOrganizations([org]);
          }
        }
      } catch (error) {
        console.error('[ImportDataHub] Error fetching organizations:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOrganization();
  }, [isSuperAdmin]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Data</h1>
        <p className="text-muted-foreground mt-2">
          Import historical conversations and customer data from external platforms
        </p>
      </div>

      {/* Organization Selector for Super Admins */}
      {isSuperAdmin && organizations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Target Organization
            </CardTitle>
            <CardDescription>
              Select which organization's data to manage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select 
              value={selectedOrg?.id} 
              onValueChange={(id) => {
                const org = organizations.find(o => o.id === id);
                setSelectedOrg(org || null);
              }}
            >
              <SelectTrigger className="w-full md:w-[400px]">
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map(org => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

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
          {selectedOrg && (
            <DataWipeConfirmation 
              organizationId={selectedOrg.id} 
              organizationName={selectedOrg.name} 
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
