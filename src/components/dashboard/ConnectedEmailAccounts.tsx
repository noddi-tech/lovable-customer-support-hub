import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Check, Mail, RefreshCw, Edit, Save, X, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
// ... keep existing code (no Input needed here)
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from 'react-i18next';

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

// Reusable Connected Email Accounts card (no Gmail connect banner or alias form)
export function ConnectedEmailAccounts() {
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [editingInbox, setEditingInbox] = useState<string>("unassigned");
  const [copiedForwarding, setCopiedForwarding] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

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
      toast({ title: t('admin.inboxUpdated'), description: t('admin.emailAccountReassigned') });
    },
  });

  const updateAccountSyncMutation = useMutation({
    mutationFn: async ({ accountId, autoSyncEnabled, syncIntervalMinutes }: {
      accountId: string;
      autoSyncEnabled: boolean;
      syncIntervalMinutes: number;
    }) => {
      const { error } = await supabase
        .from("email_accounts")
        .update({ auto_sync_enabled: autoSyncEnabled, sync_interval_minutes: syncIntervalMinutes })
        .eq("id", accountId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-accounts"] });
      toast({ title: "Auto-sync updated", description: "Preferences saved." });
    },
  });

  const removeAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase.rpc("delete_email_account", { account_id: accountId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-accounts"] });
      toast({ title: t('admin.emailAccountRemoved'), description: t('admin.disconnectedSuccessfully') });
    },
  });

  const syncEmailsMutation = useMutation({
    mutationFn: async (accountId?: string) => {
      const { data, error } = await supabase.functions.invoke('gmail-sync', { body: { emailAccountId: accountId, syncSent: true } });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-accounts"] });
      toast({ title: "Sync Complete", description: `Gmail sync finished` });
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

  const copyForwardingAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedForwarding(address);
      setTimeout(() => setCopiedForwarding(null), 2000);
      toast({ title: "Copied!", description: "Forwarding address copied." });
    } catch (err) {
      toast({ title: "Failed to copy", description: "Please copy manually.", variant: "destructive" });
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

  return (
    <Card className="bg-gradient-surface border-border/50 shadow-surface">
      <CardHeader>
        <CardTitle className="text-primary">Connected Email Accounts</CardTitle>
        <CardDescription>Manage your connected email accounts and their auto-sync settings.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">Loading accounts...</div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium mb-2">No email accounts connected yet.</p>
            <p className="text-sm mb-6">Add your first email account to get started.</p>
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
                        account.is_active ? "bg-success-muted text-success" : "bg-destructive-muted text-destructive"
                      }`}>
                        {account.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {account.provider === 'gmail' ? (
                      <div className="space-y-2 border-t pt-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label className="text-sm font-medium">Auto-sync</Label>
                            <p className="text-xs text-muted-foreground">Automatically sync this account on a schedule.</p>
                          </div>
                          <Switch
                            checked={account.auto_sync_enabled}
                            onCheckedChange={(checked) => updateAccountSyncMutation.mutate({
                              accountId: account.id,
                              autoSyncEnabled: checked,
                              syncIntervalMinutes: account.sync_interval_minutes,
                            })}
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
                                updateAccountSyncMutation.mutate({
                                  accountId: account.id,
                                  autoSyncEnabled: true,
                                  syncIntervalMinutes: numericValue,
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
                        
                        {/* Warning when auto-sync enabled but no inbox assigned */}
                        {account.auto_sync_enabled && !account.inbox_id && (
                          <Alert variant="warning" className="mt-3">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Misconfiguration warning:</strong> Auto-sync is enabled but no inbox is assigned. 
                              Emails will be routed to the organization's <strong>default inbox</strong>. 
                              Assign a specific inbox below to control where synced emails appear.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 border-t pt-3">
                        <p className="text-sm text-muted-foreground">
                          This address uses forwarding (e.g., Google Group). Messages arrive in real time via the forwarding address; manual sync is not applicable.
                        </p>
                      </div>
                    )}

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
                                  <span>{t('admin.unassigned')}</span>
                                </div>
                              </SelectItem>
                              {inboxes.map((inbox) => (
                                <SelectItem key={inbox.id} value={inbox.id}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: inbox.color }} />
                                    <span>{inbox.name}</span>
                                    {inbox.is_default && <span className="text-xs text-muted-foreground">(Default)</span>}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" onClick={() => handleUpdateAccount(account.id, editingInbox)} disabled={updateAccountMutation.isPending || !editingInbox}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={cancelEditing}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Inbox:</span>
                            {account.inbox_id ? (
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: inboxes.find(i => i.id === account.inbox_id)?.color || '#3B82F6' }} />
                                <span className="font-medium">{inboxes.find(i => i.id === account.inbox_id)?.name || 'Unknown Inbox'}</span>
                              </div>
                            ) : (
                              <span className={account.auto_sync_enabled ? "text-destructive font-medium" : "text-warning"}>
                                {account.auto_sync_enabled ? "⚠️ Not assigned (using default inbox)" : t('admin.notAssigned')}
                              </span>
                            )}
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => startEditingAccount(account.id, account.inbox_id)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {account.forwarding_address && (
                      <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground">Forwarding Address:</Label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 p-2 bg-muted rounded text-sm">{account.forwarding_address}</code>
                          <Button variant="outline" size="sm" onClick={() => copyForwardingAddress(account.forwarding_address)}>
                            {copiedForwarding === account.forwarding_address ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {account.provider === 'google-group' ? 'In Google Admin → Groups, add this address as a member so messages are forwarded here.' : 'Forward your emails to this address to receive them in your inbox.'}
                        </p>
                      </div>
                    )}

                    <div className="text-sm text-muted-foreground">
                      {account.provider === 'gmail' ? `Last sync: ${formatLastSync(account.last_sync_at)}` : 'Sync: Real-time via forwarding'}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {account.provider === 'gmail' && (
                      <Button variant="outline" size="sm" onClick={() => syncEmailsMutation.mutate(account.id)} disabled={syncEmailsMutation.isPending}>
                        <RefreshCw className={`h-4 w-4 ${syncEmailsMutation.isPending ? 'animate-spin' : ''}`} />
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => removeAccountMutation.mutate(account.id)} disabled={removeAccountMutation.isPending}>
                       {t('admin.remove')}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
