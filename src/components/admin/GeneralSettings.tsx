import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Save, Palette, Bell, Archive } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export const GeneralSettings = () => {
  const { toast } = useToast();
  const [orgName, setOrgName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [orgDescription, setOrgDescription] = useState('');
  const [retentionDays, setRetentionDays] = useState('365');
  const [archiveDays, setArchiveDays] = useState('30');

  const handleSaveBranding = () => {
    // Save branding settings logic here
    toast({
      title: "Settings saved",
      description: "Organization branding has been updated successfully.",
    });
  };

  const handleSaveDataSettings = () => {
    // Save data management settings logic here
    toast({
      title: "Settings saved",
      description: "Data management settings have been updated successfully.",
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

          <Button className="flex items-center gap-2" onClick={handleSaveBranding}>
            <Save className="w-4 h-4" />
            Save Branding
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

          <Button className="flex items-center gap-2" onClick={handleSaveDataSettings}>
            <Save className="w-4 h-4" />
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};