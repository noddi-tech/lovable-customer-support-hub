import { useAuth as useSupabaseAuth } from '@/components/auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'agent' | 'user';

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  organization_id: string;
  department_id: string | null;
  is_active: boolean;
}

export const useAuth = () => {
  const { user, session, loading, signOut } = useSupabaseAuth();

  // Fetch user profile data
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data as UserProfile | null;
    },
    enabled: !!user?.id,
  });

  // SECURITY: Fetch user roles from user_roles table (server-side truth)
  const { data: userRoles } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user roles:', error);
        return [];
      }

      return data?.map(r => r.role) || [];
    },
    enabled: !!user?.id,
  });

  // SECURITY: Check permissions using server-validated roles
  const isAdmin = userRoles?.includes('admin') ?? false;
  const canManageUsers = isAdmin;
  const canManageIntegrations = isAdmin;
  
  // Derive role from userRoles (prefer first role, fallback to profile or 'agent')
  const userRole: UserRole = (userRoles?.[0] as UserRole) || profile?.role || 'agent';

  return {
    user,
    session,
    profile,
    loading: loading || profileLoading,
    signOut,
    role: userRole,
    isAdmin,
    canManageUsers,
    canManageIntegrations,
  };
};