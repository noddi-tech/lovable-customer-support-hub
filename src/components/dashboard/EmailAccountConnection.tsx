import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, Plus, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type EmailAccount = {
  id: string;
  email_address: string;
  provider: string;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
}

export function EmailAccountConnection() {
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: emailAccounts = [], isLoading } = useQuery({
    queryKey: ['email-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_email_accounts', {});

      if (error) {
        console.error('Error fetching email accounts:', error);
        return [];
      }
      return data as EmailAccount[];
    },
  });

  const connectGmailMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('gmail-oauth', {
        body: { action: 'authorize' },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      window.location.href = data.authUrl;
    },
    onError: (error) => {
      toast({
        title: "Connection Failed",
        description: "Failed to start Gmail connection process",
        variant: "destructive",
      });
    },
  });

  const syncEmailsMutation = useMutation({
    mutationFn: async (emailAccountId?: string) => {
      const { data, error } = await supabase.functions.invoke('gmail-sync', {
        body: { emailAccountId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Sync Complete",
        description: "Emails have been synchronized successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['email-accounts'] });
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: "Failed to synchronize emails",
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase.rpc('delete_email_account', { account_id: accountId });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Account Removed",
        description: "Email account has been disconnected",
      });
      queryClient.invalidateQueries({ queryKey: ['email-accounts'] });
    },
    onError: (error) => {
      toast({
        title: "Deletion Failed",
        description: "Failed to remove email account",
        variant: "destructive",
      });
    },
  });

  const handleConnectGmail = () => {
    setIsConnecting(true);
    connectGmailMutation.mutate();
  };

  const handleSyncEmails = (accountId?: string) => {
    syncEmailsMutation.mutate(accountId);
  };

  const handleDeleteAccount = (accountId: string) => {
    if (confirm('Are you sure you want to disconnect this email account?')) {
      deleteAccountMutation.mutate(accountId);
    }
  };

  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return 'Never';
    return new Date(lastSync).toLocaleString();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mail className="h-4 w-4 mr-2" />
          Email Accounts
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Email Account Management</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Connect New Account */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Connect Gmail Account</h3>
              <p className="text-sm text-muted-foreground">
                Connect your Gmail account to receive and send emails
              </p>
            </div>
            <Button 
              onClick={handleConnectGmail}
              disabled={isConnecting || connectGmailMutation.isPending}
            >
              {(isConnecting || connectGmailMutation.isPending) ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Connect Gmail
            </Button>
          </div>

          {/* Connected Accounts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Connected Accounts</h3>
              {emailAccounts.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSyncEmails()}
                  disabled={syncEmailsMutation.isPending}
                >
                  {syncEmailsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sync All
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : emailAccounts.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                No email accounts connected
              </div>
            ) : (
              <div className="space-y-2">
                {emailAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{account.email_address}</div>
                        <div className="text-sm text-muted-foreground">
                          Last sync: {formatLastSync(account.last_sync_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={account.is_active ? "default" : "secondary"}>
                        {account.provider}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSyncEmails(account.id)}
                        disabled={syncEmailsMutation.isPending}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteAccount(account.id)}
                        disabled={deleteAccountMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}