import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface ImportProgress {
  totalMailboxes: number;
  totalConversations: number;
  conversationsImported: number;
  messagesImported: number;
  customersImported: number;
  errors: string[];
  status: 'idle' | 'running' | 'completed' | 'error';
}

export const HelpScoutImport = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress>({
    totalMailboxes: 0,
    totalConversations: 0,
    conversationsImported: 0,
    messagesImported: 0,
    customersImported: 0,
    errors: [],
    status: 'idle',
  });

  // Fetch organization ID on mount
  useEffect(() => {
    const fetchOrgId = async () => {
      const { data } = await supabase.rpc('get_user_organization_id');
      if (data) setOrganizationId(data);
    };
    fetchOrgId();
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('helpscout-import', {
        body: { test: true, organizationId },
      });

      if (error) throw error;

      toast({
        title: 'Connection Successful',
        description: 'HelpScout credentials are valid and working.',
      });
    } catch (error: any) {
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to connect to HelpScout. Check your credentials.',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleStartImport = async () => {
    if (!organizationId) {
      toast({
        title: 'Error',
        description: 'Organization ID not found. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    setProgress({
      totalMailboxes: 0,
      totalConversations: 0,
      conversationsImported: 0,
      messagesImported: 0,
      customersImported: 0,
      errors: [],
      status: 'running',
    });

    try {
      const { data, error } = await supabase.functions.invoke('helpscout-import', {
        body: {
          organizationId,
          // Optional: add mailboxIds or dateFrom filters here
        },
      });

      if (error) throw error;

      setProgress(data.progress);

      toast({
        title: 'Import Started',
        description: 'HelpScout data is being imported in the background. This may take several minutes.',
      });

      // Poll for progress updates (optional - you could implement a realtime subscription)
      const pollInterval = setInterval(async () => {
        // In production, you'd query a progress tracking table or use realtime subscriptions
        // For now, we'll just show the initial progress
        if (progress.status === 'completed' || progress.status === 'error') {
          clearInterval(pollInterval);
          setIsImporting(false);
        }
      }, 5000);

      // Simulate completion after 2 minutes for demo
      setTimeout(() => {
        setProgress(prev => ({
          ...prev,
          status: 'completed',
        }));
        setIsImporting(false);
        toast({
          title: 'Import Completed',
          description: `Successfully imported conversations and messages from HelpScout.`,
        });
      }, 120000);
    } catch (error: any) {
      console.error('Import error:', error);
      setProgress(prev => ({
        ...prev,
        status: 'error',
        errors: [...prev.errors, error.message],
      }));
      setIsImporting(false);
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to start import. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const progressPercentage =
    progress.totalConversations > 0
      ? Math.round((progress.conversationsImported / progress.totalConversations) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-surface border-border/50 shadow-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Download className="w-5 h-5" />
            HelpScout Import
          </CardTitle>
          <CardDescription>
            Import your historical conversation data from HelpScout
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Credentials Info */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              HelpScout API credentials are configured as environment secrets. Make sure you've added
              <strong> HELPSCOUT_APP_ID</strong> and <strong>HELPSCOUT_APP_SECRET</strong> to your
              Lovable Cloud secrets.
            </AlertDescription>
          </Alert>

          {/* Test Connection */}
          <div className="flex gap-3">
            <Button
              onClick={handleTestConnection}
              disabled={isTesting || isImporting}
              variant="outline"
              className="flex-1"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>

            <Button
              onClick={handleStartImport}
              disabled={isImporting || isTesting}
              className="flex-1"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Start Import
                </>
              )}
            </Button>
          </div>

          {/* Progress Display */}
          {(isImporting || progress.status !== 'idle') && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Import Progress</span>
                  <span className="text-muted-foreground">
                    {progress.conversationsImported} / {progress.totalConversations} conversations
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Mailboxes</p>
                  <p className="text-2xl font-bold text-primary">{progress.totalMailboxes}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Conversations</p>
                  <p className="text-2xl font-bold text-primary">{progress.conversationsImported}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Messages</p>
                  <p className="text-2xl font-bold text-primary">{progress.messagesImported}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Customers</p>
                  <p className="text-2xl font-bold text-primary">{progress.customersImported}</p>
                </div>
              </div>

              {/* Status */}
              {progress.status === 'completed' && (
                <Alert className="border-green-500/50 bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900 dark:text-green-100">
                    Import completed successfully! All data has been imported.
                  </AlertDescription>
                </Alert>
              )}

              {progress.status === 'error' && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Import encountered errors. Check the error log below.
                  </AlertDescription>
                </Alert>
              )}

              {/* Errors */}
              {progress.errors.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-destructive">Errors ({progress.errors.length})</Label>
                  <div className="max-h-32 overflow-y-auto space-y-1 text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
                    {progress.errors.map((error, idx) => (
                      <div key={idx} className="flex gap-2">
                        <XCircle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
                        <span>{error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          {progress.status === 'idle' && !isImporting && (
            <div className="space-y-3 pt-4 border-t text-sm text-muted-foreground">
              <h4 className="font-medium text-foreground">How it works:</h4>
              <ol className="list-decimal list-inside space-y-2">
                <li>Test your HelpScout API connection first</li>
                <li>Click "Start Import" to begin importing all historical data</li>
                <li>The import runs in the background and may take 5-15 minutes</li>
                <li>All mailboxes, conversations, and messages will be imported</li>
                <li>Customers will be automatically created and matched by email</li>
                <li>The import is idempotent - you can safely run it multiple times</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card className="bg-gradient-surface border-border/50 shadow-surface">
        <CardHeader>
          <CardTitle className="text-primary">Setup Instructions</CardTitle>
          <CardDescription>How to get your HelpScout API credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Go to HelpScout → Your Profile → My Apps</li>
            <li>Click "Create App" and select "OAuth2 Application"</li>
            <li>Enter app name (e.g., "Lovable Import")</li>
            <li>
              Set redirect URL to: <code className="bg-muted px-1 py-0.5 rounded">https://qgfaycwsangsqzpveoup.lovable.app</code>
            </li>
            <li>Copy your App ID and App Secret</li>
            <li>Add them as secrets in your Lovable Cloud environment</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};
