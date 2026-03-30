import { useState } from "react";
import { Heading } from '@/components/ui/heading';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from 'react-i18next';
import { useAuditLog } from '@/hooks/useAuditLog';
import { DataTable } from "./DataTable";
import { userColumns, UserRow } from "./users/UserColumns";

interface Department {
  id: string;
  name: string;
  description: string | null;
}

interface CreateUserData {
  email: string;
  full_name: string;
  department_id: string | null;
  primary_role: 'admin' | 'user';
}

export function UserManagement() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createUserData, setCreateUserData] = useState<CreateUserData>({
    email: '',
    full_name: '',
    department_id: null,
    primary_role: 'user'
  });
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { logAction } = useAuditLog();

  // Fetch users with their departments
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          user_id,
          full_name,
          email,
          department_id,
          primary_role,
          is_active,
          created_at,
          department:departments(id, name)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as UserRow[];
    },
  });

  // Fetch departments for assignment
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("name", { ascending: true });
      
      if (error) throw error;
      return data as Department[];
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserData) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: userData.email,
          full_name: userData.full_name,
          department_id: userData.department_id,
          primary_role: userData.primary_role,
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return { user: data.user };
    },
    onSuccess: async (data, variables) => {
      try {
        await logAction(
          'user.create',
          'user',
          data.user.id,
          variables.email,
          { 
            email: variables.email,
            full_name: variables.full_name,
            department_id: variables.department_id,
            primary_role: variables.primary_role
          }
        );
      } catch (error) {
        console.error('Failed to log audit action:', error);
      }

      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast({
        title: "Invite sent",
        description: "The user will receive an email to set up their password.",
      });
      setShowCreateDialog(false);
      setCreateUserData({ email: '', full_name: '', department_id: null, primary_role: 'user' });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUserData.email.trim() || !createUserData.full_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Email and full name are required.",
        variant: "destructive",
      });
      return;
    }
    createUserMutation.mutate(createUserData);
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading level={2}>User Management</Heading>
          <p className="text-muted-foreground mt-1">
            Manage users, roles, and permissions for your organization.
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              {t('admin.createUser')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to your organization with appropriate role and department.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={createUserData.email}
                  onChange={(e) => setCreateUserData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@company.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={createUserData.full_name}
                  onChange={(e) => setCreateUserData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="John Doe"
                  required
                />
              </div>
              <p className="text-sm text-muted-foreground">
                The user will receive an email invitation to set up their own password.
              </p>
              <div>
                <Label htmlFor="department">Department</Label>
                <Select 
                  value={createUserData.department_id || 'no-department'} 
                  onValueChange={(value) => setCreateUserData(prev => ({ 
                    ...prev, 
                    department_id: value === 'no-department' ? null : value 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-department">No Department</SelectItem>
                    {departments?.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select 
                  value={createUserData.primary_role} 
                  onValueChange={(value: 'admin' | 'user') => setCreateUserData(prev => ({ 
                    ...prev, 
                    primary_role: value 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? t('admin.creating') : t('admin.createUser')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={userColumns}
        data={users}
        searchPlaceholder="Search by name or email..."
        globalFilter
      />
    </div>
  );
}
