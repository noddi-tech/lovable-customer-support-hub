import React from "react"
import { useTranslation } from "react-i18next"
import { AdminPortal } from "@/components/admin/AdminPortal"
import { AdminPortalLayout } from "@/components/admin/AdminPortalLayout"
import { DepartmentManagement } from "@/components/admin/DepartmentManagement"
import { LayoutItem, ResponsiveGrid } from "@/components/admin/design/components/layouts"
import { UnifiedAppLayout } from "@/components/layout/UnifiedAppLayout"
import { AccountInfoCard } from "@/components/settings/AccountInfoCard"
import { LanguageSettings } from "@/components/settings/LanguageSettings"
import { TagManagementSettings } from "@/components/settings/TagManagementSettings"
import { TimezoneSettings } from "@/components/settings/TimezoneSettings"
import { UserNotificationSettings } from "@/components/settings/UserNotificationSettings"
import { UserProfileSettings } from "@/components/settings/UserProfileSettings"
import { useAuth } from "@/hooks/useAuth"
import { usePermissions } from "@/hooks/usePermissions"
import { useLocation, useNavigate } from "@/router/compat"

export default function Settings() {
  const { loading } = useAuth()
  const { hasPermission, isLoading: permissionsLoading } = usePermissions()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const canManageUsers = hasPermission("manage_users")
  const canManageSettings = hasPermission("manage_settings")

  // Determine if we're in admin mode based on the URL path
  const isAdminPath = location.pathname.startsWith("/admin")
  const adminPath = location.pathname.replace("/admin/", "").replace("/admin", "")
  const activeTab = isAdminPath ? adminPath : "general"

  if (loading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">{t("common.loading")}</div>
      </div>
    )
  }

  // Check if we're in admin mode or settings
  const isAdminMode = location.pathname.startsWith("/admin")

  function renderAdminContent() {
    if (location.pathname === "/admin/design/components") {
      const AdminDesignComponents = React.lazy(() => import("./AdminDesignComponents"))
      return (
        <React.Suspense fallback={<div>Loading...</div>}>
          <AdminDesignComponents />
        </React.Suspense>
      )
    }

    if (location.pathname === "/admin/recruitment/import") {
      const RecruitmentImport = React.lazy(
        () => import("@/components/dashboard/recruitment/RecruitmentImport"),
      )
      return (
        <React.Suspense fallback={<div>Loading...</div>}>
          <RecruitmentImport />
        </React.Suspense>
      )
    }

    if (/^\/admin\/recruitment\/templates\/[^/]+/.test(location.pathname)) {
      const OrgTemplateEditorPage = React.lazy(
        () => import("./admin/recruitment/OrgTemplateEditorPage"),
      )
      return (
        <React.Suspense fallback={<div>Loading...</div>}>
          <OrgTemplateEditorPage />
        </React.Suspense>
      )
    }

    if (location.pathname.startsWith("/admin/recruitment")) {
      const RecruitmentAdmin = React.lazy(() => import("./admin/RecruitmentAdmin"))
      return (
        <React.Suspense fallback={<div>Loading...</div>}>
          <RecruitmentAdmin />
        </React.Suspense>
      )
    }

    return <AdminPortal />
  }

  function renderSettingsContent() {
    const path = location.pathname

    switch (path) {
      case "/settings":
      case "/settings/general":
        return (
          <ResponsiveGrid cols={{ sm: "1", lg: "2" }} gap="6">
            <LayoutItem>
              <LanguageSettings />
            </LayoutItem>
            <LayoutItem>
              <TimezoneSettings />
            </LayoutItem>
          </ResponsiveGrid>
        )

      case "/settings/profile":
        return (
          <div className="space-y-4 max-w-4xl">
            <UserProfileSettings />
            <AccountInfoCard />
            <ResponsiveGrid cols={{ sm: "1", lg: "2" }} gap="4">
              <LayoutItem>
                <LanguageSettings />
              </LayoutItem>
              <LayoutItem>
                <TimezoneSettings />
              </LayoutItem>
            </ResponsiveGrid>
          </div>
        )

      case "/settings/notifications":
        return <UserNotificationSettings />

      case "/settings/tags":
        return <TagManagementSettings />

      case "/settings/departments":
        return <DepartmentManagement />

      default:
        return (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Page not found</p>
          </div>
        )
    }
  }

  // Use AdminPortalLayout for admin/super-admin routes
  if (isAdminMode) {
    return <AdminPortalLayout>{renderAdminContent()}</AdminPortalLayout>
  }

  return (
    <UnifiedAppLayout>
      <div className="p-6">{renderSettingsContent()}</div>
    </UnifiedAppLayout>
  )
}
