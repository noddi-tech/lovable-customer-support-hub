import { useAuth } from "@/hooks/useAuth";
import { useOrganizationStore } from "@/stores/organizationStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Globe } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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

  // Determine if we're viewing a filtered (specific org) vs all orgs
  const isFiltered = currentOrganizationId !== null && currentOrganizationId !== 'all';

  const getCurrentOrgName = () => {
    if (!currentOrganizationId || currentOrganizationId === 'all') {
      return 'All Organizations';
    }
    const org = organizations.find(o => o.id === currentOrganizationId);
    return org?.name || 'Select Organization';
  };

  const handleOrgChange = (value: string) => {
    if (value === 'all') {
      // Clear organization filter to show all
      setCurrentOrganization(null as any, isSuperAdmin);
    } else {
      setCurrentOrganization(value, isSuperAdmin);
    }
  };

  return (
    <div className="px-1.5 py-0 space-y-1">
      <p className="text-[9px] text-muted-foreground uppercase tracking-wide font-medium">
        Organization
      </p>
      <div className="flex items-center gap-1.5">
        {isFiltered ? (
          <Building2 className="h-3 w-3 text-amber-500" />
        ) : (
          <Globe className="h-3 w-3 text-muted-foreground" />
        )}
        <Select
          value={currentOrganizationId || 'all'}
          onValueChange={handleOrgChange}
        >
          <SelectTrigger 
            className={cn(
              "w-[160px] h-7 text-[10px]",
              isFiltered && "border-amber-500/50 bg-amber-500/10"
            )}
          >
            <SelectValue placeholder="Select organization">
              {getCurrentOrgName()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {/* All Organizations option - only for Super Admins */}
            {isSuperAdmin && (
              <SelectItem value="all">
                <span className="flex items-center gap-2">
                  <Globe className="h-3 w-3" />
                  All Organizations
                </span>
              </SelectItem>
            )}
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
        {isFiltered && (
          <span className="text-[9px] text-amber-600 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">
            Filtered
          </span>
        )}
        {isSuperAdmin && !isFiltered && (
          <span className="text-[9px] text-muted-foreground px-1.5 py-0.5 bg-primary/10 rounded">
            Super Admin
          </span>
        )}
      </div>
    </div>
  );
}
