import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, Plus, RefreshCw, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

// Mock data for now
interface EmailAccount {
  id: string;
  email_address: string;
  provider: string;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
}

export const EmailAccountConnection = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock data - will be replaced with actual RPC call
  const { data: emailAccounts = [], isLoading } = useQuery({
    queryKey: ['email-accounts'],
    queryFn: async (): Promise<EmailAccount[]> => {
      // Simulate API call
      return [
        {
          id: '1',
          email_address: 'support@company.com',
          provider: 'gmail',
          is_active: true,
          last_sync_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }
      ];
    },
  });

  const connectGmailMutation = useMutation({
    mutationFn: async () => {
      setIsConnecting(true);
      
      // Mock Gmail OAuth flow
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { data: { authorization_url: 'https://accounts.google.com/oauth/authorize?...' } };
    },
    onSuccess: (data) => {
      if (data.data?.authorization_url) {
        window.location.href = data.data.authorization_url;
      }
    },
    onError: (error) => {
      console.error('Error connecting Gmail:', error);
      toast({
        title: 'Connection Failed',
        description: 'Failed to connect Gmail account. Please try again.',
        variant: 'destructive',
      });
      setIsConnecting(false);
    },
  });

  const syncEmailsMutation = useMutation({
    mutationFn: async (accountId?: string) => {
      // Mock sync operation
      await new Promise(resolve => setTimeout(resolve, 3000));
      return {};
    },
    onSuccess: () => {
      toast({
        title: 'Sync Complete',
        description: 'Emails have been synchronized successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['email-accounts'] });
    },
    onError: (error) => {
      console.error('Error syncing emails:', error);
      toast({
        title: 'Sync Failed',
        description: 'Failed to sync emails. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      // Mock deletion
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {};
    },
    onSuccess: () => {
      toast({
        title: 'Account Disconnected',
        description: 'Email account has been successfully disconnected.',
      });
      queryClient.invalidateQueries({ queryKey: ['email-accounts'] });
    },
    onError: (error) => {
      console.error('Error deleting account:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect email account. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleConnectGmail = () => {
    connectGmailMutation.mutate();
  };

  const handleSyncEmails = (accountId?: string) => {
    syncEmailsMutation.mutate(accountId);
  };

  const handleDeleteAccount = (accountId: string) => {
    deleteAccountMutation.mutate(accountId);
  };

  const formatLastSync = (lastSyncAt: string | null) => {
    if (!lastSyncAt) return 'Never';
    
    const date = new Date(lastSyncAt);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Mail className="w-4 h-4" />
          Manage Email Accounts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Email Account Management</DialogTitle>
          <DialogDescription>
            Connect and manage email accounts for your organization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Connect New Account Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Connect New Account</h3>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Gmail</h4>
                      <p className="text-sm text-muted-foreground">
                        Connect your Gmail account via Google OAuth
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleConnectGmail}
                    disabled={isConnecting || connectGmailMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    {isConnecting || connectGmailMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Connect Gmail
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Connected Accounts Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Connected Accounts</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSyncEmails()}
                disabled={syncEmailsMutation.isPending}
                className="flex items-center gap-2"
              >
                {syncEmailsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Sync All
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : emailAccounts.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No email accounts connected</p>
                <p className="text-sm">Connect your first email account to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {emailAccounts.map((account) => (
                  <Card key={account.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                            <Mail className="w-4 h-4 text-red-600" />
                          </div>
                          <div>
                            <p className="font-medium">{account.email_address}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {account.provider}
                              </Badge>
                              <Badge 
                                variant={account.is_active ? "default" : "destructive"}
                                className="text-xs flex items-center gap-1"
                              >
                                {account.is_active ? (
                                  <CheckCircle className="w-3 h-3" />
                                ) : (
                                  <AlertCircle className="w-3 h-3" />
                                )}
                                {account.is_active ? 'Connected' : 'Disconnected'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Last sync: {formatLastSync(account.last_sync_at)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSyncEmails(account.id)}
                            disabled={syncEmailsMutation.isPending}
                            className="flex items-center gap-2"
                          >
                            {syncEmailsMutation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                            Sync
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Disconnect Email Account</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to disconnect {account.email_address}? 
                                  This will stop syncing emails from this account.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteAccount(account.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Disconnect
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};