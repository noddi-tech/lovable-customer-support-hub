import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DataWipeConfirmationProps {
  organizationId: string;
  organizationName: string;
}

export const DataWipeConfirmation = ({ organizationId, organizationName }: DataWipeConfirmationProps) => {
  const [confirmText, setConfirmText] = useState("");
  const [isWiping, setIsWiping] = useState(false);
  const [wipeOptions, setWipeOptions] = useState({
    wipeMessages: true,
    wipeConversations: true,
    wipeImportJobs: true,
    wipeCustomers: false,
    wipeInboxes: false,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const expectedText = `WIPE ${organizationName.toUpperCase()} DATA`;

  // Fetch current data counts
  const { data: dataCounts, isLoading } = useQuery({
    queryKey: ['org-data-counts', organizationId],
    queryFn: async () => {
      // First get conversation IDs for this org
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .eq('organization_id', organizationId);
      
      const conversationIds = convs?.map(c => c.id) || [];

      const [conversations, messages, customers, importJobs, inboxes] = await Promise.all([
        supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
        conversationIds.length > 0 
          ? supabase.from('messages').select('id', { count: 'exact', head: true }).in('conversation_id', conversationIds)
          : { count: 0 },
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
        supabase.from('import_jobs').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
        supabase.from('inboxes').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
      ]);

      return {
        conversations: conversations.count || 0,
        messages: messages.count || 0,
        customers: customers.count || 0,
        importJobs: importJobs.count || 0,
        inboxes: inboxes.count || 0,
      };
    },
  });

  const handleWipe = async () => {
    if (confirmText !== expectedText) {
      toast({
        title: "Confirmation Required",
        description: `Please type "${expectedText}" to confirm`,
        variant: "destructive",
      });
      return;
    }

    setIsWiping(true);
    try {
      const { data, error } = await supabase.functions.invoke('wipe-organization-data', {
        body: {
          organizationId,
          ...wipeOptions,
        },
      });

      if (error) throw error;

      toast({
        title: "Data Wiped Successfully",
        description: `Deleted: ${data.progress.conversationsDeleted} conversations, ${data.progress.messagesDeleted} messages${
          data.progress.errors.length > 0 ? `. ${data.progress.errors.length} errors occurred.` : ''
        }`,
      });

      // Reset form
      setConfirmText("");
      
      // Properly invalidate React Query cache to refresh data counts
      await queryClient.refetchQueries({ queryKey: ['org-data-counts', organizationId] });

    } catch (error: any) {
      console.error('[DataWipe] Error:', error);
      toast({
        title: "Wipe Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsWiping(false);
    }
  };

  const isConfirmValid = confirmText === expectedText;

  return (
    <Card className="border-destructive">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <CardTitle>Wipe Organization Data</CardTitle>
        </div>
        <CardDescription>
          Permanently delete data from {organizationName} before importing fresh data from HelpScout
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This action is irreversible. All selected data will be permanently deleted from the database.
          </AlertDescription>
        </Alert>

        {/* Current Data Counts */}
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading data counts...</div>
        ) : (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Current Data</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between p-2 bg-muted rounded">
                <span>Conversations:</span>
                <span className="font-mono">{dataCounts?.conversations.toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span>Messages:</span>
                <span className="font-mono">{dataCounts?.messages.toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span>Customers:</span>
                <span className="font-mono">{dataCounts?.customers.toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span>Import Jobs:</span>
                <span className="font-mono">{dataCounts?.importJobs.toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span>Inboxes:</span>
                <span className="font-mono">{dataCounts?.inboxes.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Wipe Options */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">What to Delete</h4>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="wipe-messages" 
              checked={wipeOptions.wipeMessages}
              onCheckedChange={(checked) => setWipeOptions(prev => ({ ...prev, wipeMessages: checked as boolean }))}
            />
            <Label htmlFor="wipe-messages" className="text-sm font-normal cursor-pointer">
              Delete all messages ({dataCounts?.messages.toLocaleString()})
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="wipe-conversations" 
              checked={wipeOptions.wipeConversations}
              onCheckedChange={(checked) => setWipeOptions(prev => ({ ...prev, wipeConversations: checked as boolean }))}
            />
            <Label htmlFor="wipe-conversations" className="text-sm font-normal cursor-pointer">
              Delete all conversations ({dataCounts?.conversations.toLocaleString()})
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="wipe-import-jobs" 
              checked={wipeOptions.wipeImportJobs}
              onCheckedChange={(checked) => setWipeOptions(prev => ({ ...prev, wipeImportJobs: checked as boolean }))}
            />
            <Label htmlFor="wipe-import-jobs" className="text-sm font-normal cursor-pointer">
              Delete all import job history ({dataCounts?.importJobs.toLocaleString()})
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="wipe-customers" 
              checked={wipeOptions.wipeCustomers}
              onCheckedChange={(checked) => setWipeOptions(prev => ({ ...prev, wipeCustomers: checked as boolean }))}
            />
            <Label htmlFor="wipe-customers" className="text-sm font-normal cursor-pointer">
              Delete all customers ({dataCounts?.customers.toLocaleString()}) - ⚠️ Optional
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="wipe-inboxes" 
              checked={wipeOptions.wipeInboxes}
              onCheckedChange={(checked) => setWipeOptions(prev => ({ ...prev, wipeInboxes: checked as boolean }))}
            />
            <Label htmlFor="wipe-inboxes" className="text-sm font-normal cursor-pointer">
              Delete all inboxes except default ({dataCounts?.inboxes ? dataCounts.inboxes - 1 : 0}) - ⚠️ Optional
            </Label>
          </div>
        </div>

        {/* Confirmation Input */}
        <div className="space-y-2">
          <Label htmlFor="confirm-text">
            Type <code className="px-2 py-1 bg-muted rounded text-xs">{expectedText}</code> to confirm
          </Label>
          <Input
            id="confirm-text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={expectedText}
            className="font-mono"
          />
        </div>

        {/* Wipe Button */}
        <Button
          onClick={handleWipe}
          disabled={!isConfirmValid || isWiping || isLoading}
          variant="destructive"
          className="w-full"
          size="lg"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {isWiping ? "Wiping Data..." : "Wipe Data Permanently"}
        </Button>
      </CardContent>
    </Card>
  );
};
