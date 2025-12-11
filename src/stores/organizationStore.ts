import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface OrganizationMembership {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'super_admin' | 'admin' | 'agent' | 'user';
  status: 'active' | 'pending' | 'inactive';
  is_default: boolean;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

interface OrganizationStore {
  currentOrganizationId: string | null;
  memberships: OrganizationMembership[];
  isSuperAdminMode: boolean;
  
  setCurrentOrganization: (orgId: string, force?: boolean) => void;
  setMemberships: (memberships: OrganizationMembership[]) => void;
  setSuperAdminMode: (enabled: boolean) => void;
  clearOrganizationContext: () => void;
  
  // Computed helpers
  getCurrentMembership: () => OrganizationMembership | undefined;
  canAccessOrganization: (orgId: string) => boolean;
}

export const useOrganizationStore = create<OrganizationStore>()(
  persist(
    (set, get) => ({
      currentOrganizationId: null,
      memberships: [],
      isSuperAdminMode: false,

      setCurrentOrganization: (orgId, force = false) => {
        const { memberships, isSuperAdminMode } = get();
        const membership = memberships.find(m => m.organization_id === orgId);
        
        // Allow if user is member OR if forced (Super Admin) OR if in super admin mode
        if (membership || force || isSuperAdminMode) {
          set({ currentOrganizationId: orgId });
        } else {
          console.error('Cannot set organization - user is not a member');
        }
      },

      setMemberships: (memberships) => {
        set({ memberships });
        
        // Auto-set current organization if not set
        const { currentOrganizationId } = get();
        if (!currentOrganizationId && memberships.length > 0) {
          // Prefer default membership, otherwise first active
          const defaultMembership = memberships.find(m => m.is_default && m.status === 'active');
          const firstActive = memberships.find(m => m.status === 'active');
          const orgId = defaultMembership?.organization_id || firstActive?.organization_id;
          
          if (orgId) {
            set({ currentOrganizationId: orgId });
          }
        }
      },

      setSuperAdminMode: (enabled) => {
        set({ isSuperAdminMode: enabled });
      },

      clearOrganizationContext: () => {
        set({
          currentOrganizationId: null,
          memberships: [],
          isSuperAdminMode: false,
        });
      },

      // Computed helpers
      getCurrentMembership: () => {
        const { currentOrganizationId, memberships } = get();
        return memberships.find(m => m.organization_id === currentOrganizationId);
      },

      canAccessOrganization: (orgId) => {
        const { memberships, isSuperAdminMode } = get();
        return isSuperAdminMode || memberships.some(
          m => m.organization_id === orgId && m.status === 'active'
        );
      },
    }),
    {
      name: 'organization-context',
      partialize: (state) => ({
        currentOrganizationId: state.currentOrganizationId,
        isSuperAdminMode: state.isSuperAdminMode,
      }),
    }
  )
);
