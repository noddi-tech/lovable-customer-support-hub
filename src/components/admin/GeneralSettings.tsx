import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Save, Palette, Bell, Wrench, ShieldAlert } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermissions } from '@/hooks/usePermissions';

interface OrganizationWithMetadata {
  id: string;
  name: string;
  metadata?: {
    description?: string;
  };
}

export const GeneralSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
const [orgName, setOrgName] = useState('');
const [orgDescription, setOrgDescription] = useState('');
const [isBackfillOpen, setIsBackfillOpen] = useState(false);
const [runningBackfill, setRunningBackfill] = useState(false);
const { isAdmin } = usePermissions();
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
      // Use metadata for description if available
      const metadata = organization.metadata || {};
      setOrgDescription(metadata.description || '');
    }
  }, [organization]);

  // Mutation for updating organization branding
  const updateBrandingMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const currentMetadata = organization?.metadata || {};
      const { error } = await supabase
        .from('organizations')
        .update({
          name: data.name,
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
      description: orgDescription,
    });
  };

  const handleRunBackfill = async () => {
    setRunningBackfill(true);
    toast({
      title: 'Backfill started',
      description: 'Fixing sender mapping on recent email conversations...'
    });
    try {
      const { data, error } = await supabase.functions.invoke('backfill-sender-fix', {
        body: { limitConversations: 1000, sinceDays: 365, dryRun: false },
      });
      if (error) throw error;
      const { processed = 0, updated = 0, skipped = 0 } = (data as any) || {};
      toast({
        title: 'Backfill completed',
        description: `Processed ${processed}, updated ${updated}, skipped ${skipped}.`
      });
    } catch (error: any) {
      console.error('Backfill failed', error);
      toast({
        title: 'Backfill failed',
        description: error?.message || 'Please check edge function logs.',
        variant: 'destructive',
      });
    } finally {
      setRunningBackfill(false);
      setIsBackfillOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-surface border-border/50 shadow-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Palette className="w-5 h-5" />
            Organization Branding
          </CardTitle>
          <CardDescription>
            Customize your organization's appearance and branding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Label htmlFor="org-description">Description</Label>
            <Textarea 
              id="org-description" 
              placeholder="Organization description..."
              value={orgDescription}
              onChange={(e) => setOrgDescription(e.target.value)}
            />
          </div>

          <Button 
            className="flex items-center gap-2 bg-gradient-primary hover:bg-primary-hover text-primary-foreground shadow-glow" 
            onClick={handleSaveBranding}
            disabled={updateBrandingMutation.isPending || isLoading}
          >
            <Save className="w-4 h-4" />
            {updateBrandingMutation.isPending ? 'Saving...' : 'Save Branding'}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-gradient-surface border-border/50 shadow-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
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

      {isAdmin() && (
        <Card className="bg-gradient-surface border-border/50 shadow-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Wrench className="w-5 h-5" />
              Data Maintenance
            </CardTitle>
            <CardDescription>
              Fix sender mapping for emails forwarded via groups/aliases (e.g., "via Hei").
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This scans recent email conversations and corrects the customer on the first message using Reply-To/X-Original-From.
            </p>
            <AlertDialog open={isBackfillOpen} onOpenChange={setIsBackfillOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={runningBackfill}>
                  <ShieldAlert className="w-4 h-4" />
                  {runningBackfill ? 'Running...' : 'Run Sender Backfill'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Run sender backfill now?</AlertDialogTitle>
                  <AlertDialogDescription>
                    We will process up to 1000 email conversations from the last 365 days and update the linked customer where needed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRunBackfill}>
                    Confirm
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

    </div>
  );
};