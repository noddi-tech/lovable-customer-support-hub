import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useUserManagement } from '@/hooks/useUserManagement';
import { Building2, Plus, X, Edit } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ManageUserOrganizationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    user_id: string;
    email: string;
    full_name: string | null;
    organization_memberships?: Array<{
      id: string;
      role: string;
      organization?: { id: string; name: string };
    }>;
  };
}

export function ManageUserOrganizationsDialog({
  open,
  onOpenChange,
  user,
}: ManageUserOrganizationsDialogProps) {
  const { organizations, addUserToOrganization, removeUserFromOrganization } = useOrganizations();
  const { updateMembershipRole } = useUserManagement();
  const [selectedOrgId, setSelectedOrgId] = React.useState<string>('');
  const [selectedRole, setSelectedRole] = React.useState<'admin' | 'agent' | 'user'>('user');
  const [editingMembership, setEditingMembership] = React.useState<string | null>(null);
  const [editRole, setEditRole] = React.useState<'admin' | 'agent' | 'user'>('user');

  const currentOrgIds = user.organization_memberships?.map((m) => m.organization?.id) || [];
  const availableOrgs = organizations.filter((org) => !currentOrgIds.includes(org.id));

  const handleAddToOrganization = () => {
    if (!selectedOrgId) return;
    addUserToOrganization({
      userId: user.user_id,
      organizationId: selectedOrgId,
      role: selectedRole,
    });
    setSelectedOrgId('');
    setSelectedRole('user');
  };

  const handleRemoveFromOrganization = (organizationId: string) => {
    removeUserFromOrganization({
      userId: user.user_id,
      organizationId,
    });
  };

  const handleUpdateRole = (membership: any) => {
    if (!membership.organization?.id) return;
    
    updateMembershipRole({
      userId: user.user_id,
      organizationId: membership.organization.id,
      role: editRole,
    });
    setEditingMembership(null);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'agent':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Manage Organizations</DialogTitle>
              <DialogDescription>
                {user.full_name || user.email}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Memberships */}
          <div>
            <h4 className="text-sm font-medium mb-3">
              Current Organizations ({user.organization_memberships?.length || 0})
            </h4>
            {!user.organization_memberships || user.organization_memberships.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">Not a member of any organizations</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {user.organization_memberships.map((membership) => (
                  <Card key={membership.id}>
                    <CardContent className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{membership.organization?.name}</p>
                          {editingMembership === membership.id ? (
                            <div className="flex items-center gap-2 mt-1">
                              <Select value={editRole} onValueChange={(v) => setEditRole(v as any)}>
                                <SelectTrigger className="h-7 w-[120px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="agent">Agent</SelectItem>
                                  <SelectItem value="user">User</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() => handleUpdateRole(membership)}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() => setEditingMembership(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Badge variant={getRoleBadgeVariant(membership.role)} className="text-xs mt-1">
                              {membership.role}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {editingMembership !== membership.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingMembership(membership.id);
                              setEditRole(membership.role as any);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFromOrganization(membership.organization!.id)}
                          className="text-destructive hover:text-destructive"
                          disabled={user.organization_memberships?.length === 1}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Add to Organization */}
          {availableOrgs.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3">Add to Organization</h4>
              <Card className="border-dashed">
                <CardContent className="py-4">
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select organization" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableOrgs.map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="agent">Agent</SelectItem>
                          <SelectItem value="user">User</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={handleAddToOrganization}
                      disabled={!selectedOrgId}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Organization
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
