import { useAuth as useSupabaseAuth } from '@/components/auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore, OrganizationMembership } from '@/stores/organizationStore';
import { useEffect } from 'react';
import { logger } from '@/utils/logger';

export type UserRole = 'super_admin' | 'admin' | 'agent' | 'user';

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  organization_id: string | null;
  department_id: string | null;
  is_active: boolean;
  avatar_url: string | null;
  created_at: string;
}

export const useAuth = () => {
  const { user, session, loading, signOut, isProcessingOAuth } = useSupabaseAuth();
  const { setMemberships, currentOrganizationId, clearOrganizationContext } = useOrganizationStore();

  // Log when auth state changes
  useEffect(() => {
    logger.debug('useAuth state changed', { 
      hasUser: !!user,
      userId: user?.id,
      email: user?.email,
      loading,
      isProcessingOAuth
    }, 'useAuth');
  }, [user, loading, isProcessingOAuth]);

  // Fetch user profile data
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      logger.debug('Fetching profile', { userId: user?.id }, 'useAuth');
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        logger.error('Profile fetch failed', { error: error.message, userId: user?.id }, 'useAuth');
        return null;
      }

      logger.debug('Profile fetched', { 
        hasProfile: !!data,
        profileId: data?.id,
        organizationId: data?.organization_id
      }, 'useAuth');
      return data as UserProfile | null;
    },
    enabled: !!user?.id,
  });

  // Fetch organization memberships
  const { data: memberships = [], isLoading: membershipsLoading } = useQuery({
    queryKey: ['organization-memberships', user?.id],
    queryFn: async () => {
      logger.debug('Fetching organization memberships', { userId: user?.id }, 'useAuth');
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('organization_memberships')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('is_default', { ascending: false });

      if (error) {
        logger.error('Memberships fetch failed', { error: error.message, userId: user?.id }, 'useAuth');
        return [];
      }

      logger.debug('Memberships fetched', { 
        count: data?.length || 0,
        organizationIds: data?.map(m => m.organization_id) || []
      }, 'useAuth');
      return data as OrganizationMembership[];
    },
    enabled: !!user?.id,
  });

  // SECURITY: Fetch user roles from user_roles table (server-side truth)
  const { data: userRoles = [] } = useQuery({
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

  // Sync memberships to store
  useEffect(() => {
    if (memberships.length > 0) {
      setMemberships(memberships);
    }
  }, [memberships, setMemberships]);

  // Clear organization context on sign out
  const handleSignOut = async () => {
    clearOrganizationContext();
    await signOut();
  };

  // SECURITY: Check permissions using server-validated roles
  const isSuperAdmin = userRoles.includes('super_admin');
  const isAdmin = userRoles.includes('admin') || isSuperAdmin;
  const canManageUsers = isAdmin;
  const canManageIntegrations = isAdmin;
  
  // Derive role from userRoles (prefer super_admin, then admin, then agent)
  const userRole: UserRole = isSuperAdmin ? 'super_admin' : 
                             userRoles.includes('admin') ? 'admin' :
                             userRoles.includes('agent') ? 'agent' : 'user';

  // Get current organization membership
  const currentMembership = memberships.find(m => m.organization_id === currentOrganizationId);

  return {
    user,
    session,
    profile,
    // CRITICAL: Only auth loading blocks route rendering
    loading: loading,
    // OAuth processing state - prevents premature redirects
    isProcessingOAuth,
    // Separate flag for when additional data is still loading
    isDataLoading: profileLoading || membershipsLoading,
    signOut: handleSignOut,
    role: userRole,
    isAdmin,
    isSuperAdmin,
    canManageUsers,
    canManageIntegrations,
    
    // Multi-org support
    memberships,
    currentOrganizationId,
    currentMembership,
    organizationId: currentOrganizationId || profile?.organization_id || null,
  };
};