import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { EmailForwarding } from '@/components/dashboard/EmailForwarding';
import { AdminPortal } from '@/components/admin/AdminPortal';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Mail, Settings as SettingsIcon, User, Bell, MessageSquare, Camera, Palette } from 'lucide-react';
import { EmailTemplateSettings } from '@/components/settings/EmailTemplateSettings';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto py-4 px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-muted-foreground">Manage your account and preferences</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-6 px-4">
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="inbox" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1">
              <TabsTrigger value="inbox" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Inbox
              </TabsTrigger>
              <TabsTrigger value="general" className="flex items-center gap-2">
                <SettingsIcon className="w-4 h-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="email-templates" className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Email Design
              </TabsTrigger>
              <TabsTrigger value="admin" disabled={!isAdmin} className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Admin
              </TabsTrigger>
            </TabsList>

            {/* Inbox Settings - Main email configuration */}
            <TabsContent value="inbox" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Inbox Configuration
                  </CardTitle>
                  <CardDescription>
                    Manage properties for this inbox and email settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Inbox Name */}
                  <div className="space-y-2">
                    <Label htmlFor="inbox-name">Inbox Name</Label>
                    <Input 
                      id="inbox-name" 
                      defaultValue="Noddi Bedrift" 
                      placeholder="Enter inbox name"
                    />
                  </div>

                  {/* Connected Email Address */}
                  <EmailForwarding />

                  <Separator />

                  {/* Default Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Default Settings</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>From Name</Label>
                        <Input defaultValue="Inbox Name" />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Default Assignee</Label>
                        <Input placeholder="Anyone (if Unassigned)" />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Default Status</Label>
                        <Input defaultValue="Closed" />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch id="auto-bcc" />
                      <Label htmlFor="auto-bcc" className="text-sm">
                        Auto Bcc - Send a copy of all outgoing conversations to a specific external address
                      </Label>
                    </div>
                  </div>

                  <Separator />

                  {/* Signature */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Signature</h3>
                    <p className="text-sm text-muted-foreground">
                      Appended at the end of all outgoing emails
                    </p>
                    <div className="border rounded-md p-3 bg-muted/50">
                      <p className="text-sm">%(mailbox.email%)</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Channels */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Channels</h3>
                    <p className="text-sm text-muted-foreground">
                      Add customer conversations from various channels into your inbox.
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center">
                            <MessageSquare className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium">Messenger from Facebook</h4>
                            <p className="text-sm text-muted-foreground">
                              Link Messenger conversations directly into Help Scout
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">Connect</Button>
                      </div>

                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <Camera className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <h4 className="font-medium">Instagram</h4>
                            <p className="text-sm text-muted-foreground">
                              Route Instagram messages into your Inbox
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">Connect</Button>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Aliases */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Aliases</h3>
                    <p className="text-sm text-muted-foreground">
                      Aliases are other email addresses that forward to your inbox.
                    </p>
                    
                    <div className="flex items-center space-x-2">
                      <Switch id="reply-alias" />
                      <Label htmlFor="reply-alias" className="text-sm">
                        Reply As Alias - Enable this feature if you'd like to reply from one or more of your aliases.
                      </Label>
                    </div>

                    <Button variant="outline" size="sm">
                      + Add
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" className="text-destructive">
                  Delete Inbox
                </Button>
                <Button>Save</Button>
              </div>
            </TabsContent>

            {/* General Settings */}
            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>
                    Basic account and preference settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    General settings will be implemented here.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Profile Settings */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Settings</CardTitle>
                  <CardDescription>
                    Manage your profile information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Profile settings will be implemented here.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notification Settings */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>
                    Configure your notification preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Notification settings will be implemented here.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Email Template Settings */}
            <TabsContent value="email-templates" className="space-y-6">
              <EmailTemplateSettings />
            </TabsContent>

            {/* Admin Portal */}
            <TabsContent value="admin" className="space-y-6">
              {isAdmin ? (
                <AdminPortal />
              ) : (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    You don't have permission to access the Admin Portal. Only administrators can manage organization settings.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}