import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { UserPlus, Shield, User, Users } from 'lucide-react';

interface OrganizationUser {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'user';
  department_id: string | null;
  is_active: boolean;
  created_at: string;
}

export const UserManagement = () => {
  const [selectedRole, setSelectedRole] = useState<'admin' | 'user'>('user');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // For now, we'll simulate data since the functions don't exist yet
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['organization-users'],
    queryFn: async (): Promise<OrganizationUser[]> => {
      // Placeholder - will be replaced with actual RPC call
      return [
        {
          id: '1',
          user_id: '1',
          full_name: 'John Doe',
          email: 'john@example.com',
          role: 'admin',
          department_id: null,
          is_active: true,
          created_at: new Date().toISOString(),
        },
        {
          id: '2', 
          user_id: '2',
          full_name: 'Jane Smith',
          email: 'jane@example.com',
          role: 'user',
          department_id: null,
          is_active: true,
          created_at: new Date().toISOString(),
        }
      ];
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: 'admin' | 'user' }) => {
      // Placeholder - will be replaced with actual RPC call
      console.log('Updating role for user:', userId, 'to:', newRole);
    },
    onSuccess: () => {
      toast({
        title: 'Role updated',
        description: 'User role has been successfully updated.',
      });
      queryClient.invalidateQueries({ queryKey: ['organization-users'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update user role. Please try again.',
        variant: 'destructive',
      });
      console.error('Error updating role:', error);
    },
  });

  const handleRoleChange = (userId: string, newRole: 'admin' | 'user') => {
    updateRoleMutation.mutate({ userId, newRole });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Loading users...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Organization Users
          </CardTitle>
          <CardDescription>
            Manage user roles and permissions within your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-muted-foreground">
              {users.length} users in your organization
            </div>
            <Button className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Invite User
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="flex items-center gap-1 w-fit">
                      {user.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? 'default' : 'destructive'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={user.role}
                        onValueChange={(newRole: 'admin' | 'user') => handleRoleChange(user.user_id, newRole)}
                        disabled={updateRoleMutation.isPending}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};