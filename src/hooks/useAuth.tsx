import { useAuth as useSupabaseAuth } from '@/components/auth/AuthContext';

export type UserRole = 'admin' | 'user';

export interface UserWithRole {
  id: string;
  email: string;
  role: UserRole;
}

export const useAuth = () => {
  const { user, session, loading, signOut } = useSupabaseAuth();

  // For now, simulate admin role for testing - this will be replaced with actual role fetching
  const userRole: UserRole = 'admin'; // This will be replaced with actual role fetching
  const roleLoading = false;

  const isAdmin = userRole === 'admin';
  const canManageUsers = isAdmin;
  const canManageIntegrations = isAdmin;

  return {
    user,
    session,
    loading: loading || roleLoading,
    signOut,
    role: userRole,
    isAdmin,
    canManageUsers,
    canManageIntegrations,
  };
};