import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAuditLog } from './useAuditLog';
import { toast } from 'sonner';

export type AppRole = 'super_admin' | 'admin' | 'agent' | 'user';

export function useUserManagement() {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  // Fetch user roles
  const getUserRoles = (userId: string) => {
    return useQuery({
      queryKey: ['user-roles', userId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('user_roles')
          .select('id, role, created_at')
          .eq('user_id', userId);

        if (error) throw error;
        return data || [];
      },
      enabled: !!userId && isSuperAdmin,
    });
  };

  // Assign role to user
  const assignRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      if (!isSuperAdmin) {
        throw new Error('Only super admins can assign roles');
      }

      const { data, error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables) => {
      // Fetch user email for audit log
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', variables.userId)
        .single();

      // Log audit action
      try {
        await logAction(
          'user.role.assign',
          'role',
          variables.userId,
          profile?.email || variables.userId,
          { role: variables.role, assigned: true }
        );
      } catch (error) {
        console.error('Failed to log audit action:', error);
      }

      // Force immediate refetch to prevent stale data
      await queryClient.invalidateQueries({ queryKey: ['user-roles'], refetchType: 'all' });
      await queryClient.invalidateQueries({ queryKey: ['all-users'], refetchType: 'all' });
      toast.success('Role assigned successfully');
    },
    onError: (error: any) => {
      console.error('Error assigning role:', error);
      toast.error(error.message || 'Failed to assign role');
    },
  });

  // Remove role from user
  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      if (!isSuperAdmin) {
        throw new Error('Only super admins can remove roles');
      }

      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;
    },
    onSuccess: async (data, variables) => {
      // Fetch user email for audit log
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', variables.userId)
        .single();

      // Log audit action
      try {
        await logAction(
          'user.role.remove',
          'role',
          variables.userId,
          profile?.email || variables.userId,
          { role: variables.role, removed: true }
        );
      } catch (error) {
        console.error('Failed to log audit action:', error);
      }

      // Force immediate refetch to prevent stale data
      await queryClient.invalidateQueries({ queryKey: ['user-roles'], refetchType: 'all' });
      await queryClient.invalidateQueries({ queryKey: ['all-users'], refetchType: 'all' });
      toast.success('Role removed successfully');
    },
    onError: (error: any) => {
      console.error('Error removing role:', error);
      toast.error(error.message || 'Failed to remove role');
    },
  });

  // Update user profile
  const updateUser = useMutation({
    mutationFn: async ({
      userId,
      updates,
    }: {
      userId: string;
      updates: { full_name?: string; email?: string };
    }) => {
      if (!isSuperAdmin) {
        throw new Error('Only super admins can update users');
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables) => {
      // Log audit action
      try {
        await logAction(
          'user.update',
          'user',
          variables.userId,
          data.email || variables.userId,
          { updates: variables.updates }
        );
      } catch (error) {
        console.error('Failed to log audit action:', error);
      }

      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('User updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Failed to update user');
    },
  });

  // Delete user (cascade deletes handled by database)
  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      if (!isSuperAdmin) {
        throw new Error('Only super admins can delete users');
      }

      // Delete from profiles (triggers cascade to auth.users via database triggers)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Admin API call to delete from auth.users
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      
      if (authError) {
        console.error('Error deleting from auth:', authError);
        // Don't throw - profile is already deleted
      }

      return userId;
    },
    onSuccess: async (userId) => {
      // Log audit action
      try {
        await logAction(
          'user.delete',
          'user',
          userId,
          userId,
          { deleted: true }
        );
      } catch (error) {
        console.error('Failed to log audit action:', error);
      }

      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['organization-memberships'] });
      toast.success('User deleted successfully');
    },
    onError: (error: any) => {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    },
  });

  // Update organization membership role
  const updateMembershipRole = useMutation({
    mutationFn: async ({
      userId,
      organizationId,
      role,
    }: {
      userId: string;
      organizationId: string;
      role: 'admin' | 'agent' | 'user';
    }) => {
      if (!isSuperAdmin) {
        throw new Error('Only super admins can update membership roles');
      }

      const { data, error } = await supabase
        .from('organization_memberships')
        .update({ role })
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables) => {
      // Fetch user email and organization name for audit log
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', variables.userId)
        .single();

      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', variables.organizationId)
        .single();

      // Log audit action
      try {
        await logAction(
          'org.member.role.update',
          'user',
          variables.userId,
          profile?.email || variables.userId,
          { 
            organizationId: variables.organizationId,
            organizationName: org?.name,
            newRole: variables.role 
          },
          variables.organizationId
        );
      } catch (error) {
        console.error('Failed to log audit action:', error);
      }

      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      queryClient.invalidateQueries({ queryKey: ['organization-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      toast.success('Membership role updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating membership role:', error);
      toast.error(error.message || 'Failed to update membership role');
    },
  });

  // Resend invite email to user who hasn't logged in
  const resendInvite = useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.functions.invoke('resend-user-invite', {
        body: { email }
      });

      if (error) {
        const errorMessage = error.context?.body?.error || error.message || 'Failed to send invite';
        throw new Error(errorMessage);
      }
      
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to send invite');
      }

      return data;
    },
    onSuccess: () => {
      toast.success('Invite email sent successfully');
    },
    onError: (error: any) => {
      console.error('Error sending invite:', error);
      toast.error(error.message || 'Failed to send invite');
    },
  });

  return {
    getUserRoles,
    assignRole: assignRole.mutate,
    removeRole: removeRole.mutate,
    updateUser: updateUser.mutate,
    deleteUser: deleteUser.mutate,
    updateMembershipRole: updateMembershipRole.mutate,
    resendInvite: resendInvite.mutate,
    isAssigningRole: assignRole.isPending,
    isRemovingRole: removeRole.isPending,
    isUpdatingUser: updateUser.isPending,
    isDeletingUser: deleteUser.isPending,
    isUpdatingMembership: updateMembershipRole.isPending,
    isResendingInvite: resendInvite.isPending,
  };
}
