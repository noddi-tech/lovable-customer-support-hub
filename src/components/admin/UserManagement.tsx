import { useState } from "react";
import { Heading } from '@/components/ui/heading';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, UserPlus, Edit, Trash2, Shield, Mail, Building, Crown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
// import { useAuth } from "@/hooks/useAuth"; // Disabled for development
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from 'react-i18next';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  department_id: string | null;
  primary_role: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
  department?: {
    id: string;
    name: string;
  };
  roles?: {
    role: 'admin' | 'user';
  }[];
}

interface Department {
  id: string;
  name: string;
  description: string | null;
}

interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  department_id: string | null;
  primary_role: 'admin' | 'user';
}

export function UserManagement() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [createUserData, setCreateUserData] = useState<CreateUserData>({
    email: '',
    password: '',
    full_name: '',
    department_id: null,
    primary_role: 'user'
  });
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  // const { user } = useAuth(); // Disabled for development

  // Fetch users with their roles and departments
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
      return data as UserProfile[];
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
      // if (!user) throw new Error("User not authenticated"); // Disabled for development

      // Create the user account
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          full_name: userData.full_name
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Get organization - using mock for development
      const mockOrgId = "default-org-id"; // Replace with actual org ID when auth is enabled
      /*
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profile) {
        throw new Error("Failed to get user organization");
      }
      */

      // Update the created profile with additional data
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: userData.full_name,
          department_id: userData.department_id,
          primary_role: userData.primary_role
        })
        .eq("user_id", authData.user.id);

      if (updateError) throw updateError;

      return authData.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "User created",
        description: "The user has been created successfully.",
      });
      setShowCreateDialog(false);
      setCreateUserData({
        email: '',
        password: '',
        full_name: '',
        department_id: null,
        primary_role: 'user'
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<UserProfile> }) => {
      // Update profile only - the primary_role field is sufficient for role management
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: updates.full_name,
          department_id: updates.department_id,
          primary_role: updates.primary_role,
          is_active: updates.is_active
        })
        .eq("user_id", userId);

      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "User updated",
        description: "The user has been updated successfully.",
      });
      setEditingUser(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update user. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "User deleted",
        description: "The user has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUserData.email.trim() || !createUserData.password.trim() || !createUserData.full_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Email, password, and full name are required.",
        variant: "destructive",
      });
      return;
    }
    createUserMutation.mutate(createUserData);
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUser.full_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Full name is required.",
        variant: "destructive",
      });
      return;
    }
    updateUserMutation.mutate({ userId: editingUser.user_id, updates: editingUser });
  };

  const startEdit = (user: UserProfile) => {
    setEditingUser({ ...user });
  };

  const cancelEdit = () => {
    setEditingUser(null);
  };

  const getDepartmentName = (departmentId: string | null) => {
    if (!departmentId) return 'No Department';
    const department = departments?.find(d => d.id === departmentId);
    return department?.name || 'Unknown Department';
  };

  const getRoleBadgeVariant = (role: 'admin' | 'user') => {
    return role === 'admin' ? 'destructive' : 'secondary';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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
                <Label htmlFor="password">Temporary Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={createUserData.password}
                  onChange={(e) => setCreateUserData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Temporary password for the user"
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? t('admin.creating') : t('admin.createUser')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {users.length === 0 ? (
        <Card className="bg-gradient-surface border-border/50 shadow-surface">
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <h3 className="font-medium mb-2 text-primary">No users yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first user to start building your team.
            </p>
            <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-primary hover:bg-primary-hover text-primary-foreground shadow-glow">
              <UserPlus className="h-4 w-4 mr-2" />
              Create First User
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {users.map((userProfile) => (
            <Card key={userProfile.id} className="bg-gradient-surface border-border/50 shadow-surface hover:shadow-glow transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shadow-glow">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {userProfile.full_name}
                        {userProfile.primary_role === 'admin' && (
                          <Crown className="h-4 w-4 text-warning" />
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{userProfile.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(userProfile)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {/* Allow all user deletions during development - userProfile.user_id !== user?.id && */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{userProfile.full_name}"? This action cannot be undone.
                              All data associated with this user will be permanently removed.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteUserMutation.mutate(userProfile.user_id)}
                              disabled={deleteUserMutation.isPending}
                            >
                              {deleteUserMutation.isPending ? "Deleting..." : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    {/* )} - Disabled for development */}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Shield className="h-3 w-3" />
                      Role
                    </span>
                    <Badge variant={getRoleBadgeVariant(userProfile.primary_role)}>
                      {userProfile.primary_role === 'admin' ? 'Administrator' : 'User'}
                    </Badge>
                  </div>
                  <div>
                    <span className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Building className="h-3 w-3" />
                      Department
                    </span>
                    <span>{getDepartmentName(userProfile.department_id)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground mb-1 block">Status</span>
                    <Badge variant={userProfile.is_active ? "default" : "secondary"}>
                      {userProfile.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground mb-1 block">Created</span>
                    <span>{formatDate(userProfile.created_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => cancelEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user details, role, and department assignment.
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <Label htmlFor="edit-full_name">Full Name</Label>
                <Input
                  id="edit-full_name"
                  value={editingUser.full_name}
                  onChange={(e) => setEditingUser(prev => prev ? ({ ...prev, full_name: e.target.value }) : null)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-department">Department</Label>
                <Select 
                  value={editingUser.department_id || 'no-department'} 
                  onValueChange={(value) => setEditingUser(prev => prev ? ({ 
                    ...prev, 
                    department_id: value === 'no-department' ? null : value 
                  }) : null)}
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
                <Label htmlFor="edit-role">Role</Label>
                <Select 
                  value={editingUser.primary_role} 
                  onValueChange={(value: 'admin' | 'user') => setEditingUser(prev => prev ? ({ 
                    ...prev, 
                    primary_role: value 
                  }) : null)}
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelEdit}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                >
                  {updateUserMutation.isPending ? "Updating..." : "Update User"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}