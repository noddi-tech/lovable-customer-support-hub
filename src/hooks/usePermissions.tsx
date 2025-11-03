import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Permission = 
  | 'manage_users'
  | 'manage_departments' 
  | 'manage_inboxes'
  | 'manage_settings'
  | 'manage_system_settings'
  | 'view_all_conversations'
  | 'view_all_organizations'
  | 'manage_organizations'
  | 'send_emails'
  | 'receive_emails'
  | 'view_system_logs';

export function usePermissions() {
  const { user, isSuperAdmin } = useAuth();

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ["user-permissions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Get user roles first
      const { data: userRoles, error: userRolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      if (userRolesError) throw userRolesError;
      if (!userRoles || userRoles.length === 0) return [];
      
      // Get permissions for those roles
      const roleValues = userRoles.map(ur => ur.role);
      const { data: rolePermissions, error: permissionsError } = await supabase
        .from("role_permissions")
        .select("permission")
        .in("role", roleValues);
      
      if (permissionsError) throw permissionsError;
      
      return rolePermissions?.map(rp => rp.permission) || [];
    },
    enabled: !!user,
  });

  const hasPermission = (permission: Permission) => {
    // Super admins have all permissions
    if (isSuperAdmin) return true;
    return permissions.includes(permission);
  };

  const isAdmin = () => {
    return isSuperAdmin || hasPermission('manage_users');
  };

  return {
    permissions,
    hasPermission,
    isAdmin,
    isLoading,
    isSuperAdmin,
  };
}