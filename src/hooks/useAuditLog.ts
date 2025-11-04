import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AuditAction = 
  | 'user.role.assign'
  | 'user.role.remove'
  | 'user.update'
  | 'user.delete'
  | 'user.create'
  | 'org.create'
  | 'org.update'
  | 'org.delete'
  | 'org.member.add'
  | 'org.member.remove'
  | 'org.member.role.update'
  | 'bulk.users.import'
  | 'bulk.users.export'
  | 'bulk.roles.assign';

export type AuditTargetType = 'user' | 'organization' | 'role' | 'setting';

export function useAuditLog() {
  const { user, role } = useAuth();

  const logAction = async (
    actionType: AuditAction,
    targetType: AuditTargetType,
    targetId: string,
    targetIdentifier: string,
    changes: Record<string, any>,
    organizationId?: string
  ) => {
    try {
      if (!user?.id || !user?.email) {
        console.warn('Cannot log audit action: No authenticated user');
        return;
      }

      const actionCategory = actionType.split('.')[0] + '_management';
      
      const { error } = await supabase.from('admin_audit_logs').insert({
        actor_id: user.id,
        actor_email: user.email,
        actor_role: role || 'unknown',
        action_type: actionType,
        action_category: actionCategory,
        target_type: targetType,
        target_id: targetId,
        target_identifier: targetIdentifier,
        changes,
        organization_id: organizationId || null,
        metadata: {
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
        }
      });

      if (error) {
        console.error('Failed to log audit action:', error);
      }
    } catch (error) {
      console.error('Failed to log audit action:', error);
      // Don't throw - audit logging should never break functionality
    }
  };

  const logBulkAction = async (
    actionType: AuditAction,
    targetType: AuditTargetType,
    summary: {
      totalItems: number;
      successCount: number;
      failureCount: number;
      details: string;
    },
    organizationId?: string
  ) => {
    try {
      if (!user?.id || !user?.email) {
        console.warn('Cannot log bulk audit action: No authenticated user');
        return;
      }

      const actionCategory = actionType.split('.')[0] + '_management';
      
      const { error } = await supabase.from('admin_audit_logs').insert({
        actor_id: user.id,
        actor_email: user.email,
        actor_role: role || 'unknown',
        action_type: actionType,
        action_category: actionCategory,
        target_type: targetType,
        target_id: 'bulk_operation',
        target_identifier: `Bulk: ${summary.details}`,
        changes: {
          bulk_operation: true,
          total_items: summary.totalItems,
          success_count: summary.successCount,
          failure_count: summary.failureCount,
          details: summary.details,
        },
        organization_id: organizationId || null,
        metadata: {
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          is_bulk: true,
        }
      });

      if (error) {
        console.error('Failed to log bulk audit action:', error);
      }
    } catch (error) {
      console.error('Failed to log bulk audit action:', error);
      // Don't throw - audit logging should never break functionality
    }
  };

  return { logAction, logBulkAction };
}
