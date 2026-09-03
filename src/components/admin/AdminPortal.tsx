import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  LayoutItem,
  ResponsiveGrid,
  ResponsiveTabs,
  ResponsiveTabsContent,
  ResponsiveTabsList,
  ResponsiveTabsTrigger,
} from "@/components/admin/design/components/layouts"
import { EmailTemplateSettings } from "@/components/settings/EmailTemplateSettings"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Link, useLocation } from "@/router/compat"
import { AdminDashboard } from "./AdminDashboard"
import { AiChatbotSettings as AiChatbotSettingsContent } from "./AiChatbotSettings"
import { ComponentConfigurationPanel } from "./ComponentConfigurationPanel"
import { DepartmentManagement } from "./DepartmentManagement"
import { DesignLibrary } from "./DesignLibrary"
import { EdgeFunctionsOverview } from "./EdgeFunctionsOverview"
import { FeatureFlagsSettings } from "./FeatureFlagsSettings"
import { GeneralSettings } from "./GeneralSettings"
import { InboxManagement } from "./InboxManagement"
import { InboxSettingsPage } from "./InboxSettingsPage"
import { IntegrationSettings } from "./IntegrationSettings"
import { SystemHealthPage } from "./SystemHealthPage"
import { UserManagement } from "./UserManagement"
import { WidgetSettings } from "./widget"

export const AdminPortal = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const [isWizardOpen, setIsWizardOpen] = useState(false)

  // Extract the admin path to determine which content to show
  const pathParts = location.pathname.split("/").filter(Boolean)
  const adminPath = pathParts.length > 1 ? pathParts[1] : ""

  const renderContent = () => {
    switch (adminPath) {
      case "users":
        return (
          <ResponsiveGrid cols={{ sm: "1", lg: "2" }} gap="6" className="h-full">
            <LayoutItem className="lg:col-span-2">
              <ResponsiveTabs defaultValue="user-list" variant="pills" size="md" equalWidth>
                <ResponsiveTabsList className="w-full">
                  <ResponsiveTabsTrigger value="user-list">Users</ResponsiveTabsTrigger>
                  <ResponsiveTabsTrigger value="departments">Departments</ResponsiveTabsTrigger>
                </ResponsiveTabsList>
                <ResponsiveTabsContent value="user-list">
                  <UserManagement />
                </ResponsiveTabsContent>
                <ResponsiveTabsContent value="departments">
                  <DepartmentManagement />
                </ResponsiveTabsContent>
              </ResponsiveTabs>
            </LayoutItem>
          </ResponsiveGrid>
        )

      case "inboxes":
        return pathParts[2] ? <InboxSettingsPage inboxId={pathParts[2]} /> : <InboxManagement />

      case "integrations":
        return <IntegrationSettings />

      case "feature-flags":
        return <FeatureFlagsSettings />

      case "health":
        return <SystemHealthPage />

      case "edge-functions":
        return <EdgeFunctionsOverview />

      case "voice":
        // Redirect to integrations tab
        return (
          <Card className="bg-gradient-surface border-border/50 shadow-surface">
            <CardHeader>
              <CardTitle>Voice settings moved</CardTitle>
              <CardDescription>
                Voice integrations are now under Integrations & Routing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                All voice and phone configurations have been consolidated under the new Integrations
                & Routing section.
              </p>
              <Link to="/admin/integrations" className="text-primary hover:underline">
                Go to Integrations & Routing →
              </Link>
            </CardContent>
          </Card>
        )

      case "design":
        return (
          <ResponsiveGrid cols={{ sm: "1", md: "2", lg: "4" }} gap="6">
            <LayoutItem className="md:col-span-2 lg:col-span-4">
              <ResponsiveTabs defaultValue="email-branding" variant="pills" size="md" equalWidth>
                <ResponsiveTabsList className="w-full">
                  <ResponsiveTabsTrigger value="email-branding">
                    Email Signature & Branding
                  </ResponsiveTabsTrigger>
                  <ResponsiveTabsTrigger value="library">Design Library</ResponsiveTabsTrigger>
                  <ResponsiveTabsTrigger value="components">Components</ResponsiveTabsTrigger>
                </ResponsiveTabsList>
                <ResponsiveTabsContent value="email-branding">
                  <EmailTemplateSettings />
                </ResponsiveTabsContent>
                <ResponsiveTabsContent value="library">
                  <DesignLibrary />
                </ResponsiveTabsContent>
                <ResponsiveTabsContent value="components">
                  <ComponentConfigurationPanel />
                </ResponsiveTabsContent>
              </ResponsiveTabs>
            </LayoutItem>
          </ResponsiveGrid>
        )

      case "general":
        return <GeneralSettings />

      case "widget":
        return <WidgetSettings />

      case "ai-chatbot":
        return <AiChatbotSettingsContent />

      default:
        return <AdminDashboard />
    }
  }

  return <div className="h-full px-4 md:px-6 lg:px-8 py-6">{renderContent()}</div>
}
