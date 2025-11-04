import React, { useState } from 'react';
import { useUserManagement } from '@/hooks/useUserManagement';
import { useOrganizations } from '@/hooks/useOrganizations';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, UserCog, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDeleteDialog } from '@/components/admin/ConfirmDeleteDialog';

interface MemberActionMenuProps {
  member: {
    id: string;
    user_id: string;
    role: string;
    user?: {
      full_name?: string;
      email: string;
    };
  };
  organizationId: string;
}

export function MemberActionMenu({ member, organizationId }: MemberActionMenuProps) {
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState(member.role);
  
  const { updateMembershipRole } = useUserManagement();
  const { removeUserFromOrganization } = useOrganizations();

  const handleUpdateRole = () => {
    updateMembershipRole(
      {
        userId: member.user_id,
        organizationId,
        role: newRole as 'admin' | 'agent' | 'user',
      },
      {
        onSuccess: () => {
          setRoleDialogOpen(false);
        },
      }
    );
  };

  const handleRemove = () => {
    removeUserFromOrganization(
      {
        userId: member.user_id,
        organizationId,
      },
      {
        onSuccess: () => {
          setDeleteDialogOpen(false);
        },
      }
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setRoleDialogOpen(true)}>
            <UserCog className="h-4 w-4 mr-2" />
            Change Role
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove from Organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Change Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Member Role</DialogTitle>
            <DialogDescription>
              Update the role for {member.user?.full_name || member.user?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
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
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} disabled={newRole === member.role}>
              Update Role
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleRemove}
        title="Remove Member from Organization"
        description={`Are you sure you want to remove ${member.user?.full_name || member.user?.email} from this organization? This action cannot be undone.`}
      />
    </>
  );
}
