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
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
            {t('admin.organizationBranding')}
          </CardTitle>
          <CardDescription>
            {t('admin.customizeAppearance')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">{t('admin.organizationName')}</Label>
            <Input 
              id="org-name" 
              placeholder={t('admin.enterOrgName')} 
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="org-description">{t('admin.description')}</Label>
            <Textarea 
              id="org-description" 
              placeholder={t('admin.orgDescription')}
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
            {updateBrandingMutation.isPending ? t('admin.saving') : t('admin.saveBranding')}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-gradient-surface border-border/50 shadow-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Bell className="w-5 h-5" />
            {t('admin.notificationSettings')}
          </CardTitle>
          <CardDescription>
            {t('admin.configureNotifications')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">{t('admin.emailNotifications')}</Label>
              <p className="text-xs text-muted-foreground">{t('admin.sendEmailAlerts')}</p>
            </div>
            <Switch defaultChecked />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">{t('admin.autoAssignment')}</Label>
              <p className="text-xs text-muted-foreground">{t('admin.automaticallyAssign')}</p>
            </div>
            <Switch defaultChecked />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">{t('admin.responseTemplates')}</Label>
              <p className="text-xs text-muted-foreground">{t('admin.enableSuggested')}</p>
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
              {t('admin.dataMaintenance')}
            </CardTitle>
            <CardDescription>
              {t('admin.fixSenderMapping')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('admin.scanRecent')}
            </p>
            <AlertDialog open={isBackfillOpen} onOpenChange={setIsBackfillOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={runningBackfill}>
                  <ShieldAlert className="w-4 h-4" />
                  {runningBackfill ? t('admin.running') : t('admin.runSenderBackfill')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('admin.runSenderBackfillTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('admin.runSenderBackfillDescription')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRunBackfill}>
                    {t('admin.confirm')}
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