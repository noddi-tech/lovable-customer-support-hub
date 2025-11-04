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

const roleInfo: Record<AppRole, { label: string; description: string; color: string }> = {
  super_admin: {
    label: 'Super Admin',
    description: 'Full system access, can manage all organizations and users',
    color: 'bg-yellow-500',
  },
  admin: {
    label: 'Admin',
    description: 'Can manage users and settings within organizations',
    color: 'bg-blue-500',
  },
  agent: {
    label: 'Agent',
    description: 'Can handle conversations and interact with customers',
    color: 'bg-green-500',
  },
  user: {
    label: 'User',
    description: 'Basic access to assigned resources',
    color: 'bg-gray-500',
  },
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
                {currentRoles.map((roleItem) => {
                  const info = roleInfo[roleItem.role as AppRole];
                  return (
                    <Card key={roleItem.id}>
                      <CardContent className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full ${info.color}`} />
                          <div>
                            <p className="font-medium text-sm">{info.label}</p>
                            <p className="text-xs text-muted-foreground">{info.description}</p>
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
                  const info = roleInfo[role];
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
