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
import { UserManagement } from '@/components/admin/UserManagement';
import { InboxManagement } from '@/components/admin/InboxManagement';
import { DepartmentManagement } from '@/components/admin/DepartmentManagement';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Mail, Settings as SettingsIcon, User, Bell, MessageSquare, Camera, Palette, Inbox, Building } from 'lucide-react';
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
          <Tabs defaultValue="inboxes" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-1">
              <TabsTrigger value="inboxes" className="flex items-center gap-2">
                <Inbox className="w-4 h-4" />
                Inboxes
              </TabsTrigger>
              <TabsTrigger value="departments" className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                Departments
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
              <TabsTrigger value="users" disabled={!isAdmin} className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="admin" disabled={!isAdmin} className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Admin
              </TabsTrigger>
            </TabsList>


            {/* Inboxes Management */}
            <TabsContent value="inboxes" className="space-y-6">
              <InboxManagement />
            </TabsContent>

            {/* Departments Management */}
            <TabsContent value="departments" className="space-y-6">
              <DepartmentManagement />
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

            {/* Users Management */}
            <TabsContent value="users" className="space-y-6">
              {isAdmin ? (
                <UserManagement />
              ) : (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    You don't have permission to manage users. Only administrators can manage organization users.
                  </AlertDescription>
                </Alert>
              )}
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