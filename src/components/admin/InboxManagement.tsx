import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Inbox, Plus, Settings, Trash2, Mail, Users, MessageSquare } from 'lucide-react';

interface InboxData {
  id: string;
  name: string;
  description: string | null;
  department_id: string | null;
  is_default: boolean;
  auto_assignment_rules: any;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  conversation_count: number;
}

interface Department {
  id: string;
  name: string;
  description: string | null;
}

export function InboxManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingInbox, setEditingInbox] = useState<InboxData | null>(null);
  const [newInboxData, setNewInboxData] = useState({
    name: '',
    description: '',
    department_id: '',
    color: '#3B82F6',
    is_default: false,
    auto_assignment_rules: {}
  });

  const queryClient = useQueryClient();

  // Fetch inboxes
  const { data: inboxes, isLoading: isLoadingInboxes } = useQuery({
    queryKey: ['inboxes'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_inboxes');
      if (error) throw error;
      return data as InboxData[];
    }
  });

  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, description');
      if (error) throw error;
      return data as Department[];
    }
  });

  // Create inbox mutation
  const createInboxMutation = useMutation({
    mutationFn: async (inboxData: typeof newInboxData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();
      
      if (!profile) throw new Error('Profile not found');

      const { error } = await supabase
        .from('inboxes')
        .insert({
          ...inboxData,
          department_id: inboxData.department_id || null,
          organization_id: profile.organization_id
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inboxes'] });
      setIsCreateDialogOpen(false);
      setNewInboxData({
        name: '',
        description: '',
        department_id: '',
        color: '#3B82F6',
        is_default: false,
        auto_assignment_rules: {}
      });
      toast.success('Inbox created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create inbox: ' + error.message);
    }
  });

  // Update inbox mutation
  const updateInboxMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InboxData> }) => {
      const { error } = await supabase
        .from('inboxes')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inboxes'] });
      setEditingInbox(null);
      toast.success('Inbox updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update inbox: ' + error.message);
    }
  });

  // Delete inbox mutation
  const deleteInboxMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inboxes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inboxes'] });
      toast.success('Inbox deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete inbox: ' + error.message);
    }
  });

  const handleCreateInbox = () => {
    createInboxMutation.mutate(newInboxData);
  };

  const handleUpdateInbox = (updates: Partial<InboxData>) => {
    if (editingInbox) {
      updateInboxMutation.mutate({ id: editingInbox.id, updates });
    }
  };

  const handleDeleteInbox = (id: string) => {
    deleteInboxMutation.mutate(id);
  };

  const getDepartmentName = (departmentId: string | null) => {
    if (!departmentId) return 'No Department';
    const department = departments?.find(d => d.id === departmentId);
    return department?.name || 'Unknown Department';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Inbox Management</h2>
          <p className="text-muted-foreground">
            Manage your organization's inboxes and routing rules
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Inbox
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Inbox</DialogTitle>
              <DialogDescription>
                Set up a new inbox for organizing conversations
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Inbox Name</Label>
                <Input
                  id="name"
                  value={newInboxData.name}
                  onChange={(e) => setNewInboxData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Sales, Support, Billing"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newInboxData.description}
                  onChange={(e) => setNewInboxData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this inbox"
                />
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Select 
                  value={newInboxData.department_id} 
                  onValueChange={(value) => setNewInboxData(prev => ({ ...prev, department_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Department</SelectItem>
                    {departments?.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  type="color"
                  value={newInboxData.color}
                  onChange={(e) => setNewInboxData(prev => ({ ...prev, color: e.target.value }))}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_default"
                  checked={newInboxData.is_default}
                  onCheckedChange={(checked) => setNewInboxData(prev => ({ ...prev, is_default: checked }))}
                />
                <Label htmlFor="is_default">Set as default inbox</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateInbox} disabled={createInboxMutation.isPending}>
                {createInboxMutation.isPending ? 'Creating...' : 'Create Inbox'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoadingInboxes ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {inboxes?.map((inbox) => (
            <Card key={inbox.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: inbox.color }}
                    />
                    <CardTitle className="text-lg">{inbox.name}</CardTitle>
                    {inbox.is_default && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setEditingInbox(inbox)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    {!inbox.is_default && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Inbox</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{inbox.name}"? This action cannot be undone.
                              All conversations in this inbox will be moved to the default inbox.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteInbox(inbox.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
                <CardDescription>{inbox.description || 'No description'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Conversations
                    </span>
                    <Badge variant="outline">{inbox.conversation_count}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Department
                    </span>
                    <span className="text-muted-foreground">
                      {getDepartmentName(inbox.department_id)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Status</span>
                    <Badge variant={inbox.is_active ? "default" : "secondary"}>
                      {inbox.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingInbox} onOpenChange={(open) => !open && setEditingInbox(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Inbox</DialogTitle>
            <DialogDescription>
              Update inbox settings and configuration
            </DialogDescription>
          </DialogHeader>
          {editingInbox && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Inbox Name</Label>
                <Input
                  id="edit-name"
                  value={editingInbox.name}
                  onChange={(e) => setEditingInbox(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingInbox.description || ''}
                  onChange={(e) => setEditingInbox(prev => prev ? { ...prev, description: e.target.value } : null)}
                />
              </div>
              <div>
                <Label htmlFor="edit-color">Color</Label>
                <Input
                  id="edit-color"
                  type="color"
                  value={editingInbox.color}
                  onChange={(e) => setEditingInbox(prev => prev ? { ...prev, color: e.target.value } : null)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-is_active"
                  checked={editingInbox.is_active}
                  onCheckedChange={(checked) => setEditingInbox(prev => prev ? { ...prev, is_active: checked } : null)}
                />
                <Label htmlFor="edit-is_active">Active</Label>
              </div>
              {!editingInbox.is_default && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-is_default"
                    checked={editingInbox.is_default}
                    onCheckedChange={(checked) => setEditingInbox(prev => prev ? { ...prev, is_default: checked } : null)}
                  />
                  <Label htmlFor="edit-is_default">Set as default inbox</Label>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingInbox(null)}>
              Cancel
            </Button>
            <Button 
              onClick={() => editingInbox && handleUpdateInbox(editingInbox)} 
              disabled={updateInboxMutation.isPending}
            >
              {updateInboxMutation.isPending ? 'Updating...' : 'Update Inbox'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}