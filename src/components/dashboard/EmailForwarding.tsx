import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Check, Mail, AlertCircle, RefreshCw, Plus, Edit, Save, X, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface EmailAccount {
  id: string;
  email_address: string;
  forwarding_address: string;
  provider: string;
  is_active: boolean;
  last_sync_at?: string;
  created_at: string;
  inbox_id: string | null;
  auto_sync_enabled: boolean;
  sync_interval_minutes: number;
}

interface Inbox {
  id: string;
  name: string;
  color: string;
  is_default: boolean;
}

export function EmailForwarding({ mode = 'full' }: { mode?: 'full' | 'addAliasOnly' | 'gmailAndAccounts' }) {
  const [email, setEmail] = useState("");
  const [selectedInbox, setSelectedInbox] = useState<string>("unassigned");
  const [connectionType, setConnectionType] = useState<'forwarding' | 'google-group'>("forwarding");
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [editingInbox, setEditingInbox] = useState<string>("unassigned");
  const [copiedForwarding, setCopiedForwarding] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();

  console.log("EmailForwarding - User state:", { user: user?.id, loading });

  // Fetch inboxes
  const { data: inboxes = [] } = useQuery({
    queryKey: ["inboxes"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_inboxes");
      if (error) throw error;
      return data as Inbox[];
    },
  });

  // Fetch email accounts
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["email-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_email_accounts");
      if (error) throw error;
      return data as EmailAccount[];
    },
  });

  // Add email forwarding mutation
  const addEmailMutation = useMutation({
    mutationFn: async ({ emailAddress, inboxId, providerType }: { emailAddress: string; inboxId: string; providerType: 'forwarding' | 'google-group' }) => {
      console.log("Starting email forwarding setup for:", emailAddress);
      
      if (!user) {
        console.error("User not authenticated");
        throw new Error("User not authenticated");
      }

      console.log("User ID:", user.id);

      // Get user's organization
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      console.log("Profile query result:", { profile, profileError });

      if (profileError) {
        console.error("Profile error:", profileError);
        throw new Error(`Profile lookup failed: ${profileError.message}`);
      }
      
      if (!profile) {
        console.error("No profile found for user");
        throw new Error("User profile not found");
      }

      // Generate unique forwarding address based on organization
      const orgSlug = profile.organization_id.substring(0, 8);
      const randomId = Math.random().toString(36).substring(2, 8);
      const forwardingAddress = `support-${orgSlug}-${randomId}@helpdesk.example.com`;

      console.log("Generated forwarding address:", forwardingAddress);

      const insertData = {
        email_address: emailAddress,
        forwarding_address: forwardingAddress,
        provider: providerType,
        is_active: true,
        organization_id: profile.organization_id,
        user_id: user.id,
        inbox_id: inboxId,
        auto_sync_enabled: true, // Default to enabled
        sync_interval_minutes: 2, // Default to 2 minutes
      };

      console.log("Inserting data:", insertData);

      const { data, error } = await supabase
        .from("email_accounts")
        .insert(insertData)
        .select()
        .single();

      console.log("Insert result:", { data, error });

      if (error) {
        console.error("Insert error:", error);
        throw new Error(`Database insert failed: ${error.message}`);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-accounts"] });
      toast({
        title: "Email forwarding set up",
        description: "Your email forwarding has been configured successfully.",
      });
      setEmail("");
      setSelectedInbox("unassigned");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to set up email forwarding. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update email account inbox assignment
  const updateAccountMutation = useMutation({
    mutationFn: async ({ accountId, inboxId }: { accountId: string; inboxId: string | null }) => {
      const { error } = await supabase
        .from("email_accounts")
        .update({ inbox_id: inboxId })
        .eq("id", accountId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-accounts"] });
      setEditingAccount(null);
      setEditingInbox("unassigned");
      toast({
        title: "Inbox updated",
        description: "Email account has been reassigned to the selected inbox.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update inbox assignment.",
        variant: "destructive",
      });
    },
  });

  // Update email account auto-sync settings
  const updateAccountSyncMutation = useMutation({
    mutationFn: async ({ accountId, autoSyncEnabled, syncIntervalMinutes }: { 
      accountId: string; 
      autoSyncEnabled: boolean; 
      syncIntervalMinutes: number 
    }) => {
      const { error } = await supabase
        .from("email_accounts")
        .update({ 
          auto_sync_enabled: autoSyncEnabled,
          sync_interval_minutes: syncIntervalMinutes
        })
        .eq("id", accountId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-accounts"] });
      toast({
        title: "Auto-sync settings updated",
        description: "Email account sync preferences have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update auto-sync settings.",
        variant: "destructive",
      });
    },
  });

  // Remove email account mutation
  const removeAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase.rpc("delete_email_account", {
        account_id: accountId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-accounts"] });
      toast({
        title: "Email account removed",
        description: "The email account has been disconnected.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove email account.",
        variant: "destructive",
      });
    },
  });

  // Sync emails mutation
  const syncEmailsMutation = useMutation({
    mutationFn: async (accountId?: string) => {
      const { data, error } = await supabase.functions.invoke('gmail-sync', {
        body: { emailAccountId: accountId, syncSent: true },
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["email-accounts"] });
      const totalMessages = data.syncResults?.reduce((sum: number, result: any) => 
        sum + (result.messageCount || 0), 0
      ) || 0;
      toast({
        title: "Sync Complete",
        description: `Synced ${totalMessages} new messages`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpdateAccount = (accountId: string, inboxId: string) => {
    const finalInboxId = inboxId === "unassigned" ? null : inboxId;
    updateAccountMutation.mutate({ accountId, inboxId: finalInboxId });
  };

  const startEditingAccount = (accountId: string, currentInboxId: string | null) => {
    setEditingAccount(accountId);
    setEditingInbox(currentInboxId || "unassigned");
  };

  const cancelEditing = () => {
    setEditingAccount(null);
    setEditingInbox("unassigned");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please make sure you're logged in to set up email forwarding.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedInbox || selectedInbox === "unassigned") {
      toast({
        title: "Inbox required",
        description: "Please select a valid inbox for this email account.",
        variant: "destructive",
      });
      return;
    }
    if (email) {
      addEmailMutation.mutate({ emailAddress: email, inboxId: selectedInbox, providerType: connectionType });
    }
  };

  const handleSyncEmails = (accountId?: string) => {
    syncEmailsMutation.mutate(accountId);
  };

  const handleGmailConnect = async () => {
    try {
      // First, get the auth URL from our edge function
      const { data, error } = await supabase.functions.invoke('gmail-oauth');
      
      if (error) {
        toast({
          title: "Error",
          description: "Failed to initiate Gmail connection",
          variant: "destructive",
        });
        return;
      }

      // Open the Google OAuth URL in a popup
      const popup = window.open(
        data.authUrl,
        'gmail-auth',
        'width=500,height=600'
      );

      if (!popup) {
        toast({
          title: "Error",
          description: "Popup blocked. Please allow popups and try again.",
          variant: "destructive",
        });
        return;
      }

      // Listen for messages from the popup
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'gmail_connected') {
          queryClient.invalidateQueries({ queryKey: ["email-accounts"] });
          toast({
            title: "Gmail Connected",
            description: `Gmail account "${event.data.email}" connected successfully.`,
          });
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);

      // Also check if popup is closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
        }
      }, 1000);

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect Gmail account",
        variant: "destructive",
      });
    }
  };

  const copyForwardingAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedForwarding(address);
      setTimeout(() => setCopiedForwarding(null), 2000);
      toast({
        title: "Copied!",
        description: "Forwarding address copied to clipboard.",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the address manually.",
        variant: "destructive",
      });
    }
  };

  const formatLastSync = (lastSync: string | undefined) => {
    if (!lastSync) return "Never";
    const date = new Date(lastSync);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  // Show loading state if authentication is still loading
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p>Loading authentication...</p>
        </div>
      </div>
    );
  }

  // Show authentication required if user is not logged in
  if (!user) {
    return (
      <div className="space-y-6">
        <Alert className="bg-primary-muted border-primary/20">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Authentication Required:</strong> Please log in to set up email forwarding and manage your inbox settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Count Gmail accounts and auto-sync state (Gmail-only)
  const gmailAccountCount = accounts.filter(acc => acc.provider === 'gmail').length;
  const autoSyncEnabledCount = accounts.filter(acc => acc.provider === 'gmail' && acc.auto_sync_enabled).length;

  return (
    <div className="space-y-6">
      {mode !== 'addAliasOnly' && (
        <Alert className="bg-primary-muted border-primary/20">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Gmail Integration:</strong> Connect your Gmail account (OAuth) to sync emails on a schedule. 
            {autoSyncEnabledCount > 0 ? (
              <div className="flex items-center gap-2 mt-2 text-success">
                <Clock className="h-4 w-4" />
                <span>Auto-sync enabled for {autoSyncEnabledCount} Gmail account{autoSyncEnabledCount > 1 ? 's' : ''}</span>
              </div>
            ) : (
              <div className="text-muted-foreground mt-2">
                No Gmail auto-sync enabled yet. Configure per-account settings below.
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Note: Google Groups or forwarding-only addresses deliver instantly via their forwarding address — manual sync does not apply.
            </p>
            <div className="mt-3 flex gap-2">
              <Button 
                onClick={() => handleSyncEmails()}
                disabled={gmailAccountCount === 0 || syncEmailsMutation.isPending}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncEmailsMutation.isPending ? 'animate-spin' : ''}`} />
                {syncEmailsMutation.isPending ? 'Syncing...' : 'Sync Gmail Accounts'}
              </Button>
              <Button 
                onClick={handleGmailConnect}
                variant="outline"
                size="sm"
                className="hover:bg-accent"
              >
                <Plus className="h-4 w-4 mr-2" />
                Connect Gmail
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {mode !== 'gmailAndAccounts' && (
        <Card className="bg-gradient-surface border-border/50 shadow-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Mail className="h-5 w-5" />
              Add Email Account
            </CardTitle>
            <CardDescription>
              Enter your email address to set up forwarding. We'll generate a unique forwarding address for you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="connection-type">Connection Type</Label>
                <Select value={connectionType} onValueChange={(v) => setConnectionType(v as 'forwarding' | 'google-group')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose how this address will connect" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="forwarding">Direct mailbox or alias (forwarding)</SelectItem>
                    <SelectItem value="google-group">Google Group (add our address as a member)</SelectItem>
                  </SelectContent>
                </Select>
                {connectionType === 'google-group' && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    In Google Admin, open your Group → Members → Add members, paste the generated forwarding address, and ensure external posting is allowed.
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="inbox">Select Inbox</Label>
                <Select value={selectedInbox} onValueChange={setSelectedInbox}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose which inbox to connect this email to" />
                  </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="unassigned">
                       <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-muted" />
                          <span>Unassigned</span>
                        </div>
                     </SelectItem>
                     {inboxes.map((inbox) => (
                       <SelectItem key={inbox.id} value={inbox.id}>
                         <div className="flex items-center gap-2">
                           <div 
                             className="w-3 h-3 rounded-full" 
                             style={{ backgroundColor: inbox.color }}
                           />
                           <span>{inbox.name}</span>
                           {inbox.is_default && <span className="text-xs text-muted-foreground">(Default)</span>}
                         </div>
                       </SelectItem>
                     ))}
                   </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="email">Your Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={connectionType === 'google-group' ? "group@yourcompany.com" : "support@yourcompany.com"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button 
                type="submit" 
                disabled={addEmailMutation.isPending}
                className="w-full bg-gradient-primary hover:bg-primary-hover text-primary-foreground shadow-glow"
              >
                {addEmailMutation.isPending ? "Setting up..." : "Generate Forwarding Address"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Connected Accounts */}
      <Card className="bg-gradient-surface border-border/50 shadow-surface">
        <CardHeader>
          <CardTitle className="text-primary">Connected Email Accounts</CardTitle>
          <CardDescription>
            Manage your connected email accounts and their auto-sync settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading accounts...</div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium mb-2">No email accounts connected yet.</p>
              <p className="text-sm mb-6">Add your first email account to get started with forwarding.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => (
                <div key={account.id} className="border rounded-lg p-4 bg-card/50 hover:bg-card transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span className="font-medium">{account.email_address}</span>
                        <span className="px-2 py-1 rounded-full text-xs bg-muted text-muted-foreground capitalize">
                          {account.provider === 'google-group' ? 'Google Group' : account.provider === 'gmail' ? 'Gmail OAuth' : 'Forwarding'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          account.is_active 
                            ? "bg-success-muted text-success" 
                            : "bg-destructive-muted text-destructive"
                        }`}>
                          {account.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      
                      {/* Auto-sync Settings per Account */}
                      {account.provider === 'gmail' ? (
                        <div className="space-y-2 border-t pt-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <Label className="text-sm font-medium">Auto-sync</Label>
                              <p className="text-xs text-muted-foreground">
                                {account.sync_interval_minutes < 1 
                                  ? `Automatically sync this account every ${Math.ceil(account.sync_interval_minutes * 60)} second${Math.ceil(account.sync_interval_minutes * 60) !== 1 ? 's' : ''}`
                                  : `Automatically sync this account every ${account.sync_interval_minutes} minute${account.sync_interval_minutes > 1 ? 's' : ''}`
                                }
                              </p>
                            </div>
                            <Switch
                              checked={account.auto_sync_enabled}
                              onCheckedChange={(checked) => 
                                updateAccountSyncMutation.mutate({
                                  accountId: account.id,
                                  autoSyncEnabled: checked,
                                  syncIntervalMinutes: account.sync_interval_minutes
                                })
                              }
                              disabled={updateAccountSyncMutation.isPending}
                            />
                          </div>
                          {account.auto_sync_enabled && (
                            <div className="ml-4">
                              <Label className="text-xs text-muted-foreground">Sync Interval</Label>
                              <Select 
                                value={account.sync_interval_minutes?.toString() || "2"}
                                onValueChange={(value) => {
                                  const numericValue = Number(value);
                                  console.log('Selected value:', value, 'Converted to:', numericValue);
                                  updateAccountSyncMutation.mutate({
                                    accountId: account.id,
                                    autoSyncEnabled: true,
                                    syncIntervalMinutes: numericValue
                                  });
                                }}
                                disabled={updateAccountSyncMutation.isPending}
                              >
                                <SelectTrigger className="w-32 h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0.017">1 sec</SelectItem>
                                  <SelectItem value="0.083">5 sec</SelectItem>
                                  <SelectItem value="0.167">10 sec</SelectItem>
                                  <SelectItem value="0.5">30 sec</SelectItem>
                                  <SelectItem value="1">1 min</SelectItem>
                                  <SelectItem value="2">2 min</SelectItem>
                                  <SelectItem value="5">5 min</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2 border-t pt-3">
                          <p className="text-sm text-muted-foreground">
                            This address uses forwarding (e.g., Google Group). Messages arrive in real time via the forwarding address; manual sync is not applicable.
                          </p>
                        </div>
                      )}
                      
                      {/* Inbox Assignment Section */}
                      <div>
                        {editingAccount === account.id ? (
                          <div className="flex items-center gap-2">
                            <Select value={editingInbox} onValueChange={setEditingInbox}>
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Select inbox" />
                              </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="unassigned">
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full bg-muted" />
                                      <span>Unassigned</span>
                                    </div>
                                 </SelectItem>
                                 {inboxes.map((inbox) => (
                                   <SelectItem key={inbox.id} value={inbox.id}>
                                     <div className="flex items-center gap-2">
                                       <div 
                                         className="w-3 h-3 rounded-full" 
                                         style={{ backgroundColor: inbox.color }}
                                       />
                                       <span>{inbox.name}</span>
                                       {inbox.is_default && <span className="text-xs text-muted-foreground">(Default)</span>}
                                     </div>
                                   </SelectItem>
                                 ))}
                               </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateAccount(account.id, editingInbox)}
                              disabled={updateAccountMutation.isPending || !editingInbox}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={cancelEditing}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>Inbox:</span>
                              {account.inbox_id ? (
                                <div className="flex items-center gap-1">
                                  <div 
                                    className="w-2 h-2 rounded-full" 
                                    style={{ backgroundColor: inboxes.find(i => i.id === account.inbox_id)?.color || '#3B82F6' }}
                                  />
                                  <span className="font-medium">
                                    {inboxes.find(i => i.id === account.inbox_id)?.name || 'Unknown Inbox'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-warning">Not assigned</span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditingAccount(account.id, account.inbox_id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {account.forwarding_address && (
                        <div className="space-y-1">
                          <Label className="text-sm text-muted-foreground">Forwarding Address:</Label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 p-2 bg-muted rounded text-sm">
                              {account.forwarding_address}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyForwardingAddress(account.forwarding_address)}
                            >
                              {copiedForwarding === account.forwarding_address ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {account.provider === 'google-group'
                              ? 'In Google Admin → Groups, add this address as a member so messages are forwarded here.'
                              : 'Forward your emails to this address to receive them in your inbox.'}
                          </p>
                        </div>
                      )}

                      <div className="text-sm text-muted-foreground">
                        {account.provider === 'gmail' ? `Last sync: ${formatLastSync(account.last_sync_at)}` : 'Sync: Real-time via forwarding'}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {account.provider === 'gmail' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSyncEmails(account.id)}
                          disabled={syncEmailsMutation.isPending}
                        >
                          <RefreshCw className={`h-4 w-4 ${syncEmailsMutation.isPending ? 'animate-spin' : ''}`} />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeAccountMutation.mutate(account.id)}
                        disabled={removeAccountMutation.isPending}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}