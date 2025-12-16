import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserManagement, AppRole } from '@/hooks/useUserManagement';
import { Shield, Plus, X, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ManageUserRolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    user_id: string;
    email: string;
    full_name: string | null;
  };
}

const roleInfo: Record<AppRole, { label: string; description: string; color: string; order: number }> = {
  super_admin: {
    label: 'Super Admin',
    description: 'Full system access across ALL organizations — inherits all permissions, no additional roles needed',
    color: 'bg-yellow-500',
    order: 1,
  },
  admin: {
    label: 'Admin',
    description: 'Organization administrator — can manage users, settings, and inboxes within their organization',
    color: 'bg-blue-500',
    order: 2,
  },
  agent: {
    label: 'Agent',
    description: 'Active user — can handle conversations, make calls, reply to emails, and interact with customers',
    color: 'bg-green-500',
    order: 3,
  },
  user: {
    label: 'User',
    description: 'View-only access — can see conversations and data but cannot reply or take actions',
    color: 'bg-gray-500',
    order: 4,
  },
};

const defaultRoleInfo = {
  label: 'Unknown Role',
  description: 'Role information not available',
  color: 'bg-gray-400',
};

const availableRoles: AppRole[] = ['super_admin', 'admin', 'agent', 'user'];

export function ManageUserRolesDialog({ open, onOpenChange, user }: ManageUserRolesDialogProps) {
  const { getUserRoles, assignRole, removeRole, isAssigningRole, isRemovingRole } = useUserManagement();
  const { data: currentRoles = [], isLoading, refetch } = getUserRoles(user.user_id);

  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  const currentRoleValues = currentRoles.map((r) => r.role);
  const availableToAdd = availableRoles.filter((r) => !currentRoleValues.includes(r));

  const handleAddRole = (role: AppRole) => {
    assignRole({ userId: user.user_id, role });
  };

  const handleRemoveRole = (role: AppRole) => {
    if (currentRoles.length <= 1) {
      return; // Prevent removing last role
    }
    removeRole({ userId: user.user_id, role });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Manage User Roles</DialogTitle>
              <DialogDescription>
                {user.full_name || user.email}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Super Admin Info Banner */}
          {currentRoleValues.includes('super_admin') && (
            <Card className="border-yellow-500/30 bg-yellow-500/10">
              <CardContent className="py-3">
                <div className="flex gap-2">
                  <Shield className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                  <div className="text-xs text-yellow-700 dark:text-yellow-400">
                    <p className="font-medium">This user is a Super Admin</p>
                    <p>They have full access to all features across all organizations. Additional roles are not required.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Roles */}
          <div>
            <h4 className="text-sm font-medium mb-3">Current Roles</h4>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : currentRoles.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">No roles assigned</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {currentRoles
                  .slice()
                  .sort((a, b) => {
                    const aOrder = roleInfo[a.role as AppRole]?.order ?? 99;
                    const bOrder = roleInfo[b.role as AppRole]?.order ?? 99;
                    return aOrder - bOrder;
                  })
                  .map((roleItem) => {
                  if (!roleItem.role) return null;
                  const info = roleInfo[roleItem.role as AppRole] || defaultRoleInfo;
                  return (
                    <Card key={roleItem.id}>
                      <CardContent className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full ${info?.color || 'bg-gray-400'}`} />
                          <div>
                            <p className="font-medium text-sm">{info?.label || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground max-w-md">{info?.description || 'N/A'}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRole(roleItem.role as AppRole)}
                          disabled={isRemovingRole || currentRoles.length <= 1}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {currentRoles.length === 1 && (
              <div className="flex items-center gap-2 mt-2 text-xs text-amber-600 dark:text-amber-500">
                <AlertCircle className="h-3 w-3" />
                <span>Cannot remove last role - user must have at least one role</span>
              </div>
            )}
          </div>

          {/* Available Roles to Add */}
          {availableToAdd.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3">Add Role</h4>
              <div className="space-y-2">
                {availableToAdd.map((role) => {
                  const info = roleInfo[role] || defaultRoleInfo;
                  return (
                    <Card key={role} className="border-dashed hover:border-solid transition-colors">
                      <CardContent className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full ${info.color}`} />
                          <div>
                            <p className="font-medium text-sm">{info.label}</p>
                            <p className="text-xs text-muted-foreground">{info.description}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddRole(role)}
                          disabled={isAssigningRole}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Security Warning for Super Admin */}
          {availableToAdd.includes('super_admin') && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="py-3">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5" />
                  <div className="text-xs text-amber-600 dark:text-amber-500">
                    <p className="font-medium">Warning: Super Admin Access</p>
                    <p>This role grants full system access including all organizations and sensitive data.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
