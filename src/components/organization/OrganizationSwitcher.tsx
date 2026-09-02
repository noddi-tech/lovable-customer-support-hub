import { useQuery } from "@tanstack/react-query"
import { Building2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { cn } from "@/lib/utils"
import { useOrganizationStore } from "@/stores/organizationStore"

/**
 * Organization switcher scoped to Navio SO memberships (via local org UUIDs).
 * Non-members never see other orgs; superuser sees all mapped memberships only
 * (no synthetic "All Organizations" dump).
 */
export function OrganizationSwitcher() {
  const { memberships, isSuperAdmin, accessibleOrganizations, isScopeEmpty } = useAuth()
  const { currentOrganizationId, setCurrentOrganization } = useOrganizationStore()

  const membershipOrgIds = memberships.map((m) => m.organization_id)
  const scopeLocalIds = accessibleOrganizations
    .map((o) => o.localId)
    .filter((id): id is string => !!id)

  // Prefer claim-mapped local ids; fall back to membership rows (Google/invite).
  const allowedIds = scopeLocalIds.length > 0 ? scopeLocalIds : membershipOrgIds

  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations-for-switcher", allowedIds, isSuperAdmin],
    queryFn: async () => {
      // Superuser (Google employee / claim superuser / local super_admin): all orgs.
      // Everyone else: membership / Navio SO–mapped ids only.
      let query = supabase.from("organizations").select("id, name, slug").order("name")

      if (isSuperAdmin) {
        // unrestricted
      } else if (allowedIds.length > 0) {
        query = query.in("id", allowedIds)
      } else {
        return []
      }

      const { data, error } = await query
      if (error) {
        console.error("Error fetching organizations:", error)
        return []
      }
      return data || []
    },
    enabled: allowedIds.length > 0 || isSuperAdmin,
  })

  // Hide when only one accessible org
  if (organizations.length <= 1 && !isSuperAdmin) {
    return null
  }

  if (isScopeEmpty && organizations.length === 0) {
    return (
      <div className="px-1.5 py-0 space-y-1">
        <p className="text-[9px] text-muted-foreground uppercase tracking-wide font-medium">
          Organization
        </p>
        <p className="text-[10px] text-destructive">No service organization membership</p>
      </div>
    )
  }

  const getCurrentOrgName = () => {
    if (!currentOrganizationId) {
      return organizations[0]?.name || "Select organization"
    }
    const org = organizations.find((o) => o.id === currentOrganizationId)
    return org?.name || "Select organization"
  }

  const handleOrgChange = (value: string) => {
    setCurrentOrganization(value, isSuperAdmin)
  }

  const selectValue =
    currentOrganizationId && organizations.some((o) => o.id === currentOrganizationId)
      ? currentOrganizationId
      : organizations[0]?.id

  if (!selectValue) return null

  return (
    <div className="px-1.5 py-0 space-y-1">
      <p className="text-[9px] text-muted-foreground uppercase tracking-wide font-medium">
        Organization
      </p>
      <div className="flex items-center gap-1.5">
        <Building2 className="h-3 w-3 text-muted-foreground" />
        <Select value={selectValue} onValueChange={handleOrgChange}>
          <SelectTrigger className={cn("w-[160px] h-7 text-[10px]")}>
            <SelectValue placeholder="Select organization">{getCurrentOrgName()}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                <span className="flex items-center gap-2">
                  <Building2 className="h-3 w-3" />
                  {org.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
