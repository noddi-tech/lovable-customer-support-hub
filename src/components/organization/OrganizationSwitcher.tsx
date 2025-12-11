import { useAuth } from "@/hooks/useAuth";
import { useOrganizationStore } from "@/stores/organizationStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function OrganizationSwitcher() {
  const { memberships, isSuperAdmin } = useAuth();
  const { currentOrganizationId, setCurrentOrganization } = useOrganizationStore();

  // Fetch organization names - Super Admins see ALL organizations
  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations-for-switcher', isSuperAdmin, memberships.map(m => m.organization_id)],
    queryFn: async () => {
      // Super Admins can see ALL organizations
      if (isSuperAdmin) {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, slug')
          .order('name');

        if (error) {
          console.error('Error fetching organizations:', error);
          return [];
        }
        return data || [];
      }

      // Regular users only see their memberships
      if (memberships.length === 0) return [];

      const orgIds = memberships.map(m => m.organization_id);
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .in('id', orgIds);

      if (error) {
        console.error('Error fetching organizations:', error);
        return [];
      }

      return data || [];
    },
    enabled: isSuperAdmin || memberships.length > 0,
  });

  // Don't show switcher if user only has access to one organization (unless Super Admin)
  if (memberships.length <= 1 && !isSuperAdmin) {
    return null;
  }

  const getCurrentOrgName = () => {
    const org = organizations.find(o => o.id === currentOrganizationId);
    return org?.name || 'Select Organization';
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select
        value={currentOrganizationId || undefined}
        onValueChange={(value) => setCurrentOrganization(value, isSuperAdmin)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select organization">
            {getCurrentOrgName()}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              {org.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isSuperAdmin && (
        <span className="text-xs text-muted-foreground px-2 py-1 bg-primary/10 rounded">
          Super Admin
        </span>
      )}
    </div>
  );
}
