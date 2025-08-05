import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Save, Palette, Bell, Archive } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface OrganizationWithMetadata {
  id: string;
  name: string;
  primary_color: string;
  metadata?: {
    description?: string;
    retention_days?: string;
    archive_days?: string;
  };
}

export const GeneralSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [orgName, setOrgName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [orgDescription, setOrgDescription] = useState('');
  const [retentionDays, setRetentionDays] = useState('365');
  const [archiveDays, setArchiveDays] = useState('30');

  // Fetch current organization data
  const { data: organization, isLoading } = useQuery<OrganizationWithMetadata | null>({
    queryKey: ['organization'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .maybeSingle();
      
      if (error) throw error;
      return data as OrganizationWithMetadata | null;
    },
  });

  // Load organization data into form fields
  useEffect(() => {
    if (organization) {
      setOrgName(organization.name || '');
      setPrimaryColor(organization.primary_color || '#3B82F6');
      // Use metadata for description and other settings if available
      const metadata = organization.metadata || {};
      setOrgDescription(metadata.description || '');
      setRetentionDays(metadata.retention_days || '365');
      setArchiveDays(metadata.archive_days || '30');
    }
  }, [organization]);

  // Mutation for updating organization branding
  const updateBrandingMutation = useMutation({
    mutationFn: async (data: { name: string; primary_color: string; description: string }) => {
      const currentMetadata = organization?.metadata || {};
      const { error } = await supabase
        .from('organizations')
        .update({
          name: data.name,
          primary_color: data.primary_color,
          metadata: {
            ...currentMetadata,
            description: data.description,
          }
        } as any)
        .eq('id', organization?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast({
        title: "Settings saved",
        description: "Organization branding has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save branding settings. Please try again.",
        variant: "destructive",
      });
      console.error('Error updating branding:', error);
    },
  });

  // Mutation for updating data management settings
  const updateDataSettingsMutation = useMutation({
    mutationFn: async (data: { retention_days: string; archive_days: string }) => {
      const currentMetadata = organization?.metadata || {};
      const { error } = await supabase
        .from('organizations')
        .update({
          metadata: {
            ...currentMetadata,
            retention_days: data.retention_days,
            archive_days: data.archive_days,
          }
        } as any)
        .eq('id', organization?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast({
        title: "Settings saved",
        description: "Data management settings have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save data settings. Please try again.",
        variant: "destructive",
      });
      console.error('Error updating data settings:', error);
    },
  });

  const handleSaveBranding = () => {
    updateBrandingMutation.mutate({
      name: orgName,
      primary_color: primaryColor,
      description: orgDescription,
    });
  };

  const handleSaveDataSettings = () => {
    updateDataSettingsMutation.mutate({
      retention_days: retentionDays,
      archive_days: archiveDays,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Organization Branding
          </CardTitle>
          <CardDescription>
            Customize your organization's appearance and branding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input 
                id="org-name" 
                placeholder="Enter organization name" 
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex gap-2">
                <Input 
                  id="primary-color" 
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                />
                <div className="w-10 h-10 rounded border" style={{ backgroundColor: primaryColor }} />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="org-description">Description</Label>
            <Textarea 
              id="org-description" 
              placeholder="Organization description..."
              value={orgDescription}
              onChange={(e) => setOrgDescription(e.target.value)}
            />
          </div>

          <Button 
            className="flex items-center gap-2" 
            onClick={handleSaveBranding}
            disabled={updateBrandingMutation.isPending || isLoading}
          >
            <Save className="w-4 h-4" />
            {updateBrandingMutation.isPending ? 'Saving...' : 'Save Branding'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Configure organization-wide notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Email Notifications</Label>
              <p className="text-xs text-muted-foreground">Send email alerts for new conversations</p>
            </div>
            <Switch defaultChecked />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Auto-assignment</Label>
              <p className="text-xs text-muted-foreground">Automatically assign conversations to available agents</p>
            </div>
            <Switch defaultChecked />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Response Templates</Label>
              <p className="text-xs text-muted-foreground">Enable suggested responses for common queries</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="w-5 h-5" />
            Data Management
          </CardTitle>
          <CardDescription>
            Configure data retention and archival policies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="retention-days">Conversation Retention (days)</Label>
              <Input 
                id="retention-days" 
                type="number" 
                placeholder="365"
                value={retentionDays}
                onChange={(e) => setRetentionDays(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="archive-days">Auto-archive After (days)</Label>
              <Input 
                id="archive-days" 
                type="number" 
                placeholder="30"
                value={archiveDays}
                onChange={(e) => setArchiveDays(e.target.value)}
              />
            </div>
          </div>

          <Button 
            className="flex items-center gap-2" 
            onClick={handleSaveDataSettings}
            disabled={updateDataSettingsMutation.isPending || isLoading}
          >
            <Save className="w-4 h-4" />
            {updateDataSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};