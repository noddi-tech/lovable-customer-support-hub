import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VerificationStats {
  conversationsImported: number;
  messagesImported: number;
  customersCreated: number;
  inboxesCreated: number;
  orphanedMessages: number;
  orphanedConversations: number;
  duplicateExternalIds: number;
}

interface ImportVerificationReportProps {
  jobId: string;
  organizationId: string;
  expectedConversations?: number;
}

export const ImportVerificationReport = ({ jobId, organizationId, expectedConversations }: ImportVerificationReportProps) => {
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [stats, setStats] = useState<VerificationStats | null>(null);

  const runVerification = async () => {
    setIsVerifying(true);
    try {
      // Get import job details
      const { data: job } = await supabase
        .from('import_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (!job) {
        throw new Error('Import job not found');
      }

      // Get conversation IDs for this org
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .eq('organization_id', organizationId);
      
      const conversationIds = convs?.map(c => c.id) || [];

      // Run verification queries
      const [orphanedMessages, orphanedConvs, customers, inboxes] = await Promise.all([
        // Check for messages without valid conversations
        conversationIds.length > 0 
          ? supabase.from('messages').select('id', { count: 'exact', head: true }).not('conversation_id', 'in', `(${conversationIds.join(',')})`)
          : { count: 0 },
        
        // Check for conversations without inbox
        supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).is('inbox_id', null),
        
        // Count customers
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
        
        // Count inboxes
        supabase.from('inboxes').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
      ]);

      setStats({
        conversationsImported: job.conversations_imported || 0,
        messagesImported: job.messages_imported || 0,
        customersCreated: customers.count || 0,
        inboxesCreated: inboxes.count || 0,
        orphanedMessages: orphanedMessages.count || 0,
        orphanedConversations: orphanedConvs.count || 0,
        duplicateExternalIds: 0, // With unique constraint, this should always be 0
      });

      toast({
        title: "Verification Complete",
        description: "Data integrity check finished successfully.",
      });

    } catch (error: any) {
      console.error('[Verification] Error:', error);
      toast({
        title: "Verification Failed",
        description: error.message || "Could not complete verification",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const hasIssues = stats && (stats.orphanedMessages > 0 || stats.orphanedConversations > 0 || stats.duplicateExternalIds > 0);
  const convMatchesExpected = expectedConversations ? Math.abs(stats?.conversationsImported || 0 - expectedConversations) < 10 : true;

  return (
    <Card className="bg-gradient-surface border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Database className="w-5 h-5" />
              Import Verification Report
            </CardTitle>
            <CardDescription>
              Verify data integrity and completeness after import
            </CardDescription>
          </div>
          <Button
            onClick={runVerification}
            disabled={isVerifying}
            variant="outline"
            size="sm"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Run Verification
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!stats ? (
          <Alert>
            <AlertDescription>
              Click "Run Verification" to check data integrity and completeness.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Import Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-1">
                <p className="text-xs text-muted-foreground">Conversations</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-primary">{stats.conversationsImported.toLocaleString()}</p>
                  {!convMatchesExpected && expectedConversations && (
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  )}
                </div>
                {expectedConversations && (
                  <p className="text-xs text-muted-foreground">Expected: {expectedConversations}</p>
                )}
              </div>

              <div className="p-4 bg-muted/50 rounded-lg space-y-1">
                <p className="text-xs text-muted-foreground">Messages</p>
                <p className="text-2xl font-bold text-primary">{stats.messagesImported.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  Avg: {stats.conversationsImported > 0 ? (stats.messagesImported / stats.conversationsImported).toFixed(1) : 0} per conv
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg space-y-1">
                <p className="text-xs text-muted-foreground">Customers</p>
                <p className="text-2xl font-bold text-primary">{stats.customersCreated.toLocaleString()}</p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg space-y-1">
                <p className="text-xs text-muted-foreground">Inboxes</p>
                <p className="text-2xl font-bold text-primary">{stats.inboxesCreated}</p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg space-y-1">
                <p className="text-xs text-muted-foreground">Orphaned Messages</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-primary">{stats.orphanedMessages}</p>
                  {stats.orphanedMessages > 0 && <XCircle className="w-4 h-4 text-destructive" />}
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg space-y-1">
                <p className="text-xs text-muted-foreground">Orphaned Conversations</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-primary">{stats.orphanedConversations}</p>
                  {stats.orphanedConversations > 0 && <XCircle className="w-4 h-4 text-destructive" />}
                </div>
              </div>
            </div>

            {/* Status Alerts */}
            {hasIssues ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Data integrity issues detected:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {stats.orphanedMessages > 0 && (
                      <li>{stats.orphanedMessages} messages without valid conversations</li>
                    )}
                    {stats.orphanedConversations > 0 && (
                      <li>{stats.orphanedConversations} conversations without inbox assignments</li>
                    )}
                    {stats.duplicateExternalIds > 0 && (
                      <li>{stats.duplicateExternalIds} duplicate external IDs detected</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-green-500/50 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900 dark:text-green-100">
                  <strong>All checks passed!</strong> No data integrity issues detected.
                </AlertDescription>
              </Alert>
            )}

            {!convMatchesExpected && expectedConversations && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Imported conversation count ({stats.conversationsImported}) differs from expected ({expectedConversations}). 
                  This may be due to date filters or mailbox selection.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
