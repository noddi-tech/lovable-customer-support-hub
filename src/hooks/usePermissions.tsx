import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Permission = 
  | 'manage_users'
  | 'manage_departments' 
  | 'manage_inboxes'
  | 'manage_settings'
  | 'view_all_conversations'
  | 'send_emails'
  | 'receive_emails';

export function usePermissions() {
  const { user } = useAuth();

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ["user-permissions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          role,
          role_permissions!inner(permission)
        `)
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      return data.flatMap(role => 
        role.role_permissions.map(rp => rp.permission)
      ) as Permission[];
    },
    enabled: !!user,
  });

  const hasPermission = (permission: Permission) => {
    return permissions.includes(permission);
  };

  const isAdmin = () => {
    return hasPermission('manage_users');
  };

  return {
    permissions,
    hasPermission,
    isAdmin,
    isLoading
  };
}