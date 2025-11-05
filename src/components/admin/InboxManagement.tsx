import { useEffect, useState } from 'react';
import { Heading } from '@/components/ui/heading';
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
import { Separator } from '@/components/ui/separator';
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
  sender_display_name: string | null;
}

interface Department {
  id: string;
  name: string;
  description: string | null;
}

interface InboundRoute {
  id: string;
  inbox_id: string | null;
  address: string;
  group_email: string | null;
}


interface EmailAccount {
  id: string;
  inbox_id: string | null;
  email_address: string;
  provider: string;
  is_active: boolean | null;
}

export function InboxManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingInbox, setEditingInbox] = useState<InboxData | null>(null);
  const [newInboxData, setNewInboxData] = useState({
    name: '',
    description: '',
    department_id: 'no-department',
    color: '#3B82F6',
    is_default: false,
    auto_assignment_rules: {},
    sender_display_name: ''
  });

  // Sending/Receiving address edit state
  const [editGroupEmail, setEditGroupEmail] = useState('');
  const [editRouteId, setEditRouteId] = useState<string | null>(null);

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

  // Fetch inbound routes (to show connected emails per inbox)
  const { data: inboundRoutes } = useQuery({
    queryKey: ['inbound_routes'],
    queryFn: async (): Promise<InboundRoute[]> => {
      const { data, error } = await supabase
        .from('inbound_routes')
        .select('id,inbox_id,address,group_email');
      if (error) throw error;
      return data as unknown as InboundRoute[];
    },
  });

// Fetch connected email accounts (OAuth/IMAP) per inbox
  const { data: emailAccounts } = useQuery({
    queryKey: ['email_accounts'],
    queryFn: async (): Promise<EmailAccount[]> => {
      const { data, error } = await supabase.rpc('get_email_accounts');
      if (error) throw error;
      return (data || []) as unknown as EmailAccount[];
    },
  });

  // Initialize group email state when opening edit dialog
  useEffect(() => {
    if (editingInbox) {
      const route = (inboundRoutes || []).find(r => r.inbox_id === editingInbox.id);
      setEditRouteId(route?.id || null);
      setEditGroupEmail(route?.group_email || '');
    } else {
      setEditRouteId(null);
      setEditGroupEmail('');
    }
  }, [editingInbox, inboundRoutes]);

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
          department_id: inboxData.department_id === 'no-department' ? null : inboxData.department_id,
          sender_display_name: inboxData.sender_display_name || null,
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
        department_id: 'no-department',
        color: '#3B82F6',
        is_default: false,
        auto_assignment_rules: {},
        sender_display_name: ''
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

  // Update sending/receiving address (inbound route group_email)
  const updateGroupEmailMutation = useMutation({
    mutationFn: async ({ routeId, groupEmail }: { routeId: string; groupEmail: string }) => {
      const { error } = await supabase
        .from('inbound_routes')
        .update({ group_email: groupEmail })
        .eq('id', routeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound_routes'] });
      toast.success('Sending address updated');
    },
    onError: (error) => {
      toast.error('Failed to update sending address: ' + error.message);
    }
  });

  // Delete inbox mutation
  const deleteInboxMutation = useMutation({
    mutationFn: async (id: string) => {
      // Check if inbox has conversations
      const { count, error: countError } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('inbox_id', id);
      
      if (countError) throw countError;
      
      if (count && count > 0) {
        throw new Error(
          `Cannot delete inbox with ${count} conversation(s). Please move or delete all conversations first.`
        );
      }
      
      // Safe to delete - no conversations
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
      toast.error(error.message);
    }
  });

  const handleCreateInbox = () => {
    createInboxMutation.mutate(newInboxData);
  };

  const handleUpdateInbox = (updates: Partial<InboxData>) => {
    if (editingInbox) {
      // Filter out computed fields that shouldn't be updated
      const { conversation_count, created_at, updated_at, ...updateData } = updates;
      updateInboxMutation.mutate({ id: editingInbox.id, updates: updateData });
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
          <Heading level={2}>Inbox Management</Heading>
          <p className="text-muted-foreground mt-1">
            Create and manage inboxes. Email setup is now in Admin → Integrations.
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
                    <SelectItem value="no-department">No Department</SelectItem>
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
              <div>
                <Label htmlFor="sender-name">Sender Display Name (Optional)</Label>
                <Input
                  id="sender-name"
                  value={newInboxData.sender_display_name}
                  onChange={(e) => setNewInboxData(prev => ({ ...prev, sender_display_name: e.target.value }))}
                  placeholder="Leave empty to use organization default"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Override the organization-level sender name for this inbox
                </p>
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


      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-primary">
          <Inbox className="h-5 w-5" />
          All Inboxes
        </h3>
        
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
            <Card key={inbox.id} className="relative bg-gradient-surface border-border/50 shadow-surface hover:shadow-glow transition-shadow">
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
                            {inbox.conversation_count > 0 && (
                              <span className="block mt-2 text-destructive font-semibold">
                                This inbox has {inbox.conversation_count} conversation(s). You must move or delete all conversations before deleting this inbox.
                              </span>
                            )}
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
                  <div className="text-sm">
                    <span className="flex items-center gap-2 mb-1">
                      <Mail className="w-4 h-4" />
                      Connected email(s)
                    </span>
                    <div className="text-muted-foreground">
                      {(() => {
                        const routes = inboundRoutes?.filter(r => r.inbox_id === inbox.id) || [];
                        const accounts = (emailAccounts || []).filter(a => a.inbox_id === inbox.id);
                        if (routes.length + accounts.length === 0) {
                          return <span>No email connected</span>;
                        }
                        return (
                          <ul className="list-disc pl-5 space-y-1">
                            {accounts.map((a) => (
                              <li key={`acct-${a.id}`}>
                                <span className="font-medium">{a.email_address}</span>
                                <span className="ml-2 text-xs">({a.provider})</span>
                              </li>
                            ))}
                            {routes.map((r) => (
                              <li key={`route-${r.id}`}>
                                <span className="font-medium">{r.group_email || 'Public email not set'}</span>
                                <span className="ml-2">→ forwards to </span>
                                <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/50">{r.address}</code>
                              </li>
                            ))}
                          </ul>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>

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
                <Label htmlFor="edit-department">Department</Label>
                <Select 
                  value={editingInbox.department_id || 'no-department'} 
                  onValueChange={(value) => setEditingInbox(prev => prev ? { 
                    ...prev, 
                    department_id: value === 'no-department' ? null : value 
                  } : null)}
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
                <Label htmlFor="edit-color">Color</Label>
                <Input
                  id="edit-color"
                  type="color"
                  value={editingInbox.color}
                  onChange={(e) => setEditingInbox(prev => prev ? { ...prev, color: e.target.value } : null)}
                />
              </div>
              <div>
                <Label htmlFor="edit-sender-name">Sender Display Name (Optional)</Label>
                <Input
                  id="edit-sender-name"
                  value={editingInbox.sender_display_name || ''}
                  onChange={(e) => setEditingInbox(prev => prev ? { ...prev, sender_display_name: e.target.value || null } : null)}
                  placeholder="Leave empty to use organization default"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Override the organization-level sender name for this inbox
                </p>
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
              {/* Sending/Receiving address */}
              <div className="pt-2">
                <Label htmlFor="edit-group-email">Sending/Receiving address</Label>
                {editRouteId ? (
                  <div className="mt-1 flex gap-2">
                    <Input
                      id="edit-group-email"
                      value={editGroupEmail}
                      onChange={(e) => setEditGroupEmail(e.target.value)}
                      placeholder="e.g., hei@noddi.no"
                    />
                    <Button
                      onClick={() => editRouteId && updateGroupEmailMutation.mutate({ routeId: editRouteId, groupEmail: editGroupEmail.trim() })}
                      disabled={updateGroupEmailMutation.isPending || editGroupEmail.trim().length === 0}
                    >
                      {updateGroupEmailMutation.isPending ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    No inbound route linked to this inbox yet. Set it up in Admin → Integrations → Inbound Addresses.
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">Used as the From address when replying. Must match your authenticated domain in SendGrid.</p>
              </div>
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