import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Check, Mail, AlertCircle, RefreshCw, Plus, Edit, Save, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
}

interface Inbox {
  id: string;
  name: string;
  color: string;
  is_default: boolean;
}

export function EmailForwarding() {
  const [email, setEmail] = useState("");
  const [selectedInbox, setSelectedInbox] = useState<string>("unassigned");
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
    mutationFn: async ({ emailAddress, inboxId }: { emailAddress: string; inboxId: string }) => {
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
        provider: "forwarding",
        is_active: true,
        organization_id: profile.organization_id,
        user_id: user.id,
        inbox_id: inboxId,
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
        body: { emailAccountId: accountId },
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
      addEmailMutation.mutate({ emailAddress: email, inboxId: selectedInbox });
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

  return (
    <div className="space-y-6">
      {/* Setup Instructions */}
      <Alert className="bg-primary-muted border-primary/20">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Gmail Integration:</strong> Connect your Gmail account to automatically sync emails as conversations. 
          The system polls your Gmail for new messages. You can also manually sync anytime.
          <div className="mt-3 flex gap-2">
            <Button 
              onClick={() => handleSyncEmails()}
              disabled={syncEmailsMutation.isPending}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncEmailsMutation.isPending ? 'animate-spin' : ''}`} />
              {syncEmailsMutation.isPending ? 'Syncing...' : 'Sync All Accounts'}
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

      {/* Add New Email */}
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
                placeholder="support@yourcompany.com"
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

      {/* Connected Accounts */}
      <Card className="bg-gradient-surface border-border/50 shadow-surface">
        <CardHeader>
          <CardTitle className="text-primary">Connected Email Accounts</CardTitle>
          <CardDescription>
            Forward emails to these addresses to receive them in your inbox.
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
              
              {/* Quick Add Form in Empty State */}
              <div className="max-w-md mx-auto">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="empty-inbox">Select Inbox</Label>
                    <Select value={selectedInbox} onValueChange={setSelectedInbox}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose inbox" />
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
                             </div>
                           </SelectItem>
                         ))}
                       </SelectContent>
                    </Select>
                  </div>
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="text-left"
                  />
                  <Button 
                    type="submit" 
                    disabled={addEmailMutation.isPending}
                    className="w-full bg-gradient-primary hover:bg-primary-hover text-primary-foreground shadow-glow"
                  >
                    {addEmailMutation.isPending ? "Generating..." : "Generate Forwarding Address"}
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => (
                <div key={account.id} className="border rounded-lg p-4 bg-card/50 hover:bg-card transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span className="font-medium">{account.email_address}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          account.is_active 
                            ? "bg-success-muted text-success" 
                            : "bg-destructive-muted text-destructive"
                        }`}>
                          {account.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      
                      {/* Inbox Assignment Section */}
                      <div className="mt-2">
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
                        <div className="space-y-1 mt-3">
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
                            Forward your emails to this address to receive them in your inbox.
                          </p>
                        </div>
                      )}

                      <div className="text-sm text-muted-foreground mt-2">
                        Last sync: {formatLastSync(account.last_sync_at)}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSyncEmails(account.id)}
                        disabled={syncEmailsMutation.isPending}
                      >
                        <RefreshCw className={`h-4 w-4 ${syncEmailsMutation.isPending ? 'animate-spin' : ''}`} />
                      </Button>
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