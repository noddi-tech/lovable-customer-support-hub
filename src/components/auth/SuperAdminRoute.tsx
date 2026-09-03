import { Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { isPreviewBypassEnabled } from "@/lib/dev-preview-auth"
import { Navigate } from "@/router/compat"

interface SuperAdminRouteProps {
  children: React.ReactNode
}

export const SuperAdminRoute: React.FC<SuperAdminRouteProps> = ({ children }) => {
  const { isSuperAdmin, loading } = useAuth()

  // Dev-only preview bypass: let the shell render without a session.
  if (isPreviewBypassEnabled()) return <>{children}</>

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
