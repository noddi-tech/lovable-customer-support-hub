import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Check, Mail, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
}

export function EmailForwarding() {
  const [email, setEmail] = useState("");
  const [copiedForwarding, setCopiedForwarding] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();

  console.log("EmailForwarding - User state:", { user: user?.id, loading });

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
    mutationFn: async (emailAddress: string) => {
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
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to set up email forwarding. Please try again.",
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
    if (email) {
      addEmailMutation.mutate(email);
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
        <Alert>
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
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>HelpScout-style Email Setup:</strong> Set up your email address below to get a unique forwarding address. 
          Then forward your emails to this address to receive them in your inbox. You can reply directly from the system using OAuth.
        </AlertDescription>
      </Alert>

      {/* Add New Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
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
              className="w-full"
            >
              {addEmailMutation.isPending ? "Setting up..." : "Generate Forwarding Address"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Connected Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Email Accounts</CardTitle>
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
                    className="w-full"
                  >
                    {addEmailMutation.isPending ? "Generating..." : "Generate Forwarding Address"}
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => (
                <div key={account.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span className="font-medium">{account.email_address}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          account.is_active 
                            ? "bg-green-100 text-green-700" 
                            : "bg-red-100 text-red-700"
                        }`}>
                          {account.is_active ? "Active" : "Inactive"}
                        </span>
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
                            Forward your emails to this address to receive them in your inbox.
                          </p>
                        </div>
                      )}

                      <div className="text-sm text-muted-foreground">
                        Last sync: {formatLastSync(account.last_sync_at)}
                      </div>
                    </div>

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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}