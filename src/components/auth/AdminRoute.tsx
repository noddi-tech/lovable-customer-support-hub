import { usePermissions } from "@/hooks/usePermissions"
import { isPreviewBypassEnabled } from "@/lib/dev-preview-auth"
import { Navigate } from "@/router/compat"

interface AdminRouteProps {
  children: React.ReactNode
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAdmin, isLoading } = usePermissions()

  // Dev-only preview bypass: let the shell render without a session.
  if (isPreviewBypassEnabled()) return <>{children}</>

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!isAdmin()) {
    return <Navigate to="/settings/general" replace />
  }

  return <>{children}</>
}
