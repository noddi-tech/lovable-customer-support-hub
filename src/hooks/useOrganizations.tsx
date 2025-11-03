import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  sender_display_name: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function useOrganizations() {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all organizations (super admin only)
  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching organizations:', error);
        throw error;
      }

      return data as Organization[];
    },
    enabled: isSuperAdmin,
  });

  // Create organization (super admin only)
  const createOrganization = useMutation({
    mutationFn: async (orgData: {
      name: string;
      slug: string;
      logo_url?: string;
      primary_color?: string;
      sender_display_name?: string;
    }) => {
      if (!isSuperAdmin) {
        throw new Error('Only super admins can create organizations');
      }

      const { data, error } = await supabase
        .from('organizations')
        .insert({
          ...orgData,
          primary_color: orgData.primary_color || '#3B82F6',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Organization created successfully');
    },
    onError: (error) => {
      console.error('Error creating organization:', error);
      toast.error('Failed to create organization');
    },
  });

  // Update organization
  const updateOrganization = useMutation({
    mutationFn: async ({ id, updates }: { 
      id: string; 
      updates: Partial<Organization> 
    }) => {
      const { data, error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Organization updated successfully');
    },
    onError: (error) => {
      console.error('Error updating organization:', error);
      toast.error('Failed to update organization');
    },
  });

  // Add user to organization (super admin only)
  const addUserToOrganization = useMutation({
    mutationFn: async ({
      userId,
      organizationId,
      role = 'user',
    }: {
      userId: string;
      organizationId: string;
      role?: 'admin' | 'agent' | 'user';
    }) => {
      if (!isSuperAdmin) {
        throw new Error('Only super admins can add users to organizations');
      }

      const { data, error } = await supabase
        .from('organization_memberships')
        .insert({
          user_id: userId,
          organization_id: organizationId,
          role,
          status: 'active',
          is_default: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-memberships'] });
      toast.success('User added to organization');
    },
    onError: (error) => {
      console.error('Error adding user to organization:', error);
      toast.error('Failed to add user to organization');
    },
  });

  // Remove user from organization (super admin only)
  const removeUserFromOrganization = useMutation({
    mutationFn: async ({
      userId,
      organizationId,
    }: {
      userId: string;
      organizationId: string;
    }) => {
      if (!isSuperAdmin) {
        throw new Error('Only super admins can remove users from organizations');
      }

      const { error } = await supabase
        .from('organization_memberships')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', organizationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-memberships'] });
      toast.success('User removed from organization');
    },
    onError: (error) => {
      console.error('Error removing user from organization:', error);
      toast.error('Failed to remove user from organization');
    },
  });

  return {
    organizations,
    isLoading,
    createOrganization: createOrganization.mutate,
    updateOrganization: updateOrganization.mutate,
    addUserToOrganization: addUserToOrganization.mutate,
    removeUserFromOrganization: removeUserFromOrganization.mutate,
    isCreating: createOrganization.isPending,
    isUpdating: updateOrganization.isPending,
  };
}
