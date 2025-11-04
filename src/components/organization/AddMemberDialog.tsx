import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizations } from '@/hooks/useOrganizations';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus } from 'lucide-react';

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  existingMemberIds: string[];
}

export function AddMemberDialog({
  open,
  onOpenChange,
  organizationId,
  existingMemberIds,
}: AddMemberDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'agent' | 'user'>('user');
  const { addUserToOrganization } = useOrganizations();

  // Fetch all users not in this organization
  const { data: availableUsers = [] } = useQuery({
    queryKey: ['available-users', organizationId, existingMemberIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, email, full_name')
        .not('user_id', 'in', `(${existingMemberIds.join(',') || 'null'})`)
        .order('full_name');

      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const handleAdd = () => {
    if (!selectedUserId) return;

    addUserToOrganization(
      {
        userId: selectedUserId,
        organizationId,
        role: selectedRole,
      },
      {
        onSuccess: () => {
          setSelectedUserId('');
          setSelectedRole('user');
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Member to Organization
          </DialogTitle>
          <DialogDescription>
            Select a user and assign them a role in this organization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>User</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableUsers.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No available users to add
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={selectedRole} onValueChange={(value: any) => setSelectedRole(value)}>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!selectedUserId}>
            Add Member
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
