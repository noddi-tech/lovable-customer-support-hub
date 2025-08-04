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

  // Fetch user profile data including role and organization
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

  const userRole: UserRole = profile?.role || 'agent';
  const isAdmin = userRole === 'admin';
  const canManageUsers = isAdmin;
  const canManageIntegrations = isAdmin;

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