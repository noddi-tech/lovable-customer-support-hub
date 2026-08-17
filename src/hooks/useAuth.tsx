import { useAuth as useSupabaseAuth } from '@/components/auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore, OrganizationMembership } from '@/stores/organizationStore';
import { useEffect, useMemo } from 'react';
import { logger } from '@/utils/logger';
import {
  hasIamAuthorizationGraph,
  isNetworkSuperuser,
} from '@/lib/auth-access';
import { isGoogleAuthUser, isNavioCoreOidcUser } from '@/lib/auth-provision';
import {
  getAllowedLocalOrgIds,
  getEffectiveScope,
  type EffectiveScope,
  type LocalOrganization,
  type LocalDepartment,
  type LocalOrgRole,
} from '@/lib/auth-scope';

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
  email_display_name?: string | null;
  created_at: string;
}

export const useAuth = () => {
  const { user, session, loading, signOut, isProcessingOAuth, navioClaims } = useSupabaseAuth();
  const {
    setMemberships,
    currentOrganizationId,
    clearOrganizationContext,
    setCurrentOrganization,
  } = useOrganizationStore();

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

  // Fetch organization memberships (synced from Navio claims for Navio users)
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

  // Local orgs for claim→UUID mapping (RLS limits non-members; superuser sees mapped set)
  const { data: localOrganizations = [] } = useQuery({
    queryKey: ['organizations-for-scope', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, navio_organization_id');

      if (error) {
        // Column may not exist until migration is applied — fall back without navio id.
        const { data: fallback, error: fbErr } = await supabase
          .from('organizations')
          .select('id, name, slug');
        if (fbErr) {
          logger.error('Organizations for scope failed', { error: fbErr.message }, 'useAuth');
          return [] as LocalOrganization[];
        }
        return (fallback || []).map((o) => ({
          id: o.id,
          name: o.name,
          slug: o.slug,
          navio_organization_id: null as number | null,
        }));
      }

      return ((data || []) as unknown[]).map((row) => {
        const o = row as {
          id: string;
          name: string;
          slug: string | null;
          navio_organization_id?: number | null;
        };
        return {
          id: o.id,
          name: o.name,
          slug: o.slug,
          navio_organization_id: o.navio_organization_id ?? null,
        };
      }) as LocalOrganization[];
    },
    enabled: !!user?.id,
  });

  const { data: localDepartments = [] } = useQuery({
    queryKey: ['departments-for-scope', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, organization_id, slug, navio_department_id');

      if (error) {
        const { data: fallback, error: fbErr } = await supabase
          .from('departments')
          .select('id, name, organization_id');
        if (fbErr) {
          logger.error('Departments for scope failed', { error: fbErr.message }, 'useAuth');
          return [] as LocalDepartment[];
        }
        return (fallback || []).map((d) => ({
          id: d.id,
          name: d.name,
          organization_id: d.organization_id,
          slug: null as string | null,
          navio_department_id: null as number | null,
        }));
      }

      return ((data || []) as unknown[]).map((row) => {
        const d = row as {
          id: string;
          name: string;
          organization_id: string;
          slug?: string | null;
          navio_department_id?: number | null;
        };
        return {
          id: d.id,
          name: d.name,
          organization_id: d.organization_id,
          slug: d.slug ?? null,
          navio_department_id: d.navio_department_id ?? null,
        };
      }) as LocalDepartment[];
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

  const localRoles: LocalOrgRole[] = useMemo(
    () =>
      memberships.map((m) => ({
        user_id: m.user_id,
        organization_id: m.organization_id,
        role: m.role,
      })),
    [memberships]
  );

  const googleEmployee = useMemo(
    () => isGoogleAuthUser(user) && !hasIamAuthorizationGraph(navioClaims),
    [user, navioClaims]
  );

  const networkSuperuser = useMemo(
    () =>
      isNetworkSuperuser(
        navioClaims,
        [
          ...localRoles,
          ...userRoles.map((role) => ({ role, organization_id: null })),
        ],
        googleEmployee
      ),
    [navioClaims, localRoles, userRoles, googleEmployee]
  );

  const effectiveScope: EffectiveScope = useMemo(
    () =>
      getEffectiveScope({
        claims: navioClaims,
        localOrganizations,
        localDepartments,
        localRoles,
        forceSuperuser: networkSuperuser,
      }),
    [navioClaims, localOrganizations, localDepartments, localRoles, networkSuperuser]
  );

  const allowedLocalOrgIds = useMemo(
    () => getAllowedLocalOrgIds(effectiveScope),
    [effectiveScope]
  );

  // Sync memberships to store (membership-scoped only)
  useEffect(() => {
    if (memberships.length > 0) {
      setMemberships(memberships);
    }
  }, [memberships, setMemberships]);

  // Clamp current org to allowed scope when scope loads / changes
  useEffect(() => {
    if (!user?.id) return;

    const hasNavioGraph =
      isNavioCoreOidcUser(user) &&
      (effectiveScope.organizations.length > 0 || effectiveScope.isEmpty);

    if (hasNavioGraph && !effectiveScope.isSuperuser) {
      const allowed = new Set(
        allowedLocalOrgIds.length > 0
          ? allowedLocalOrgIds
          : memberships.map((m) => m.organization_id)
      );

      if (currentOrganizationId && currentOrganizationId !== 'all' && !allowed.has(currentOrganizationId)) {
        const next =
          memberships.find((m) => m.is_default)?.organization_id ||
          [...allowed][0] ||
          null;
        if (next) {
          setCurrentOrganization(next, false);
        } else {
          setCurrentOrganization(null as unknown as string, false);
        }
      } else if (
        (!currentOrganizationId || currentOrganizationId === 'all') &&
        memberships.length > 0
      ) {
        const next =
          memberships.find((m) => m.is_default)?.organization_id ||
          memberships[0]?.organization_id;
        if (next) setCurrentOrganization(next, false);
      }
    }
  }, [
    user,
    effectiveScope,
    allowedLocalOrgIds,
    memberships,
    currentOrganizationId,
    setCurrentOrganization,
  ]);

  // Clear organization context on sign out
  const handleSignOut = async () => {
    clearOrganizationContext();
    await signOut();
  };

  const isSuperAdmin = networkSuperuser || effectiveScope.isSuperuser;
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

    // NIDP membership scope
    navioClaims,
    effectiveScope,
    allowedLocalOrgIds,
    accessibleOrganizations: effectiveScope.organizations,
    accessibleServiceDepartments: effectiveScope.departments,
    isScopeEmpty: effectiveScope.isEmpty && !isSuperAdmin,
    isGoogleEmployee: googleEmployee,
  };
};
