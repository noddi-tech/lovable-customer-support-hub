import { Bell, Phone, Settings } from "lucide-react"
import { useState } from "react"
import { VoiceIntegrationsList } from "@/components/admin/VoiceIntegrationsList"
import { NotificationSettings } from "@/components/dashboard/voice/NotificationSettings"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function VoiceSettingsPage() {
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [soundVolume, setSoundVolume] = useState(0.7)
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(true)

  return (
    <div className="space-y-4 p-3 pb-24 sm:space-y-6 sm:p-6 sm:pb-6">
      {/* Header */}
      <div className="flex items-start gap-2">
        <SidebarTrigger className="mt-1 shrink-0 md:hidden" />
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-3xl">Voice Settings</h1>
          <p className="hidden text-muted-foreground mt-1 sm:block">
            Configure your voice system preferences and integrations
          </p>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList className="flex h-auto min-w-0 flex-wrap justify-start gap-1">
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Phone className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="advanced" className="gap-2">
            <Settings className="h-4 w-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Control how and when you receive notifications for voice events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center py-4 sm:py-8">
                <NotificationSettings
                  soundEnabled={soundEnabled}
                  onSoundEnabledChange={setSoundEnabled}
                  soundVolume={soundVolume}
                  onSoundVolumeChange={setSoundVolume}
                  browserNotificationsEnabled={browserNotificationsEnabled}
                  onBrowserNotificationsEnabledChange={setBrowserNotificationsEnabled}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <VoiceIntegrationsList />
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>Configure advanced voice system options</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Advanced settings coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
