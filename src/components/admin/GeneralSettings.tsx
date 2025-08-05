import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Save, Palette, Bell } from 'lucide-react';
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
  };
}

export const GeneralSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [orgName, setOrgName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [orgDescription, setOrgDescription] = useState('');

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
      // Use metadata for description if available
      const metadata = organization.metadata || {};
      setOrgDescription(metadata.description || '');
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


  const handleSaveBranding = () => {
    updateBrandingMutation.mutate({
      name: orgName,
      primary_color: primaryColor,
      description: orgDescription,
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

    </div>
  );
};